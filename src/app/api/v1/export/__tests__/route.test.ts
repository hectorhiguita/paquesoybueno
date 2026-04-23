import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    listing: {
      findMany: vi.fn(),
    },
    rating: {
      findMany: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
    report: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const ADMIN_ID = "550e8400-e29b-41d4-a716-446655440099";

const MOCK_ADMIN = { role: "admin" };

function makeRequest(
  table?: string,
  headers: Record<string, string> = {}
): NextRequest {
  const url = new URL("http://localhost/api/v1/export");
  if (table) url.searchParams.set("table", table);
  return new NextRequest(url.toString(), {
    headers: {
      "X-Community-ID": COMMUNITY_ID,
      "X-Admin-ID": ADMIN_ID,
      ...headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Auth & validation
// ---------------------------------------------------------------------------

describe("GET /api/v1/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findFirst).mockResolvedValue(MOCK_ADMIN as never);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/export?table=listings");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("communityId");
  });

  it("returns 401 when X-Admin-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/export?table=listings", {
      headers: { "X-Community-ID": COMMUNITY_ID },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when user is not an admin", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null as never);
    const res = await GET(makeRequest("listings"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when table param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("table");
  });

  it("returns 400 when table param is unsupported", async () => {
    const res = await GET(makeRequest("users"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("table");
  });

  it("error responses always include requestId", async () => {
    const req = new NextRequest("http://localhost/api/v1/export?table=listings");
    const res = await GET(req);
    const json = await res.json();
    expect(json.error.requestId).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Listings export
  // ---------------------------------------------------------------------------

  it("returns 200 with listings data", async () => {
    const mockListings = [
      {
        id: "550e8400-e29b-41d4-a716-446655440010",
        communityId: COMMUNITY_ID,
        authorId: "550e8400-e29b-41d4-a716-446655440002",
        categoryId: "550e8400-e29b-41d4-a716-446655440003",
        veredaId: "550e8400-e29b-41d4-a716-446655440004",
        title: "Servicio de plomería",
        description: "Reparación de tuberías",
        type: "service",
        status: "active",
        priceCop: null,
        tradeDescription: null,
        isFeatured: false,
        completedJobs: 5,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce(mockListings as never);

    const res = await GET(makeRequest("listings"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("Servicio de plomería");
  });

  it("filters listings by communityId", async () => {
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([] as never);
    await GET(makeRequest("listings"));
    expect(vi.mocked(prisma.listing.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { communityId: COMMUNITY_ID } })
    );
  });

  it("does not expose passwordHash in listings export", async () => {
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([
      { id: "1", title: "Test", communityId: COMMUNITY_ID },
    ] as never);
    const res = await GET(makeRequest("listings"));
    const json = await res.json();
    expect(json.data[0]).not.toHaveProperty("passwordHash");
  });

  // ---------------------------------------------------------------------------
  // Ratings export
  // ---------------------------------------------------------------------------

  it("returns 200 with ratings data", async () => {
    const mockRatings = [
      {
        id: "550e8400-e29b-41d4-a716-446655440020",
        communityId: COMMUNITY_ID,
        raterId: "550e8400-e29b-41d4-a716-446655440002",
        providerId: "550e8400-e29b-41d4-a716-446655440003",
        listingId: null,
        stars: 5,
        comment: "Excelente servicio",
        createdAt: new Date("2024-01-01"),
      },
    ];
    vi.mocked(prisma.rating.findMany).mockResolvedValueOnce(mockRatings as never);

    const res = await GET(makeRequest("ratings"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].stars).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // Messages export
  // ---------------------------------------------------------------------------

  it("returns 200 with messages data", async () => {
    const mockMessages = [
      {
        id: "550e8400-e29b-41d4-a716-446655440030",
        communityId: COMMUNITY_ID,
        threadId: "550e8400-e29b-41d4-a716-446655440031",
        senderId: "550e8400-e29b-41d4-a716-446655440002",
        content: "Hola, ¿está disponible?",
        sentAt: new Date("2024-01-01"),
        delivered: true,
      },
    ];
    vi.mocked(prisma.message.findMany).mockResolvedValueOnce(mockMessages as never);

    const res = await GET(makeRequest("messages"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].content).toBe("Hola, ¿está disponible?");
  });

  // ---------------------------------------------------------------------------
  // Reports export
  // ---------------------------------------------------------------------------

  it("returns 200 with reports data", async () => {
    const mockReports = [
      {
        id: "550e8400-e29b-41d4-a716-446655440040",
        communityId: COMMUNITY_ID,
        reporterId: "550e8400-e29b-41d4-a716-446655440002",
        targetListingId: null,
        targetUserId: "550e8400-e29b-41d4-a716-446655440003",
        reason: "Contenido inapropiado",
        status: "pending",
        createdAt: new Date("2024-01-01"),
        resolvedAt: null,
      },
    ];
    vi.mocked(prisma.report.findMany).mockResolvedValueOnce(mockReports as never);

    const res = await GET(makeRequest("reports"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].reason).toBe("Contenido inapropiado");
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.listing.findMany).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeRequest("listings"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("returns empty array when no records exist", async () => {
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([] as never);
    const res = await GET(makeRequest("listings"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
  });
});
