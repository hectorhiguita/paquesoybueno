import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock password verification
vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
}));

// Mock email so we don't hit SMTP
vi.mock("@/lib/email", () => ({
  sendAccountLockedEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_BODY = {
  email: "juan@example.com",
  password: "securepass123",
  communityId: COMMUNITY_ID,
};

const ACTIVE_USER = {
  id: "user-uuid-1",
  email: "juan@example.com",
  name: "Juan García",
  passwordHash: "pbkdf2:aabbcc:ddeeff",
  status: "active",
  failedLoginAttempts: 0,
  lockedUntil: null,
  communityId: COMMUNITY_ID,
  role: "member",
  isVerifiedProvider: false,
  phoneVerified: true,
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
  });

  // --- Validation ---

  it("returns 400 when email is missing", async () => {
    const { email: _e, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when password is missing", async () => {
    const { password: _p, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when communityId is missing", async () => {
    const { communityId: _c, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // --- Valid credentials → 200 (Req 1.5) ---

  it("returns 200 with user data on valid credentials", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(ACTIVE_USER as never);
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.userId).toBe(ACTIVE_USER.id);
    expect(json.data.email).toBe(ACTIVE_USER.email);
    expect(json.data.role).toBe("member");
  });

  it("resets failedLoginAttempts on successful login", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      ...ACTIVE_USER,
      failedLoginAttempts: 2,
    } as never);
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    await POST(makeRequest(VALID_BODY));

    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
      })
    );
  });

  // --- Invalid credentials → 401 (Req 1.6) ---

  it("returns 401 with generic message on wrong password", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(ACTIVE_USER as never);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(json.error.message).toBe("Credenciales inválidas");
  });

  it("returns 401 with generic message when user does not exist", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
    // Must NOT reveal whether email or password is wrong
    expect(json.error.message).toBe("Credenciales inválidas");
  });

  it("increments failedLoginAttempts on invalid password (Req 1.6)", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(ACTIVE_USER as never);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await POST(makeRequest(VALID_BODY));

    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLoginAttempts: 1 }),
      })
    );
  });

  // --- Account locked after 5 failed attempts (Req 1.7) ---

  it("locks account when failedLoginAttempts reaches 5", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      ...ACTIVE_USER,
      failedLoginAttempts: 4, // this attempt will be the 5th
    } as never);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await POST(makeRequest(VALID_BODY));

    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          status: "locked",
          lockedUntil: expect.any(Date),
        }),
      })
    );
  });

  // --- Locked account → 429 with Retry-After (Req 1.7) ---

  it("returns 429 with Retry-After header for locked account", async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      ...ACTIVE_USER,
      status: "locked",
      lockedUntil,
    } as never);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe("ACCOUNT_LOCKED");
    expect(json.error.message).toContain("bloqueada");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 429 error message with minutes remaining", async () => {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      ...ACTIVE_USER,
      status: "locked",
      lockedUntil,
    } as never);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.message).toMatch(/\d+ minutos/);
  });

  // --- Suspended account ---

  it("returns 401 for suspended account (generic message)", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      ...ACTIVE_USER,
      status: "suspended",
    } as never);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  // --- Error format ---

  it("response always includes requestId", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();
    expect(json.error.requestId).toBeTruthy();
  });
});
