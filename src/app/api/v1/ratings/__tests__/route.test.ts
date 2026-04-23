import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rating: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const RATER_ID = "550e8400-e29b-41d4-a716-446655440002";
const PROVIDER_ID = "550e8400-e29b-41d4-a716-446655440003";
const LISTING_ID = "550e8400-e29b-41d4-a716-446655440004";

const MOCK_RATING = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  stars: 4,
  comment: "Excelente servicio",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  rater: { id: RATER_ID, name: "Ana García" },
  provider: { id: PROVIDER_ID, name: "Juan Pérez" },
  listing: { id: LISTING_ID, title: "Servicio de plomería" },
};

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/v1/ratings");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    headers: { "X-Community-ID": COMMUNITY_ID },
  });
}

function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/v1/ratings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": RATER_ID,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const VALID_RATING_BODY = {
  providerId: PROVIDER_ID,
  stars: 4,
  comment: "Muy buen trabajo",
};

// ---------------------------------------------------------------------------
// GET /api/v1/ratings
// ---------------------------------------------------------------------------

describe("GET /api/v1/ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rating.findMany).mockResolvedValue([MOCK_RATING] as never);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/ratings?providerId=" + PROVIDER_ID);
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when providerId query param is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("providerId");
  });

  it("returns 400 when providerId is not a valid UUID", async () => {
    const res = await GET(makeGetRequest({ providerId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with ratings list and avgRating", async () => {
    const res = await GET(makeGetRequest({ providerId: PROVIDER_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ratings).toHaveLength(1);
    expect(json.data.avgRating).toBe(4);
    expect(json.data.total).toBe(1);
  });

  it("returns avgRating null when no ratings exist", async () => {
    vi.mocked(prisma.rating.findMany).mockResolvedValueOnce([] as never);
    const res = await GET(makeGetRequest({ providerId: PROVIDER_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.avgRating).toBeNull();
    expect(json.data.total).toBe(0);
  });

  it("calculates avgRating as arithmetic mean rounded to one decimal (Req 4.2)", async () => {
    const ratings = [
      { ...MOCK_RATING, id: "1", stars: 4 },
      { ...MOCK_RATING, id: "2", stars: 5 },
      { ...MOCK_RATING, id: "3", stars: 3 },
    ];
    vi.mocked(prisma.rating.findMany).mockResolvedValueOnce(ratings as never);
    const res = await GET(makeGetRequest({ providerId: PROVIDER_ID }));
    const json = await res.json();
    // (4+5+3)/3 = 4.0
    expect(json.data.avgRating).toBe(4);
  });

  it("rounds avgRating to one decimal place", async () => {
    const ratings = [
      { ...MOCK_RATING, id: "1", stars: 4 },
      { ...MOCK_RATING, id: "2", stars: 5 },
    ];
    vi.mocked(prisma.rating.findMany).mockResolvedValueOnce(ratings as never);
    const res = await GET(makeGetRequest({ providerId: PROVIDER_ID }));
    const json = await res.json();
    // (4+5)/2 = 4.5
    expect(json.data.avgRating).toBe(4.5);
  });

  it("rounds avgRating correctly for repeating decimals", async () => {
    const ratings = [
      { ...MOCK_RATING, id: "1", stars: 1 },
      { ...MOCK_RATING, id: "2", stars: 2 },
      { ...MOCK_RATING, id: "3", stars: 3 },
    ];
    vi.mocked(prisma.rating.findMany).mockResolvedValueOnce(ratings as never);
    const res = await GET(makeGetRequest({ providerId: PROVIDER_ID }));
    const json = await res.json();
    // (1+2+3)/3 = 2.0
    expect(json.data.avgRating).toBe(2);
  });

  it("queries ratings filtered by communityId and providerId", async () => {
    await GET(makeGetRequest({ providerId: PROVIDER_ID }));
    expect(vi.mocked(prisma.rating.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { communityId: COMMUNITY_ID, providerId: PROVIDER_ID },
      })
    );
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.rating.findMany).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeGetRequest({ providerId: PROVIDER_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/ratings
// ---------------------------------------------------------------------------

describe("POST /api/v1/ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rating.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.rating.create).mockResolvedValue(MOCK_RATING as never);
  });

  // --- Auth ---

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Community-ID": COMMUNITY_ID },
      body: JSON.stringify(VALID_RATING_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-ID": RATER_ID },
      body: JSON.stringify(VALID_RATING_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Validation (Req 4.1) ---

  it("returns 400 when providerId is missing", async () => {
    const { providerId: _p, ...body } = VALID_RATING_BODY;
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when stars is missing", async () => {
    const { stars: _s, ...body } = VALID_RATING_BODY;
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when stars is below 1 (Req 4.1)", async () => {
    const res = await POST(makePostRequest({ ...VALID_RATING_BODY, stars: 0 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when stars is above 5 (Req 4.1)", async () => {
    const res = await POST(makePostRequest({ ...VALID_RATING_BODY, stars: 6 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when comment exceeds 500 characters (Req 4.7)", async () => {
    const longComment = "a".repeat(501);
    const res = await POST(makePostRequest({ ...VALID_RATING_BODY, comment: longComment }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts comment of exactly 500 characters (Req 4.7)", async () => {
    const exactComment = "a".repeat(500);
    const res = await POST(makePostRequest({ ...VALID_RATING_BODY, comment: exactComment }));
    expect(res.status).toBe(201);
  });

  it("accepts rating without comment (comment is optional, Req 4.1)", async () => {
    const { comment: _c, ...body } = VALID_RATING_BODY;
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(201);
  });

  it("accepts rating with optional listingId", async () => {
    const res = await POST(makePostRequest({ ...VALID_RATING_BODY, listingId: LISTING_ID }));
    expect(res.status).toBe(201);
  });

  it("returns 400 for invalid providerId (not UUID)", async () => {
    const res = await POST(makePostRequest({ ...VALID_RATING_BODY, providerId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/ratings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": RATER_ID,
      },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Self-rating prevention ---

  it("returns 400 when rater tries to rate themselves", async () => {
    const res = await POST(
      makePostRequest({ ...VALID_RATING_BODY, providerId: RATER_ID })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  // --- Deduplication (Req 4.6) ---

  it("returns 409 when same rater rates same provider within 30 days (Req 4.6)", async () => {
    vi.mocked(prisma.rating.findFirst).mockResolvedValueOnce(MOCK_RATING as never);
    const res = await POST(makePostRequest(VALID_RATING_BODY));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
    expect(json.error.message).toContain("30 días");
  });

  it("checks deduplication with correct raterId and providerId", async () => {
    await POST(makePostRequest(VALID_RATING_BODY));
    expect(vi.mocked(prisma.rating.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          raterId: RATER_ID,
          providerId: PROVIDER_ID,
        }),
      })
    );
  });

  it("checks deduplication with 30-day window", async () => {
    await POST(makePostRequest(VALID_RATING_BODY));
    const call = vi.mocked(prisma.rating.findFirst).mock.calls[0][0];
    expect(call.where.createdAt).toBeDefined();
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
    // The date should be approximately 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const diff = Math.abs(call.where.createdAt.gte.getTime() - thirtyDaysAgo.getTime());
    expect(diff).toBeLessThan(5000); // within 5 seconds
  });

  // --- Successful creation ---

  it("returns 201 with created rating on valid input", async () => {
    const res = await POST(makePostRequest(VALID_RATING_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.rating).toBeDefined();
    expect(json.data.rating.stars).toBe(4);
  });

  it("creates rating with correct data", async () => {
    await POST(makePostRequest(VALID_RATING_BODY));
    expect(vi.mocked(prisma.rating.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: COMMUNITY_ID,
          raterId: RATER_ID,
          providerId: PROVIDER_ID,
          stars: 4,
        }),
      })
    );
  });

  it("accepts all valid star values (1-5)", async () => {
    for (const stars of [1, 2, 3, 4, 5]) {
      vi.mocked(prisma.rating.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.rating.create).mockResolvedValueOnce({ ...MOCK_RATING, stars } as never);
      const res = await POST(makePostRequest({ ...VALID_RATING_BODY, stars }));
      expect(res.status).toBe(201);
    }
  });

  // --- Error handling ---

  it("returns 500 on database error during duplicate check", async () => {
    vi.mocked(prisma.rating.findFirst).mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makePostRequest(VALID_RATING_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns 500 on database error during creation", async () => {
    vi.mocked(prisma.rating.create).mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makePostRequest(VALID_RATING_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("error response always includes requestId", async () => {
    const { stars: _s, ...body } = VALID_RATING_BODY;
    const res = await POST(makePostRequest(body));
    const json = await res.json();
    expect(json.error.requestId).toBeTruthy();
  });
});
