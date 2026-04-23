// Feature: santa-elena-platform, Property 25: Límite de 5 listings destacados en home
import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = "550e8400-e29b-41d4-a716-446655440099";
const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const LISTING_ID = "550e8400-e29b-41d4-a716-446655440010";

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/admin/featured", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-Admin-ID": ADMIN_ID,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Property 25: Límite de 5 listings destacados en home
// ---------------------------------------------------------------------------

describe("Property 25: Límite de 5 listings destacados en home", () => {
  /**
   * Validates: Requirements 11.3
   *
   * For any attempt to feature an additional listing when 5 active featured
   * listings already exist, the system must reject the operation.
   */

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.update).mockResolvedValue({
      id: LISTING_ID,
      title: "Test Listing",
      isFeatured: true,
    } as never);
  });

  it("rejects featuring a listing when 5 or more featured listings already exist", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        async (featuredCount) => {
          vi.mocked(prisma.listing.count).mockResolvedValue(featuredCount);

          const res = await POST(
            makePostRequest({ listingId: LISTING_ID })
          );

          return res.status === 409;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("allows featuring a listing when fewer than 5 featured listings exist", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 4 }),
        async (featuredCount) => {
          vi.mocked(prisma.listing.count).mockResolvedValue(featuredCount);

          const res = await POST(
            makePostRequest({ listingId: LISTING_ID })
          );

          return res.status === 201;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns 409 conflict error code when limit is reached", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        async (featuredCount) => {
          vi.mocked(prisma.listing.count).mockResolvedValue(featuredCount);

          const res = await POST(
            makePostRequest({ listingId: LISTING_ID })
          );

          const json = await res.json();

          return (
            res.status === 409 &&
            json.error?.code === "CONFLICT"
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
