import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
    },
  },
}));

// Mock SMS so we don't hit Twilio
vi.mock("@/lib/sms", () => ({
  sendVerificationSms: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";

const VALID_BODY = {
  name: "Juan García",
  email: "juan@example.com",
  phone: "3001234567",
  password: "securepass123",
  communityId: "550e8400-e29b-41d4-a716-446655440000",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Validation (Req 1.1) ---

  it("returns 400 when email is missing", async () => {
    const { email: _e, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: "notanemail" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("email");
  });

  it("returns 400 for invalid Colombian phone", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, phone: "1234567890" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("phone");
  });

  it("returns 400 for phone starting with 2 (not mobile)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, phone: "2001234567" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid communityId (not UUID)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, communityId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Success (Req 1.2) ---

  it("returns 201 with userId on valid registration", async () => {
    const mockCreate = vi.mocked(prisma.user.create);
    mockCreate.mockResolvedValueOnce({ id: "test-user-id" } as never);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.userId).toBe("test-user-id");
    expect(json.data.message).toContain("código de verificación");
  });

  it("accepts +57 prefixed phone", async () => {
    const mockCreate = vi.mocked(prisma.user.create);
    mockCreate.mockResolvedValueOnce({ id: "user-2" } as never);

    const res = await POST(makeRequest({ ...VALID_BODY, phone: "+573001234567" }));
    expect(res.status).toBe(201);
  });

  it("accepts 57-prefixed phone", async () => {
    const mockCreate = vi.mocked(prisma.user.create);
    mockCreate.mockResolvedValueOnce({ id: "user-3" } as never);

    const res = await POST(makeRequest({ ...VALID_BODY, phone: "573001234567" }));
    expect(res.status).toBe(201);
  });

  // --- Duplicate error (Req 1.4) ---

  it("returns 409 with generic message when email is duplicated", async () => {
    const mockCreate = vi.mocked(prisma.user.create);
    mockCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["community_id", "email"] },
      })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
    expect(json.error.message).toBe("Ya existe una cuenta con estos datos");
    // Must NOT reveal which field caused the conflict
    expect(json.error.field).toBeUndefined();
  });

  it("returns 409 with SAME generic message when phone is duplicated", async () => {
    const mockCreate = vi.mocked(prisma.user.create);
    mockCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["community_id", "phone"] },
      })
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const json = await res.json();
    // Message must be identical regardless of which field is duplicated
    expect(json.error.message).toBe("Ya existe una cuenta con estos datos");
    expect(json.error.field).toBeUndefined();
  });

  it("returns 500 on unexpected DB error", async () => {
    const mockCreate = vi.mocked(prisma.user.create);
    mockCreate.mockRejectedValueOnce(new Error("Connection refused"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
