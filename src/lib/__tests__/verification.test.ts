import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationCode: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import {
  generateVerificationCode,
  storeVerificationCode,
  verifyCode,
  hasPendingCode,
} from "../verification";
import { prisma } from "@/lib/prisma";

const COMMUNITY = "550e8400-e29b-41d4-a716-446655440000";
const PHONE = "3001234567";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateVerificationCode", () => {
  it("returns a 6-character string", () => {
    const code = generateVerificationCode();
    expect(code).toHaveLength(6);
  });

  it("contains only digits", () => {
    const code = generateVerificationCode();
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it("generates different codes on successive calls (probabilistic)", () => {
    const codes = new Set(Array.from({ length: 20 }, generateVerificationCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("storeVerificationCode", () => {
  it("calls prisma.verificationCode.upsert with correct data", async () => {
    vi.mocked(prisma.verificationCode.upsert).mockResolvedValue({} as never);
    await storeVerificationCode(PHONE, COMMUNITY, "123456");
    expect(prisma.verificationCode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_communityId: { phone: PHONE, communityId: COMMUNITY } },
        create: expect.objectContaining({ phone: PHONE, communityId: COMMUNITY, code: "123456" }),
        update: expect.objectContaining({ code: "123456" }),
      })
    );
  });
});

describe("verifyCode", () => {
  it("returns true and deletes entry for a valid unexpired code", async () => {
    vi.mocked(prisma.verificationCode.findUnique).mockResolvedValue({
      phone: PHONE,
      communityId: COMMUNITY,
      code: "123456",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.verificationCode.delete).mockResolvedValue({} as never);

    const result = await verifyCode(PHONE, COMMUNITY, "123456");
    expect(result).toBe(true);
    expect(prisma.verificationCode.delete).toHaveBeenCalled();
  });

  it("returns false for a wrong code (does not delete)", async () => {
    vi.mocked(prisma.verificationCode.findUnique).mockResolvedValue({
      phone: PHONE,
      communityId: COMMUNITY,
      code: "123456",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    } as never);

    const result = await verifyCode(PHONE, COMMUNITY, "000000");
    expect(result).toBe(false);
    expect(prisma.verificationCode.delete).not.toHaveBeenCalled();
  });

  it("returns false when no code exists", async () => {
    vi.mocked(prisma.verificationCode.findUnique).mockResolvedValue(null);
    const result = await verifyCode("3009999999", COMMUNITY, "123456");
    expect(result).toBe(false);
  });

  it("returns false and deletes expired code", async () => {
    vi.mocked(prisma.verificationCode.findUnique).mockResolvedValue({
      phone: PHONE,
      communityId: COMMUNITY,
      code: "123456",
      expiresAt: new Date(Date.now() - 1),
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.verificationCode.delete).mockResolvedValue({} as never);

    const result = await verifyCode(PHONE, COMMUNITY, "123456");
    expect(result).toBe(false);
    expect(prisma.verificationCode.delete).toHaveBeenCalled();
  });

  it("isolates codes by communityId", async () => {
    const otherCommunity = "660e8400-e29b-41d4-a716-446655440000";
    vi.mocked(prisma.verificationCode.findUnique).mockResolvedValue(null);
    const result = await verifyCode(PHONE, otherCommunity, "111111");
    expect(result).toBe(false);
  });
});

describe("hasPendingCode", () => {
  it("returns true when a valid code exists", async () => {
    vi.mocked(prisma.verificationCode.findUnique).mockResolvedValue({
      phone: PHONE,
      communityId: COMMUNITY,
      code: "777777",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    } as never);

    const result = await hasPendingCode(PHONE, COMMUNITY);
    expect(result).toBe(true);
  });

  it("returns false when no code exists", async () => {
    vi.mocked(prisma.verificationCode.findUnique).mockResolvedValue(null);
    const result = await hasPendingCode("3008888888", COMMUNITY);
    expect(result).toBe(false);
  });
});
