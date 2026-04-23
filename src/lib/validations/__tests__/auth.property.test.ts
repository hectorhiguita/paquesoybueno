// Feature: santa-elena-platform, Property 1: Validación de formato de registro
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { registerSchema } from "../auth";

const COLOMBIAN_PHONE_REGEX = /^(\+57|57)?3\d{9}$/;

// Fixed valid values for non-phone/email fields
const VALID_NAME = "Juan García";
const VALID_PASSWORD = "securepass123";
const VALID_COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("Property 1: Validación de formato de registro", () => {
  /**
   * Validates: Requirements 1.1
   *
   * Side 1: Valid inputs accepted
   * For any valid Colombian phone AND valid email, registerSchema must accept the input.
   *
   * Note: fc.emailAddress() can generate RFC 5321 emails with special chars (e.g. "!a@a.aa")
   * that Zod's stricter email validator rejects. We use a constrained generator that produces
   * emails matching the pattern Zod accepts: alphanumeric local part + valid domain.
   */
  it("accepts any valid Colombian phone and valid email", () => {
    // Generate emails in the form: <word>@<word>.<tld> — accepted by Zod's email validator
    const zodCompatibleEmail = fc
      .tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
        fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
        fc.constantFrom("com", "co", "org", "net", "io")
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    fc.assert(
      fc.property(
        fc.stringMatching(/^3\d{9}$/),
        zodCompatibleEmail,
        (phone, email) => {
          const result = registerSchema.safeParse({
            name: VALID_NAME,
            email,
            phone,
            password: VALID_PASSWORD,
            communityId: VALID_COMMUNITY_ID,
          });
          return result.success === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.1
   *
   * Side 2a: Invalid phone rejected
   * For any string that does NOT match the Colombian phone regex, registerSchema must reject it.
   */
  it("rejects any string that does not match the Colombian phone format", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !COLOMBIAN_PHONE_REGEX.test(s)),
        (invalidPhone) => {
          const result = registerSchema.safeParse({
            name: VALID_NAME,
            email: "valid@example.com",
            phone: invalidPhone,
            password: VALID_PASSWORD,
            communityId: VALID_COMMUNITY_ID,
          });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.1
   *
   * Side 2b: Invalid email rejected
   * For any string that does not contain '@', registerSchema must reject it as email.
   */
  it("rejects any string without '@' as email", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes("@")),
        (invalidEmail) => {
          const result = registerSchema.safeParse({
            name: VALID_NAME,
            email: invalidEmail,
            phone: "3001234567",
            password: VALID_PASSWORD,
            communityId: VALID_COMMUNITY_ID,
          });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
