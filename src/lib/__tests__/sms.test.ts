import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendVerificationSms } from "../sms";

describe("sendVerificationSms", () => {
  beforeEach(() => {
    // Ensure Twilio env vars are NOT set so we use the console fallback
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  it("returns success in dev mode (no Twilio env vars)", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendVerificationSms("3001234567", "123456");
    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("123456")
    );
    consoleSpy.mockRestore();
  });

  it("normalizes 10-digit phone to E.164 in log output", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendVerificationSms("3001234567", "654321");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("+573001234567")
    );
    consoleSpy.mockRestore();
  });

  it("normalizes +57 prefixed phone correctly", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendVerificationSms("+573001234567", "111111");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("+573001234567")
    );
    consoleSpy.mockRestore();
  });

  it("normalizes 57-prefixed phone correctly", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendVerificationSms("573001234567", "222222");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("+573001234567")
    );
    consoleSpy.mockRestore();
  });
});
