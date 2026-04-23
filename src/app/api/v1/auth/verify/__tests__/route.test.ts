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

// Mock verification module
vi.mock("@/lib/verification", () => ({
  verifyCode: vi.fn(),
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { verifyCode } from "@/lib/verification";

const VALID_BODY = {
  phone: "3001234567",
  code: "123456",
  communityId: "550e8400-e29b-41d4-a716-446655440000",
};

const MOCK_USER = { id: "user-uuid-1", phoneVerified: false };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Input validation ---

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when phone is missing", async () => {
    const { phone: _p, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid phone format", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, phone: "1234567890" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("phone");
  });

  it("returns 400 when code is not 6 digits", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, code: "123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("code");
  });

  it("returns 400 for invalid communityId (not UUID)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, communityId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  // --- User not found ---

  it("returns 404 when user does not exist", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  // --- Invalid / expired code ---

  it("returns 400 with INVALID_CODE when code is wrong", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(verifyCode).mockReturnValueOnce(false);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_CODE");
    expect(json.error.message).toBe("Código inválido o expirado");
  });

  it("returns 400 with INVALID_CODE when code is expired", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(verifyCode).mockReturnValueOnce(false);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_CODE");
  });

  // --- Success (Req 1.3) ---

  it("returns 200 and activates account on valid code", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(verifyCode).mockReturnValueOnce(true);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.message).toBe("Cuenta verificada exitosamente");
  });

  it("calls prisma.user.update with phoneVerified: true on success", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(verifyCode).mockReturnValueOnce(true);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await POST(makeRequest(VALID_BODY));

    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith({
      where: { id: MOCK_USER.id },
      data: { phoneVerified: true },
    });
  });

  it("calls verifyCode with correct phone, communityId, and code", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(verifyCode).mockReturnValueOnce(true);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

    await POST(makeRequest(VALID_BODY));

    expect(vi.mocked(verifyCode)).toHaveBeenCalledWith(
      VALID_BODY.phone,
      VALID_BODY.communityId,
      VALID_BODY.code
    );
  });

  // --- DB errors ---

  it("returns 500 when findFirst throws", async () => {
    vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("returns 500 when update throws", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER as never);
    vi.mocked(verifyCode).mockReturnValueOnce(true);
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
