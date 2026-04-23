import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    community: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/communities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const COMMUNITY_A = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  name: "Santa Elena",
  slug: "santa-elena",
  active: true,
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const COMMUNITY_B = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  name: "El Retiro",
  slug: "el-retiro",
  active: true,
  createdAt: new Date("2024-02-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// GET /api/v1/communities
// ---------------------------------------------------------------------------

describe("GET /api/v1/communities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with list of active communities", async () => {
    vi.mocked(prisma.community.findMany).mockResolvedValueOnce([
      COMMUNITY_A,
      COMMUNITY_B,
    ] as never);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.communities).toHaveLength(2);
    expect(json.data.communities[0].slug).toBe("santa-elena");
    expect(json.data.communities[1].slug).toBe("el-retiro");
  });

  it("returns 200 with empty array when no communities exist", async () => {
    vi.mocked(prisma.community.findMany).mockResolvedValueOnce([] as never);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.communities).toEqual([]);
  });

  it("returns communities with required fields", async () => {
    vi.mocked(prisma.community.findMany).mockResolvedValueOnce([
      COMMUNITY_A,
    ] as never);

    const res = await GET();
    const json = await res.json();
    const community = json.data.communities[0];

    expect(community).toHaveProperty("id");
    expect(community).toHaveProperty("name");
    expect(community).toHaveProperty("slug");
    expect(community).toHaveProperty("active");
    expect(community).toHaveProperty("createdAt");
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.community.findMany).mockRejectedValueOnce(
      new Error("DB connection failed")
    );

    const res = await GET();
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("response includes requestId on error", async () => {
    vi.mocked(prisma.community.findMany).mockRejectedValueOnce(
      new Error("DB error")
    );

    const res = await GET();
    const json = await res.json();
    expect(json.error.requestId).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/communities
// ---------------------------------------------------------------------------

describe("POST /api/v1/communities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Validation ---

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({ slug: "santa-elena" }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(makePostRequest({ name: "Santa Elena" }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when slug contains uppercase letters", async () => {
    const res = await POST(
      makePostRequest({ name: "Santa Elena", slug: "Santa-Elena" })
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when slug contains spaces", async () => {
    const res = await POST(
      makePostRequest({ name: "Santa Elena", slug: "santa elena" })
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Successful creation → 201 ---

  it("returns 201 with created community on valid input", async () => {
    vi.mocked(prisma.community.create).mockResolvedValueOnce(
      COMMUNITY_A as never
    );

    const res = await POST(
      makePostRequest({ name: "Santa Elena", slug: "santa-elena" })
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.community.id).toBe(COMMUNITY_A.id);
    expect(json.data.community.slug).toBe("santa-elena");
    expect(json.data.community.name).toBe("Santa Elena");
  });

  it("created community response includes all required fields", async () => {
    vi.mocked(prisma.community.create).mockResolvedValueOnce(
      COMMUNITY_A as never
    );

    const res = await POST(
      makePostRequest({ name: "Santa Elena", slug: "santa-elena" })
    );
    const json = await res.json();
    const community = json.data.community;

    expect(community).toHaveProperty("id");
    expect(community).toHaveProperty("name");
    expect(community).toHaveProperty("slug");
    expect(community).toHaveProperty("active");
    expect(community).toHaveProperty("createdAt");
  });

  // --- Slug conflict → 409 ---

  it("returns 409 when slug already exists (Prisma P2002)", async () => {
    const prismaError = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["slug"] },
    });
    vi.mocked(prisma.community.create).mockRejectedValueOnce(prismaError);

    const res = await POST(
      makePostRequest({ name: "Santa Elena 2", slug: "santa-elena" })
    );
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("returns 409 when slug already exists (message-based detection)", async () => {
    vi.mocked(prisma.community.create).mockRejectedValueOnce(
      new Error("Unique constraint failed on slug")
    );

    const res = await POST(
      makePostRequest({ name: "Duplicate", slug: "santa-elena" })
    );
    expect(res.status).toBe(409);
  });

  // --- Internal error ---

  it("returns 500 on unexpected database error", async () => {
    vi.mocked(prisma.community.create).mockRejectedValueOnce(
      new Error("Connection timeout")
    );

    const res = await POST(
      makePostRequest({ name: "New Community", slug: "new-community" })
    );
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  // --- Error format ---

  it("error response always includes requestId", async () => {
    const res = await POST(makePostRequest({}));
    const json = await res.json();
    expect(json.error.requestId).toBeTruthy();
  });
});
