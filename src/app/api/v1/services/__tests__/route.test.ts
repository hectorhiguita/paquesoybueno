import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VEREDA_ID = "550e8400-e29b-41d4-a716-446655440004";

const MOCK_SERVICE = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  communityId: COMMUNITY_ID,
  authorId: USER_ID,
  categoryId: CATEGORY_ID,
  veredaId: VEREDA_ID,
  title: "Servicio de plomería",
  description: "Reparación de tuberías y grifos en general",
  type: "service",
  status: "active",
  priceCop: null,
  tradeDescription: null,
  isFeatured: false,
  completedJobs: 5,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  author: { id: USER_ID, name: "Juan Pérez", isVerifiedProvider: false, phone: "3001234567" },
  category: { id: CATEGORY_ID, name: "Hogar", icon: "🏠" },
  vereda: { id: VEREDA_ID, name: "El Placer" },
  _count: { ratings: 2 },
  ratings: [{ stars: 4 }, { stars: 5 }],
};

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/v1/services");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    headers: { "X-Community-ID": COMMUNITY_ID },
  });
}

// ---------------------------------------------------------------------------
// GET /api/v1/services
// ---------------------------------------------------------------------------

describe("GET /api/v1/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findMany).mockResolvedValue([MOCK_SERVICE] as never);
    vi.mocked(prisma.listing.count).mockResolvedValue(1 as never);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/services");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with service listings", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.listings).toHaveLength(1);
    expect(json.data.listings[0].type).toBe("service");
  });

  it("always filters by type=service regardless of query params", async () => {
    await GET(makeGetRequest({ type: "sale" }));
    expect(vi.mocked(prisma.listing.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "service" }),
      })
    );
  });

  it("defaults to active status filter", async () => {
    await GET(makeGetRequest());
    expect(vi.mocked(prisma.listing.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "active" }),
      })
    );
  });

  it("passes categoryId filter to prisma", async () => {
    await GET(makeGetRequest({ categoryId: CATEGORY_ID }));
    expect(vi.mocked(prisma.listing.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: CATEGORY_ID }),
      })
    );
  });

  it("passes veredaId filter to prisma", async () => {
    await GET(makeGetRequest({ veredaId: VEREDA_ID }));
    expect(vi.mocked(prisma.listing.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ veredaId: VEREDA_ID }),
      })
    );
  });

  it("returns pagination metadata", async () => {
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it("uses verified-provider-first ordering (Req 2.6)", async () => {
    await GET(makeGetRequest());
    expect(vi.mocked(prisma.listing.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { author: { isVerifiedProvider: "desc" } },
          { createdAt: "desc" },
        ],
      })
    );
  });

  it("exposes avgRating computed from ratings", async () => {
    const res = await GET(makeGetRequest());
    const json = await res.json();
    // MOCK_SERVICE has ratings [4, 5] → avg 4.5
    expect(json.data.listings[0].avgRating).toBe(4.5);
  });

  it("sets avgRating to null when listing has no ratings", async () => {
    const noRatings = { ...MOCK_SERVICE, ratings: [], _count: { ratings: 0 } };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([noRatings] as never);
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.listings[0].avgRating).toBeNull();
  });

  // --- minRating filter (Req 2.4) ---

  it("filters out services below minRating", async () => {
    const lowRating = { ...MOCK_SERVICE, id: "id-low", ratings: [{ stars: 2 }] };
    const highRating = { ...MOCK_SERVICE, id: "id-high", ratings: [{ stars: 5 }] };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce(
      [lowRating, highRating] as never
    );
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(2 as never);

    const res = await GET(makeGetRequest({ minRating: "4" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.listings).toHaveLength(1);
    expect(json.data.listings[0].avgRating).toBe(5);
  });

  it("includes services with avgRating exactly equal to minRating", async () => {
    const exactRating = { ...MOCK_SERVICE, ratings: [{ stars: 3 }] };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([exactRating] as never);
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(1 as never);

    const res = await GET(makeGetRequest({ minRating: "3" }));
    const json = await res.json();
    expect(json.data.listings).toHaveLength(1);
    expect(json.data.listings[0].avgRating).toBe(3);
  });

  it("excludes services with no ratings when minRating is set", async () => {
    const noRatings = { ...MOCK_SERVICE, ratings: [] };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([noRatings] as never);
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(1 as never);

    const res = await GET(makeGetRequest({ minRating: "1" }));
    const json = await res.json();
    expect(json.data.listings).toHaveLength(0);
  });

  it("returns 400 for minRating below 1", async () => {
    const res = await GET(makeGetRequest({ minRating: "0" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for minRating above 5", async () => {
    const res = await GET(makeGetRequest({ minRating: "6" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.listing.findMany).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns empty list when no services match", async () => {
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(0 as never);
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.listings).toEqual([]);
    expect(json.data.pagination.total).toBe(0);
  });
});
