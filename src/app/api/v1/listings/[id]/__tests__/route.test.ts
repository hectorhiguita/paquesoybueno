import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET, PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const OTHER_USER_ID = "550e8400-e29b-41d4-a716-446655440099";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VEREDA_ID = "550e8400-e29b-41d4-a716-446655440004";
const LISTING_ID = "550e8400-e29b-41d4-a716-446655440010";

const MOCK_LISTING_DETAIL = {
  id: LISTING_ID,
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
  author: {
    id: USER_ID,
    name: "Juan Pérez",
    phone: "3001234567",
    isVerifiedProvider: true,
    verifiedAt: new Date("2023-06-01T00:00:00Z"),
  },
  category: { id: CATEGORY_ID, name: "Hogar", icon: "🏠" },
  vereda: { id: VEREDA_ID, name: "El Placer" },
  images: [],
  _count: { ratings: 3 },
  ratings: [{ stars: 4 }, { stars: 5 }, { stars: 3 }],
};

const MOCK_LISTING_OWNERSHIP = { authorId: USER_ID, status: "active" };

function makeRequest(
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(`http://localhost/api/v1/listings/${LISTING_ID}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": USER_ID,
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const ROUTE_CONTEXT = { params: Promise.resolve({ id: LISTING_ID }) };

// ---------------------------------------------------------------------------
// GET /api/v1/listings/:id
// ---------------------------------------------------------------------------

describe("GET /api/v1/listings/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(MOCK_LISTING_DETAIL as never);
  });

  it("returns 200 with listing detail", async () => {
    const res = await GET(makeRequest("GET"), ROUTE_CONTEXT);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.listing.id).toBe(LISTING_ID);
  });

  it("returns all required fields (Req 2.7)", async () => {
    const res = await GET(makeRequest("GET"), ROUTE_CONTEXT);
    const json = await res.json();
    const listing = json.data.listing;

    expect(listing.author).toBeDefined();
    expect(listing.author.name).toBe("Juan Pérez");
    expect(listing.category).toBeDefined();
    expect(listing.vereda).toBeDefined();
    expect(listing.completedJobs).toBe(5);
    expect(listing.description).toBeDefined();
    // Contact option: phone is included
    expect(listing.author.phone).toBeDefined();
  });

  it("calculates average rating correctly", async () => {
    const res = await GET(makeRequest("GET"), ROUTE_CONTEXT);
    const json = await res.json();
    // (4 + 5 + 3) / 3 = 4.0
    expect(json.data.listing.avgRating).toBe(4);
  });

  it("returns null avgRating when no ratings exist", async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce({
      ...MOCK_LISTING_DETAIL,
      ratings: [],
      _count: { ratings: 0 },
    } as never);
    const res = await GET(makeRequest("GET"), ROUTE_CONTEXT);
    const json = await res.json();
    expect(json.data.listing.avgRating).toBeNull();
  });

  it("returns 404 when listing does not exist", async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce(null as never);
    const res = await GET(makeRequest("GET"), ROUTE_CONTEXT);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.listing.findUnique).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeRequest("GET"), ROUTE_CONTEXT);
    expect(res.status).toBe(500);
  });

  it("does not expose exact coordinates (Req 6.1)", async () => {
    const res = await GET(makeRequest("GET"), ROUTE_CONTEXT);
    const json = await res.json();
    const listing = json.data.listing;
    // vereda should only have id and name, no lat/lng
    expect(listing.vereda.latApprox).toBeUndefined();
    expect(listing.vereda.lngApprox).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/listings/:id
// ---------------------------------------------------------------------------

describe("PATCH /api/v1/listings/:id", () => {
  const UPDATED_LISTING = {
    ...MOCK_LISTING_DETAIL,
    title: "Servicio de plomería actualizado",
    author: { id: USER_ID, name: "Juan Pérez", isVerifiedProvider: true },
    category: { id: CATEGORY_ID, name: "Hogar" },
    vereda: { id: VEREDA_ID, name: "El Placer" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(MOCK_LISTING_OWNERSHIP as never);
    vi.mocked(prisma.listing.update).mockResolvedValue(UPDATED_LISTING as never);
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { title: "Nuevo título válido" }, { "X-User-ID": "" }),
      ROUTE_CONTEXT
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when listing does not exist", async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce(null as never);
    const res = await PATCH(makeRequest("PATCH", { title: "Nuevo título válido" }), ROUTE_CONTEXT);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the author", async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce({
      authorId: OTHER_USER_ID,
      status: "active",
    } as never);
    const res = await PATCH(makeRequest("PATCH", { title: "Nuevo título válido" }), ROUTE_CONTEXT);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("returns 200 with updated listing on valid input", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { title: "Servicio de plomería actualizado" }),
      ROUTE_CONTEXT
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.listing).toBeDefined();
  });

  it("returns 400 for invalid status value", async () => {
    const res = await PATCH(
      makeRequest("PATCH", { status: "invalid_status" }),
      ROUTE_CONTEXT
    );
    expect(res.status).toBe(400);
  });

  it("accepts valid status update", async () => {
    const res = await PATCH(makeRequest("PATCH", { status: "inactive" }), ROUTE_CONTEXT);
    expect(res.status).toBe(200);
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest(`http://localhost/api/v1/listings/${LISTING_ID}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_ID,
      },
      body: "not json",
    });
    const res = await PATCH(req, ROUTE_CONTEXT);
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error during update", async () => {
    vi.mocked(prisma.listing.update).mockRejectedValueOnce(new Error("DB error"));
    const res = await PATCH(makeRequest("PATCH", { title: "Título válido actualizado" }), ROUTE_CONTEXT);
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/listings/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/v1/listings/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(MOCK_LISTING_OWNERSHIP as never);
    vi.mocked(prisma.listing.update).mockResolvedValue({ ...MOCK_LISTING_DETAIL, status: "inactive" } as never);
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const res = await DELETE(
      makeRequest("DELETE", undefined, { "X-User-ID": "" }),
      ROUTE_CONTEXT
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when listing does not exist", async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce(null as never);
    const res = await DELETE(makeRequest("DELETE"), ROUTE_CONTEXT);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the author", async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce({
      authorId: OTHER_USER_ID,
      status: "active",
    } as never);
    const res = await DELETE(makeRequest("DELETE"), ROUTE_CONTEXT);
    expect(res.status).toBe(403);
  });

  it("returns 200 on successful soft delete", async () => {
    const res = await DELETE(makeRequest("DELETE"), ROUTE_CONTEXT);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toBeDefined();
  });

  it("sets status to inactive (soft delete)", async () => {
    await DELETE(makeRequest("DELETE"), ROUTE_CONTEXT);
    expect(vi.mocked(prisma.listing.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "inactive" },
      })
    );
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.listing.update).mockRejectedValueOnce(new Error("DB error"));
    const res = await DELETE(makeRequest("DELETE"), ROUTE_CONTEXT);
    expect(res.status).toBe(500);
  });
});
