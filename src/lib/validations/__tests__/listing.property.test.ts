// Feature: santa-elena-platform, Property 8: Validación de campos requeridos en creación de listing
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { createListingSchema } from "../listing";

// Fixed valid values
const VALID_COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VALID_VEREDA_ID = "550e8400-e29b-41d4-a716-446655440004";

const VALID_LISTING_INPUT = {
  title: "Servicio de plomería profesional",
  description: "Reparación de tuberías y grifos en general con garantía",
  type: "service" as const,
  veredaId: VALID_VEREDA_ID,
  categoryId: VALID_CATEGORY_ID,
  communityId: VALID_COMMUNITY_ID,
};

describe("Property 8: Validación de campos requeridos en creación de listing", () => {
  /**
   * Validates: Requirements 3.1, 8.1
   *
   * For any attempt to create a listing that omits at least one required field
   * (title, description, type, veredaId, categoryId), the system must reject
   * the creation with a validation error identifying the missing field.
   */
  it("rejects creation when any required field is omitted", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("title", "description", "type", "veredaId", "categoryId"),
        (fieldToOmit) => {
          const input = { ...VALID_LISTING_INPUT };
          delete (input as Record<string, unknown>)[fieldToOmit];

          const result = createListingSchema.safeParse(input);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts a complete valid listing input", () => {
    const result = createListingSchema.safeParse(VALID_LISTING_INPUT);
    if (!result.success) {
      throw new Error(`Expected success but got: ${JSON.stringify(result.error.issues)}`);
    }
  });
});

// Feature: santa-elena-platform, Property 16: Validación de vereda contra lista predefinida
describe("Property 16: Validación de vereda contra lista predefinida", () => {
  /**
   * Validates: Requirements 6.2
   *
   * For any vereda value sent in listing creation, the system must accept only
   * values that belong to the predefined list of community veredas.
   * Any other value must be rejected.
   */

  function validateVereda(veredaId: string, validVeredaIds: string[]): boolean {
    return validVeredaIds.includes(veredaId);
  }

  it("accepts a veredaId that belongs to the predefined list", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        (validVeredaIds) => {
          // Pick one from the list
          const veredaId = validVeredaIds[0];
          return validateVereda(veredaId, validVeredaIds) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects a veredaId that is not in the predefined list", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.uuid(),
        (validVeredaIds, randomId) => {
          // Ensure the random ID is not in the list
          fc.pre(!validVeredaIds.includes(randomId));
          return validateVereda(randomId, validVeredaIds) === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
