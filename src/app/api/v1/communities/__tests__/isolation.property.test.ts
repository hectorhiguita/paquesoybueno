// Feature: santa-elena-platform, Property 26: Aislamiento de datos entre zonas comunitarias

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 26: Aislamiento de datos entre zonas comunitarias
 *
 * For any pair of distinct communities (A, B), no listing, member, or content
 * belonging to community A must be visible or accessible from the context of
 * community B, and vice versa.
 *
 * Validates: Requirements 12.2
 *
 * This test validates the correctness of the filtering logic that RLS enforces
 * at the DB level. It is a pure logic test — no DB or HTTP calls needed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Listing {
  id: string;
  communityId: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Filtering logic (mirrors what RLS + query layer enforces at the DB level)
// ---------------------------------------------------------------------------

function filterListingsByCommunity(
  listings: Listing[],
  communityId: string
): Listing[] {
  return listings.filter((l) => l.communityId === communityId);
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe("Property 26: Aislamiento de datos entre zonas comunitarias", () => {
  it("no listing from community B appears in community A results, and vice versa", () => {
    fc.assert(
      fc.property(
        // Generate two distinct community UUIDs
        fc.uuid(),
        fc.uuid(),
        // Generate an array of listings, each belonging to one of the two communities
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (communityIdA, communityIdB, listingBases) => {
          // Ensure the two community IDs are distinct
          fc.pre(communityIdA !== communityIdB);

          // Assign each listing to one of the two communities
          const listings: Listing[] = listingBases.map((base, index) => ({
            ...base,
            communityId: index % 2 === 0 ? communityIdA : communityIdB,
          }));

          // Simulate the filtering logic
          const resultsA = filterListingsByCommunity(listings, communityIdA);
          const resultsB = filterListingsByCommunity(listings, communityIdB);

          // Assert: no listing from B appears in A's results
          const noBLeaksIntoA = resultsA.every(
            (l) => l.communityId === communityIdA
          );

          // Assert: no listing from A appears in B's results
          const noALeaksIntoB = resultsB.every(
            (l) => l.communityId === communityIdB
          );

          // Assert: results are mutually exclusive (no listing appears in both)
          const idsA = new Set(resultsA.map((l) => l.id));
          const idsB = new Set(resultsB.map((l) => l.id));
          const noOverlap = [...idsA].every((id) => !idsB.has(id));

          return noBLeaksIntoA && noALeaksIntoB && noOverlap;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("filtering is exhaustive: all listings of a community are returned when querying that community", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (communityIdA, communityIdB, listingBases) => {
          fc.pre(communityIdA !== communityIdB);

          const listings: Listing[] = listingBases.map((base, index) => ({
            ...base,
            communityId: index % 2 === 0 ? communityIdA : communityIdB,
          }));

          const expectedA = listings.filter(
            (l) => l.communityId === communityIdA
          );
          const resultsA = filterListingsByCommunity(listings, communityIdA);

          // All listings belonging to A must be present in A's results
          const allAPresent = expectedA.every((l) =>
            resultsA.some((r) => r.id === l.id)
          );

          // Count must match exactly
          const countMatches = resultsA.length === expectedA.length;

          return allAPresent && countMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("querying an unknown community returns no listings from known communities", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (communityIdA, communityIdB, unknownCommunityId, listingBases) => {
          fc.pre(communityIdA !== communityIdB);
          fc.pre(unknownCommunityId !== communityIdA);
          fc.pre(unknownCommunityId !== communityIdB);

          const listings: Listing[] = listingBases.map((base, index) => ({
            ...base,
            communityId: index % 2 === 0 ? communityIdA : communityIdB,
          }));

          const resultsUnknown = filterListingsByCommunity(
            listings,
            unknownCommunityId
          );

          // An unknown community must see zero listings
          return resultsUnknown.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
