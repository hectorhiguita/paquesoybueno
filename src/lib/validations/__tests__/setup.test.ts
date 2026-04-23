import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { registerSchema, colombianPhoneSchema, emailSchema } from "../auth";

describe("Setup: fast-check and Zod validations", () => {
  it("fast-check is available and runs property tests", () => {
    // Feature: santa-elena-platform, Property 0: fast-check setup verification
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
        return n >= 1 && n <= 100;
      }),
      { numRuns: 100 }
    );
  });

  it("colombianPhoneSchema accepts valid Colombian mobile numbers", () => {
    const validNumbers = ["3001234567", "3151234567", "3201234567", "+573001234567", "573001234567"];
    for (const phone of validNumbers) {
      expect(colombianPhoneSchema.safeParse(phone).success).toBe(true);
    }
  });

  it("colombianPhoneSchema rejects invalid numbers", () => {
    const invalidNumbers = ["1234567890", "123", "+1234567890", "2001234567"];
    for (const phone of invalidNumbers) {
      expect(colombianPhoneSchema.safeParse(phone).success).toBe(false);
    }
  });

  it("emailSchema accepts valid emails", () => {
    const validEmails = ["user@example.com", "test.user+tag@domain.co"];
    for (const email of validEmails) {
      expect(emailSchema.safeParse(email).success).toBe(true);
    }
  });

  it("emailSchema rejects invalid emails", () => {
    const invalidEmails = ["notanemail", "@domain.com", "user@", "user@.com"];
    for (const email of invalidEmails) {
      expect(emailSchema.safeParse(email).success).toBe(false);
    }
  });

  it("registerSchema validates all required fields", () => {
    const validInput = {
      name: "Juan García",
      email: "juan@example.com",
      phone: "3001234567",
      password: "securepass123",
      communityId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(registerSchema.safeParse(validInput).success).toBe(true);
  });

  it("registerSchema rejects missing required fields", () => {
    const missingEmail = {
      name: "Juan García",
      phone: "3001234567",
      password: "securepass123",
      communityId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(registerSchema.safeParse(missingEmail).success).toBe(false);
  });
});
