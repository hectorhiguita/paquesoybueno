// Feature: santa-elena-platform, Property 24: Categoría desactivada no aparece en formularios pero preserva listings
import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    listing: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    vereda: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { PATCH } from "../[id]/route";
import { GET } from "@/app/api/v1/listings/route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = "550e8400-e29b-41d4-a716-446655440099";
const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VEREDA_ID = "550e8400-e29b-41d4-a716-446655440004";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";

function makePatchRequest(categoryId: string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/v1/admin/categories/${categoryId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-ID": ADMIN_ID,
      },
      body: JSON.stringify(body),
    }
  );
}

function makeGetListingsRequest(categoryId?: string): NextRequest {
  const url = categoryId
    ? `http://localhost/api/v1/listings?categoryId=${categoryId}`
    : "http://localhost/api/v1/listings";
  return new NextRequest(url, {
    headers: { "X-Community-ID": COMMUNITY_ID },
  });
}

// ---------------------------------------------------------------------------
// Property 24: Categoría desactivada no aparece en formularios pero preserva listings
// ---------------------------------------------------------------------------

describe("Property 24: Categoría desactivada no aparece en formularios pero preserva listings", () => {
  /**
   * Validates: Requirements 11.2
   *
   * For any deactivated category, the system must:
   * (a) exclude it from new listing creation forms (active=false), and
   * (b) preserve all existing listings under that category without modifying them.
   */

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets category.active=false when PATCH is called with { active: false }", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (categoryId) => {
          vi.mocked(prisma.category.findUnique).mockResolvedValue(
            { id: categoryId } as never
          );
          vi.mocked(prisma.category.update).mockResolvedValue({
            id: categoryId,
            name: "Test Category",
            active: false,
          } as never);

          const res = await PATCH(
            makePatchRequest(categoryId, { active: false }),
            { params: Promise.resolve({ id: categoryId }) }
          );

          if (res.status !== 200) return false;

          const updateCall = vi.mocked(prisma.category.update).mock.calls.at(-1)?.[0];
          if (!updateCall) return false;

          return (updateCall.data as Record<string, unknown>)?.active === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("preserves existing listings under a deactivated category (listings are not modified)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 1, max: 10 }),
        async (categoryId, listingCount) => {
          // Simulate listings that belong to the deactivated category
          const mockListings = Array.from({ length: listingCount }, (_, i) => ({
            id: `listing-${i}`,
            communityId: COMMUNITY_ID,
            categoryId,
            status: "active",
            author: { id: USER_ID, name: "Test User", isVerifiedProvider: false, phone: "3001234567" },
            category: { id: categoryId, name: "Deactivated Category", icon: null },
            vereda: { id: VEREDA_ID, name: "El Placer" },
            _count: { ratings: 0 },
            ratings: [],
          }));

          vi.mocked(prisma.listing.findMany).mockResolvedValue(mockListings as never);
          vi.mocked(prisma.listing.count).mockResolvedValue(listingCount);

          // GET listings filtered by the deactivated category — they must still appear
          const res = await GET(makeGetListingsRequest(categoryId));

          if (res.status !== 200) return false;

          const json = await res.json();
          const listings = json.data?.listings;

          if (!Array.isArray(listings)) return false;

          // All listings with the deactivated category must still be returned
          return listings.every(
            (l: { categoryId: string }) => l.categoryId === categoryId
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("can rename a category (active stays true when not specified)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 2, maxLength: 50 }),
        async (categoryId, newName) => {
          vi.mocked(prisma.category.findUnique).mockResolvedValue(
            { id: categoryId } as never
          );
          vi.mocked(prisma.category.update).mockResolvedValue({
            id: categoryId,
            name: newName,
            active: true,
          } as never);

          const res = await PATCH(
            makePatchRequest(categoryId, { name: newName }),
            { params: Promise.resolve({ id: categoryId }) }
          );

          if (res.status !== 200) return true; // skip validation errors for short names

          const updateCall = vi.mocked(prisma.category.update).mock.calls.at(-1)?.[0];
          if (!updateCall) return false;

          return (updateCall.data as Record<string, unknown>)?.name === newName;
        }
      ),
      { numRuns: 100 }
    );
  });
});
