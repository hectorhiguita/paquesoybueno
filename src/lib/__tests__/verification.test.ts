import { describe, it, expect } from "vitest";
import {
  generateVerificationCode,
  storeVerificationCode,
  verifyCode,
  hasPendingCode,
} from "../verification";

const COMMUNITY = "550e8400-e29b-41d4-a716-446655440000";
const PHONE = "3001234567";

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
    // With 1M possibilities, 20 calls should almost certainly produce >1 unique value
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("storeVerificationCode / verifyCode", () => {
  it("accepts a correct code", () => {
    storeVerificationCode(PHONE, COMMUNITY, "123456");
    expect(verifyCode(PHONE, COMMUNITY, "123456")).toBe(true);
  });

  it("rejects a wrong code", () => {
    storeVerificationCode(PHONE, COMMUNITY, "123456");
    expect(verifyCode(PHONE, COMMUNITY, "000000")).toBe(false);
  });

  it("deletes the code after successful verification (one-time use)", () => {
    storeVerificationCode(PHONE, COMMUNITY, "999999");
    expect(verifyCode(PHONE, COMMUNITY, "999999")).toBe(true);
    // Second attempt must fail
    expect(verifyCode(PHONE, COMMUNITY, "999999")).toBe(false);
  });

  it("returns false when no code has been stored", () => {
    expect(verifyCode("3009999999", COMMUNITY, "123456")).toBe(false);
  });

  it("isolates codes by communityId", () => {
    const otherCommunity = "660e8400-e29b-41d4-a716-446655440000";
    storeVerificationCode(PHONE, COMMUNITY, "111111");
    expect(verifyCode(PHONE, otherCommunity, "111111")).toBe(false);
    expect(verifyCode(PHONE, COMMUNITY, "111111")).toBe(true);
  });
});

describe("hasPendingCode", () => {
  it("returns true when a valid code exists", () => {
    storeVerificationCode("3007777777", COMMUNITY, "777777");
    expect(hasPendingCode("3007777777", COMMUNITY)).toBe(true);
  });

  it("returns false when no code exists", () => {
    expect(hasPendingCode("3008888888", COMMUNITY)).toBe(false);
  });
});
