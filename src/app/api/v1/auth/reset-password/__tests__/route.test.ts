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

// Mock email module
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock reset-tokens module
vi.mock("@/lib/reset-tokens", () => ({
  generateResetToken: vi.fn().mockReturnValue("mock-reset-token-hex"),
  validateResetToken: vi.fn(),
  hasValidResetToken: vi.fn(),
}));

// Mock hashPassword
vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("pbkdf2:salt:hash"),
}));

import { POST, PUT } from "../route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateResetToken, validateResetToken } from "@/lib/reset-tokens";
import { hashPassword } from "@/lib/auth/password";

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_EMAIL = "user@example.com";
const MOCK_USER = { id: "user-uuid-1", email: VALID_EMAIL };

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/reset-password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makePostRequest({ communityId: COMMUNITY_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(
      makePostRequest({ email: "not-an-email", communityId: COMMUNITY_ID })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid communityId (not UUID)", async () => {
    const res = await POST(
      makePostRequest({ email: VALID_EMAIL, communityId: "not-a-uuid" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  // No email enumeration — always returns 200
  it("returns 200 even when email is not registered (no enumeration)", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    const res = await POST(
      makePostRequest({ email: VALID_EMAIL, communityId: COMMUNITY_ID })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toBe(
      "Si el correo está registrado, recibirás un enlace de restablecimiento."
    );
  });

  it("does NOT send email when user does not exist", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    await POST(makePostRequest({ email: VALID_EMAIL, communityId: COMMUNITY_ID }));

    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("returns 200 and sends email when user exists", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);

    const res = await POST(
      makePostRequest({ email: VALID_EMAIL, communityId: COMMUNITY_ID })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toBe(
      "Si el correo está registrado, recibirás un enlace de restablecimiento."
    );
    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: VALID_EMAIL })
    );
  });

  it("generates a reset token when user exists", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);

    await POST(makePostRequest({ email: VALID_EMAIL, communityId: COMMUNITY_ID }));

    expect(vi.mocked(generateResetToken)).toHaveBeenCalledWith(
      VALID_EMAIL,
      COMMUNITY_ID
    );
  });

  it("includes reset link with token in the email", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);

    await POST(makePostRequest({ email: VALID_EMAIL, communityId: COMMUNITY_ID }));

    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.text).toContain("mock-reset-token-hex");
  });

  it("returns 200 even when DB throws (no enumeration)", async () => {
    vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(
      makePostRequest({ email: VALID_EMAIL, communityId: COMMUNITY_ID })
    );
    expect(res.status).toBe(200);
    consoleSpy.mockRestore();
  });
});

describe("PUT /api/v1/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/reset-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when token is missing", async () => {
    const res = await PUT(makePutRequest({ password: "newpassword123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when password is too short", async () => {
    const res = await PUT(makePutRequest({ token: "sometoken", password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 with INVALID_TOKEN for invalid token", async () => {
    vi.mocked(validateResetToken).mockReturnValueOnce(null);

    const res = await PUT(
      makePutRequest({ token: "invalid-token", password: "newpassword123" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_TOKEN");
    expect(json.error.message).toBe("Token inválido o expirado");
  });

  it("returns 400 with INVALID_TOKEN for expired token", async () => {
    vi.mocked(validateResetToken).mockReturnValueOnce(null);

    const res = await PUT(
      makePutRequest({ token: "expired-token", password: "newpassword123" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 200 and updates passwordHash on valid token", async () => {
    vi.mocked(validateResetToken).mockReturnValueOnce({
      email: VALID_EMAIL,
      communityId: COMMUNITY_ID,
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    const res = await PUT(
      makePutRequest({ token: "valid-token", password: "newpassword123" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toBe("Contraseña actualizada exitosamente");
  });

  it("calls hashPassword with the new password", async () => {
    vi.mocked(validateResetToken).mockReturnValueOnce({
      email: VALID_EMAIL,
      communityId: COMMUNITY_ID,
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await PUT(makePutRequest({ token: "valid-token", password: "newpassword123" }));

    expect(vi.mocked(hashPassword)).toHaveBeenCalledWith("newpassword123");
  });

  it("calls prisma.user.update with hashed password", async () => {
    vi.mocked(validateResetToken).mockReturnValueOnce({
      email: VALID_EMAIL,
      communityId: COMMUNITY_ID,
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await PUT(makePutRequest({ token: "valid-token", password: "newpassword123" }));

    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith({
      where: { id: MOCK_USER.id },
      data: { passwordHash: "pbkdf2:salt:hash" },
    });
  });

  it("returns 500 when DB findFirst throws", async () => {
    vi.mocked(validateResetToken).mockReturnValueOnce({
      email: VALID_EMAIL,
      communityId: COMMUNITY_ID,
    });
    vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await PUT(
      makePutRequest({ token: "valid-token", password: "newpassword123" })
    );
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("returns 500 when DB update throws", async () => {
    vi.mocked(validateResetToken).mockReturnValueOnce({
      email: VALID_EMAIL,
      communityId: COMMUNITY_ID,
    });
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await PUT(
      makePutRequest({ token: "valid-token", password: "newpassword123" })
    );
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
