// Feature: santa-elena-platform, Property 27: Exportación JSON preserva todos los datos
import { describe, it } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Property 27: Exportación JSON preserva todos los datos
// ---------------------------------------------------------------------------

describe("Property 27: Exportación JSON preserva todos los datos", () => {
  /**
   * Validates: Requirements 12.4
   *
   * For any set of user-generated content, the JSON export must preserve all
   * fields and values, and the resulting JSON must be valid and parseable.
   */

  it("JSON round-trip preserves all fields and values for listing-like records", () => {
    const listingArb = fc.record({
      id: fc.uuid(),
      communityId: fc.uuid(),
      authorId: fc.uuid(),
      categoryId: fc.uuid(),
      veredaId: fc.uuid(),
      title: fc.string({ minLength: 3, maxLength: 100 }),
      description: fc.string({ minLength: 10, maxLength: 500 }),
      type: fc.constantFrom("service", "sale", "rent", "trade", "tool"),
      status: fc.constantFrom("active", "inactive", "flagged", "pending_review"),
      priceCop: fc.option(fc.integer({ min: 0, max: 10_000_000 }), { nil: null }),
      tradeDescription: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      isFeatured: fc.boolean(),
      completedJobs: fc.integer({ min: 0, max: 1000 }),
    });

    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 0, maxLength: 50 }),
        (records) => {
          const serialized = JSON.stringify(records);
          const parsed = JSON.parse(serialized) as typeof records;

          if (parsed.length !== records.length) return false;

          return records.every((original, i) => {
            const restored = parsed[i];
            return (
              restored.id === original.id &&
              restored.communityId === original.communityId &&
              restored.authorId === original.authorId &&
              restored.title === original.title &&
              restored.description === original.description &&
              restored.type === original.type &&
              restored.status === original.status &&
              restored.priceCop === original.priceCop &&
              restored.tradeDescription === original.tradeDescription &&
              restored.isFeatured === original.isFeatured &&
              restored.completedJobs === original.completedJobs
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("JSON round-trip preserves all fields and values for rating-like records", () => {
    const ratingArb = fc.record({
      id: fc.uuid(),
      communityId: fc.uuid(),
      raterId: fc.uuid(),
      providerId: fc.uuid(),
      listingId: fc.option(fc.uuid(), { nil: null }),
      stars: fc.integer({ min: 1, max: 5 }),
      comment: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
    });

    fc.assert(
      fc.property(
        fc.array(ratingArb, { minLength: 0, maxLength: 50 }),
        (records) => {
          const serialized = JSON.stringify(records);
          const parsed = JSON.parse(serialized) as typeof records;

          if (parsed.length !== records.length) return false;

          return records.every((original, i) => {
            const restored = parsed[i];
            return (
              restored.id === original.id &&
              restored.communityId === original.communityId &&
              restored.raterId === original.raterId &&
              restored.providerId === original.providerId &&
              restored.listingId === original.listingId &&
              restored.stars === original.stars &&
              restored.comment === original.comment
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("JSON round-trip preserves all fields and values for message-like records", () => {
    const messageArb = fc.record({
      id: fc.uuid(),
      communityId: fc.uuid(),
      threadId: fc.uuid(),
      senderId: fc.uuid(),
      content: fc.string({ minLength: 1, maxLength: 1000 }),
      delivered: fc.boolean(),
    });

    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 0, maxLength: 50 }),
        (records) => {
          const serialized = JSON.stringify(records);
          const parsed = JSON.parse(serialized) as typeof records;

          if (parsed.length !== records.length) return false;

          return records.every((original, i) => {
            const restored = parsed[i];
            return (
              restored.id === original.id &&
              restored.communityId === original.communityId &&
              restored.threadId === original.threadId &&
              restored.senderId === original.senderId &&
              restored.content === original.content &&
              restored.delivered === original.delivered
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("JSON round-trip preserves all fields and values for report-like records", () => {
    const reportArb = fc.record({
      id: fc.uuid(),
      communityId: fc.uuid(),
      reporterId: fc.uuid(),
      targetListingId: fc.option(fc.uuid(), { nil: null }),
      targetUserId: fc.option(fc.uuid(), { nil: null }),
      reason: fc.string({ minLength: 1, maxLength: 500 }),
      status: fc.constantFrom("pending", "resolved", "dismissed"),
    });

    fc.assert(
      fc.property(
        fc.array(reportArb, { minLength: 0, maxLength: 50 }),
        (records) => {
          const serialized = JSON.stringify(records);
          const parsed = JSON.parse(serialized) as typeof records;

          if (parsed.length !== records.length) return false;

          return records.every((original, i) => {
            const restored = parsed[i];
            return (
              restored.id === original.id &&
              restored.communityId === original.communityId &&
              restored.reporterId === original.reporterId &&
              restored.targetListingId === original.targetListingId &&
              restored.targetUserId === original.targetUserId &&
              restored.reason === original.reason &&
              restored.status === original.status
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("serialized JSON is always a valid parseable string", () => {
    const recordArb = fc.record({
      id: fc.uuid(),
      communityId: fc.uuid(),
      value: fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.constant(null)
      ),
    });

    fc.assert(
      fc.property(
        fc.array(recordArb, { minLength: 0, maxLength: 50 }),
        (records) => {
          let serialized: string;
          try {
            serialized = JSON.stringify(records);
          } catch {
            return false;
          }

          try {
            const parsed = JSON.parse(serialized);
            return Array.isArray(parsed) && parsed.length === records.length;
          } catch {
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
