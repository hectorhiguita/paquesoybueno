import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    vereda: {
      findFirst: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VEREDA_ID = "550e8400-e29b-41d4-a716-446655440004";

const MOCK_LISTING = {
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
  _count: { ratings: 3 },
  ratings: [],
};

const MOCK_USER = { activeReportCount: 0 };
const MOCK_VEREDA = { id: VEREDA_ID, communityId: COMMUNITY_ID, name: "El Placer" };
const MOCK_CATEGORY = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: "Hogar", active: true };

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/v1/listings");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    headers: { "X-Community-ID": COMMUNITY_ID },
  });
}

function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/v1/listings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": USER_ID,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const VALID_LISTING_BODY = {
  title: "Servicio de plomería",
  description: "Reparación de tuberías y grifos en general",
  type: "service",
  categoryId: CATEGORY_ID,
  veredaId: VEREDA_ID,
};

// ---------------------------------------------------------------------------
// GET /api/v1/listings
// ---------------------------------------------------------------------------

describe("GET /api/v1/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findMany).mockResolvedValue([MOCK_LISTING] as never);
    vi.mocked(prisma.listing.count).mockResolvedValue(1 as never);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/listings");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with listings list", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.listings).toHaveLength(1);
    expect(json.data.listings[0].title).toBe("Servicio de plomería");
  });

  it("returns pagination metadata", async () => {
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
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

  it("passes type filter to prisma", async () => {
    await GET(makeGetRequest({ type: "service" }));
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

  it("returns 400 for invalid type filter", async () => {
    const res = await GET(makeGetRequest({ type: "invalid_type" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.listing.findMany).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns empty list when no listings match", async () => {
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(0 as never);
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.listings).toEqual([]);
    expect(json.data.pagination.total).toBe(0);
  });

  // --- minRating filter (Req 2.4) ---

  it("filters out listings below minRating", async () => {
    const lowRatingListing = {
      ...MOCK_LISTING,
      id: "550e8400-e29b-41d4-a716-446655440020",
      ratings: [{ stars: 2 }],
    };
    const highRatingListing = {
      ...MOCK_LISTING,
      id: "550e8400-e29b-41d4-a716-446655440021",
      ratings: [{ stars: 5 }, { stars: 4 }],
    };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce(
      [lowRatingListing, highRatingListing] as never
    );
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(2 as never);

    const res = await GET(makeGetRequest({ minRating: "4" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Only the high-rating listing (avg 4.5) should pass the filter
    expect(json.data.listings).toHaveLength(1);
    expect(json.data.listings[0].avgRating).toBe(4.5);
  });

  it("includes listings with avgRating exactly equal to minRating", async () => {
    const exactListing = {
      ...MOCK_LISTING,
      ratings: [{ stars: 3 }, { stars: 3 }],
    };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([exactListing] as never);
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(1 as never);

    const res = await GET(makeGetRequest({ minRating: "3" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.listings).toHaveLength(1);
    expect(json.data.listings[0].avgRating).toBe(3);
  });

  it("excludes listings with no ratings when minRating is set", async () => {
    const noRatingListing = { ...MOCK_LISTING, ratings: [] };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([noRatingListing] as never);
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(1 as never);

    const res = await GET(makeGetRequest({ minRating: "1" }));
    expect(res.status).toBe(200);
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

  it("exposes avgRating on each listing even without minRating filter", async () => {
    const listingWithRatings = { ...MOCK_LISTING, ratings: [{ stars: 4 }, { stars: 5 }] };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([listingWithRatings] as never);
    vi.mocked(prisma.listing.count).mockResolvedValueOnce(1 as never);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.listings[0].avgRating).toBe(4.5);
  });

  it("uses verified-provider-first ordering", async () => {
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
});

// ---------------------------------------------------------------------------
// POST /api/v1/listings
// ---------------------------------------------------------------------------

describe("POST /api/v1/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never);
    vi.mocked(prisma.listing.create).mockResolvedValue(MOCK_LISTING as never);
    vi.mocked(prisma.vereda.findFirst).mockResolvedValue(MOCK_VEREDA as never);
    vi.mocked(prisma.category.findFirst).mockResolvedValue(MOCK_CATEGORY as never);
  });

  // --- Auth ---

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Community-ID": COMMUNITY_ID },
      body: JSON.stringify(VALID_LISTING_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-ID": USER_ID },
      body: JSON.stringify(VALID_LISTING_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Validation (Req 3.1) ---

  it("returns 400 when title is missing", async () => {
    const { title: _t, ...body } = VALID_LISTING_BODY;
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when description is missing", async () => {
    const { description: _d, ...body } = VALID_LISTING_BODY;
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when type is missing", async () => {
    const { type: _t, ...body } = VALID_LISTING_BODY;
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when veredaId is missing", async () => {
    const { veredaId: _v, ...body } = VALID_LISTING_BODY;
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when title is too short (< 3 chars)", async () => {
    const res = await POST(makePostRequest({ ...VALID_LISTING_BODY, title: "ab" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is too short (< 10 chars)", async () => {
    const res = await POST(makePostRequest({ ...VALID_LISTING_BODY, description: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid listing type", async () => {
    const res = await POST(makePostRequest({ ...VALID_LISTING_BODY, type: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid veredaId (not uuid)", async () => {
    const res = await POST(makePostRequest({ ...VALID_LISTING_BODY, veredaId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  // --- Report blocking (Req 3.7) ---

  it("returns 403 when user has 3 or more active reports", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ activeReportCount: 3 } as never);
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toContain("revisión");
  });

  it("returns 403 when user has more than 3 active reports", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ activeReportCount: 5 } as never);
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(403);
  });

  it("allows creation when user has exactly 2 active reports", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ activeReportCount: 2 } as never);
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(201);
  });

  it("returns 404 when user is not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(404);
  });

  // --- Successful creation ---

  it("returns 201 with created listing on valid input", async () => {
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.listing).toBeDefined();
  });

  it("creates listing with active status when no contact info", async () => {
    await POST(makePostRequest(VALID_LISTING_BODY));
    expect(vi.mocked(prisma.listing.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "active" }),
      })
    );
  });

  // --- Auto-flag for URLs/phones (Req 9.4) ---

  it("sets status to flagged when title contains a URL", async () => {
    const body = { ...VALID_LISTING_BODY, title: "Visita www.ejemplo.com para más info" };
    await POST(makePostRequest(body));
    expect(vi.mocked(prisma.listing.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "flagged" }),
      })
    );
  });

  it("sets status to flagged when description contains https URL", async () => {
    const body = {
      ...VALID_LISTING_BODY,
      description: "Más información en https://ejemplo.com/servicios disponibles aquí",
    };
    await POST(makePostRequest(body));
    expect(vi.mocked(prisma.listing.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "flagged" }),
      })
    );
  });

  it("sets status to flagged when description contains a phone number", async () => {
    const body = {
      ...VALID_LISTING_BODY,
      description: "Llámame al 3001234567 para más información sobre el servicio",
    };
    await POST(makePostRequest(body));
    expect(vi.mocked(prisma.listing.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "flagged" }),
      })
    );
  });

  it("includes warning in response when listing is flagged", async () => {
    const flaggedListing = { ...MOCK_LISTING, status: "flagged" };
    vi.mocked(prisma.listing.create).mockResolvedValueOnce(flaggedListing as never);
    const body = { ...VALID_LISTING_BODY, title: "Visita www.ejemplo.com" };
    const res = await POST(makePostRequest(body));
    const json = await res.json();
    expect(json.warning).toBeDefined();
  });

  // --- Optional fields (Req 3.2, 3.3) ---

  it("accepts priceCop for sale type listing", async () => {
    const body = { ...VALID_LISTING_BODY, type: "sale", priceCop: 50000 };
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(201);
  });

  it("accepts tradeDescription for trade type listing", async () => {
    const body = {
      ...VALID_LISTING_BODY,
      type: "trade",
      tradeDescription: "Busco cambio por herramientas de jardín",
    };
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(201);
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_ID,
      },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.listing.create).mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  // --- Vereda community validation (Req 6.2) ---

  it("returns 400 when veredaId does not belong to the community", async () => {
    vi.mocked(prisma.vereda.findFirst).mockResolvedValueOnce(null as never);
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("veredaId");
    expect(json.error.message).toContain("comunidad");
  });

  it("returns 400 when categoryId does not belong to the community", async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce(null as never);
    const res = await POST(makePostRequest(VALID_LISTING_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("categoryId");
  });

  it("error response always includes requestId", async () => {
    const { title: _t, ...body } = VALID_LISTING_BODY;
    const res = await POST(makePostRequest(body));
    const json = await res.json();
    expect(json.error.requestId).toBeTruthy();
  });
});
