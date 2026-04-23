import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { PATCH } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440010";
const ADMIN_ID = "550e8400-e29b-41d4-a716-446655440099";
const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";

const MOCK_MEMBER = { id: MEMBER_ID };

const MOCK_UPDATED_MEMBER = {
  id: MEMBER_ID,
  name: "Juan Pérez",
  email: "juan@example.com",
  isVerifiedProvider: true,
  verifiedAt: new Date("2024-06-01T00:00:00Z"),
  verifiedBy: ADMIN_ID,
  verificationReason: "Documentos verificados",
};

function makeRequest(body?: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost/api/v1/admin/members/${MEMBER_ID}/verify`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-Admin-ID": ADMIN_ID,
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const ROUTE_CONTEXT = { params: Promise.resolve({ id: MEMBER_ID }) };

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/members/:id/verify
// ---------------------------------------------------------------------------

describe("PATCH /api/v1/admin/members/:id/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_MEMBER as never);
    vi.mocked(prisma.user.update).mockResolvedValue(MOCK_UPDATED_MEMBER as never);
  });

  it("returns 200 with updated member on valid request", async () => {
    const res = await PATCH(makeRequest({ reason: "Documentos verificados" }), ROUTE_CONTEXT);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.member.isVerifiedProvider).toBe(true);
  });

  it("persists isVerifiedProvider, verifiedAt, verifiedBy, verificationReason (Req 9.7)", async () => {
    await PATCH(makeRequest({ reason: "Documentos verificados" }), ROUTE_CONTEXT);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isVerifiedProvider: true,
          verifiedAt: expect.any(Date),
          verifiedBy: ADMIN_ID,
          verificationReason: "Documentos verificados",
        }),
      })
    );
  });

  it("returns 401 when X-Admin-ID header is missing", async () => {
    const res = await PATCH(
      makeRequest({ reason: "Documentos verificados" }, { "X-Admin-ID": "" }),
      ROUTE_CONTEXT
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when reason is missing", async () => {
    const res = await PATCH(makeRequest({}), ROUTE_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("reason");
  });

  it("returns 400 when reason is too short (< 3 chars)", async () => {
    const res = await PATCH(makeRequest({ reason: "ab" }), ROUTE_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when reason is empty string", async () => {
    const res = await PATCH(makeRequest({ reason: "" }), ROUTE_CONTEXT);
    expect(res.status).toBe(400);
  });

  it("returns 404 when member does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);
    const res = await PATCH(makeRequest({ reason: "Documentos verificados" }), ROUTE_CONTEXT);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest(
      `http://localhost/api/v1/admin/members/${MEMBER_ID}/verify`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Community-ID": COMMUNITY_ID,
          "X-Admin-ID": ADMIN_ID,
        },
        body: "not json",
      }
    );
    const res = await PATCH(req, ROUTE_CONTEXT);
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error during update", async () => {
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("DB error"));
    const res = await PATCH(makeRequest({ reason: "Documentos verificados" }), ROUTE_CONTEXT);
    expect(res.status).toBe(500);
  });

  it("trims whitespace from reason before persisting", async () => {
    await PATCH(makeRequest({ reason: "  Documentos verificados  " }), ROUTE_CONTEXT);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationReason: "Documentos verificados",
        }),
      })
    );
  });

  it("response includes verifiedAt, verifiedBy, verificationReason fields", async () => {
    const res = await PATCH(makeRequest({ reason: "Documentos verificados" }), ROUTE_CONTEXT);
    const json = await res.json();
    const member = json.data.member;
    expect(member.verifiedAt).toBeDefined();
    expect(member.verifiedBy).toBe(ADMIN_ID);
    expect(member.verificationReason).toBe("Documentos verificados");
  });
});
