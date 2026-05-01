import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendVerificationSms } from "../sms";

describe("sendVerificationSms", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns success in dev mode (NODE_ENV != production)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendVerificationSms("3001234567", "123456");
    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("123456"));
    consoleSpy.mockRestore();
  });

  it("normalizes 10-digit phone to E.164 in log output", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendVerificationSms("3001234567", "654321");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("+573001234567"));
    consoleSpy.mockRestore();
  });

  it("normalizes +57 prefixed phone correctly", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendVerificationSms("+573001234567", "111111");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("+573001234567"));
    consoleSpy.mockRestore();
  });

  it("normalizes 57-prefixed phone correctly", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendVerificationSms("573001234567", "222222");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("+573001234567"));
    consoleSpy.mockRestore();
  });
});
