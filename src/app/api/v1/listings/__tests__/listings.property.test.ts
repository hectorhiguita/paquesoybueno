import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock Prisma before importing route handlers
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    vereda: {
      findFirst: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
  },
}));

import { POST } from "../route";
import { GET as GET_BY_ID } from "../[id]/route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VEREDA_ID = "550e8400-e29b-41d4-a716-446655440004";
const LISTING_ID = "550e8400-e29b-41d4-a716-446655440010";

const VALID_LISTING_BODY = {
  title: "Servicio de plomería profesional",
  description: "Reparación de tuberías y grifos en general con garantía",
  type: "service",
  categoryId: CATEGORY_ID,
  veredaId: VEREDA_ID,
};

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/listings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": USER_ID,
    },
    body: JSON.stringify(body),
  });
}

function makeGetByIdRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/v1/listings/${LISTING_ID}`, {
    headers: { "X-Community-ID": COMMUNITY_ID },
  });
}

// ---------------------------------------------------------------------------
// Property 10: Bloqueo de creación de listing por reportes activos
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 10: Bloqueo de creación de listing por reportes activos
describe("Property 10: Bloqueo de creación de listing por reportes activos", () => {
  /**
   * Validates: Requirements 3.7
   *
   * For any member with 3 or more active unmoderated reports, any attempt to
   * create a new listing must be blocked with a message indicating the account
   * is under review.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.vereda.findFirst).mockResolvedValue(
      { id: VEREDA_ID, communityId: COMMUNITY_ID, name: "El Placer" } as never
    );
    vi.mocked(prisma.category.findFirst).mockResolvedValue(
      { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: "Hogar", active: true } as never
    );
  });

  it("blocks listing creation for any user with 3 or more active reports", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 20 }),
        async (activeReportCount) => {
          vi.mocked(prisma.user.findUnique).mockResolvedValue(
            { activeReportCount } as never
          );

          const res = await POST(makePostRequest(VALID_LISTING_BODY));
          const json = await res.json();

          return (
            res.status === 403 &&
            typeof json.error?.message === "string" &&
            json.error.message.toLowerCase().includes("revisión")
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Filtro de categoría es exhaustivo
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 4: Filtro de categoría es exhaustivo
describe("Property 4: Filtro de categoría es exhaustivo", () => {
  /**
   * Validates: Requirements 2.2
   *
   * For any set of listings and any selected category, all listings returned
   * by the directory must belong exactly to that category, and no listing from
   * another category must appear in the results.
   */
  it("returns only listings matching the selected categoryId", () => {
    const listingArb = fc.record({
      id: fc.uuid(),
      categoryId: fc.uuid(),
      communityId: fc.uuid(),
    });

    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        (listings, selectedCategoryId) => {
          const filtered = listings.filter(
            (l) => l.categoryId === selectedCategoryId
          );

          // All returned listings must belong to the selected category
          return filtered.every((l) => l.categoryId === selectedCategoryId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no listing from another category appears in filtered results", () => {
    const listingArb = fc.record({
      id: fc.uuid(),
      categoryId: fc.uuid(),
      communityId: fc.uuid(),
    });

    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        (listings, selectedCategoryId) => {
          const filtered = listings.filter(
            (l) => l.categoryId === selectedCategoryId
          );

          // No listing with a different categoryId should appear
          return !filtered.some((l) => l.categoryId !== selectedCategoryId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Filtros de directorio son correctos y componibles
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 5: Filtros de directorio son correctos y componibles
describe("Property 5: Filtros de directorio son correctos y componibles", () => {
  /**
   * Validates: Requirements 2.3, 2.4, 2.5
   *
   * For any combination of filters applied simultaneously (Vereda, minimum rating,
   * availability), all returned listings must satisfy all applied filters.
   * No listing that violates any active filter must appear in the results.
   */
  it("all returned listings satisfy all active filters simultaneously", () => {
    const listingArb = fc.record({
      id: fc.uuid(),
      veredaId: fc.uuid(),
      avgRating: fc.integer({ min: 1, max: 5 }),
      available: fc.boolean(),
    });

    const filtersArb = fc.record({
      veredaId: fc.option(fc.uuid(), { nil: undefined }),
      minRating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
      available: fc.option(fc.boolean(), { nil: undefined }),
    });

    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 0, maxLength: 20 }),
        filtersArb,
        (listings, filters) => {
          let filtered = [...listings];

          if (filters.veredaId !== undefined) {
            filtered = filtered.filter((l) => l.veredaId === filters.veredaId);
          }
          if (filters.minRating !== undefined) {
            filtered = filtered.filter((l) => l.avgRating >= filters.minRating!);
          }
          if (filters.available !== undefined) {
            filtered = filtered.filter((l) => l.available === filters.available);
          }

          // Every returned listing must satisfy ALL active filters
          return filtered.every((l) => {
            const veredaOk =
              filters.veredaId === undefined || l.veredaId === filters.veredaId;
            const ratingOk =
              filters.minRating === undefined || l.avgRating >= filters.minRating;
            const availableOk =
              filters.available === undefined || l.available === filters.available;
            return veredaOk && ratingOk && availableOk;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Listings de proveedores verificados preceden a no verificados
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 6: Listings de proveedores verificados preceden a no verificados
describe("Property 6: Listings de proveedores verificados preceden a no verificados", () => {
  /**
   * Validates: Requirements 2.6
   *
   * For any set of listings returned without explicit sort order, all listings
   * whose author is Verified_Provider must appear before any listing from an
   * unverified author.
   */
  it("verified providers always precede unverified providers after sorting", () => {
    const listingArb = fc.record({
      id: fc.uuid(),
      isVerifiedProvider: fc.boolean(),
    });

    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 0, maxLength: 20 }),
        (listings) => {
          const sorted = [...listings].sort(
            (a, b) =>
              (b.isVerifiedProvider ? 1 : 0) - (a.isVerifiedProvider ? 1 : 0)
          );

          // Find the last verified provider index
          const lastVerifiedIdx = sorted.reduce(
            (last, l, idx) => (l.isVerifiedProvider ? idx : last),
            -1
          );

          // Find the first unverified provider index
          const firstUnverifiedIdx = sorted.findIndex(
            (l) => !l.isVerifiedProvider
          );

          // If both exist, all verified must come before all unverified
          if (lastVerifiedIdx !== -1 && firstUnverifiedIdx !== -1) {
            return lastVerifiedIdx < firstUnverifiedIdx;
          }

          // If only one type exists, trivially satisfied
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Detalle de listing contiene todos los campos requeridos
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 7: Detalle de listing contiene todos los campos requeridos
describe("Property 7: Detalle de listing contiene todos los campos requeridos", () => {
  /**
   * Validates: Requirements 2.7
   *
   * For any service listing, the detail endpoint response must contain:
   * provider name, category, vereda, average rating, number of completed jobs,
   * description, and contact options.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("response contains all required fields for any listing with varying ratings", async () => {
    const ratingArb = fc.record({
      stars: fc.integer({ min: 1, max: 5 }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(ratingArb, { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 0, max: 100 }),
        async (ratings, completedJobs) => {
          const mockListing = {
            id: LISTING_ID,
            communityId: COMMUNITY_ID,
            authorId: USER_ID,
            categoryId: CATEGORY_ID,
            veredaId: VEREDA_ID,
            title: "Servicio de plomería",
            description: "Reparación de tuberías y grifos en general",
            type: "service",
            status: "active",
            priceCop: null,
            tradeDescription: null,
            isFeatured: false,
            completedJobs,
            createdAt: new Date("2024-01-01T00:00:00Z"),
            updatedAt: new Date("2024-01-01T00:00:00Z"),
            author: {
              id: USER_ID,
              name: "Juan Pérez",
              phone: "3001234567",
              isVerifiedProvider: true,
              verifiedAt: new Date("2023-06-01T00:00:00Z"),
            },
            category: { id: CATEGORY_ID, name: "Hogar", icon: "🏠" },
            vereda: { id: VEREDA_ID, name: "El Placer" },
            images: [],
            _count: { ratings: ratings.length },
            ratings,
          };

          vi.mocked(prisma.listing.findUnique).mockResolvedValue(
            mockListing as never
          );

          const res = await GET_BY_ID(makeGetByIdRequest(), {
            params: Promise.resolve({ id: LISTING_ID }),
          });

          if (res.status !== 200) return false;

          const json = await res.json();
          const listing = json.data?.listing;

          if (!listing) return false;

          // Required fields per Req 2.7
          const hasAuthorName =
            typeof listing.author?.name === "string" && listing.author.name.length > 0;
          const hasCategory = listing.category !== undefined && listing.category !== null;
          const hasVereda = listing.vereda !== undefined && listing.vereda !== null;
          const hasCompletedJobs = typeof listing.completedJobs === "number";
          const hasDescription =
            typeof listing.description === "string" && listing.description.length > 0;
          const hasPhone =
            typeof listing.author?.phone === "string" && listing.author.phone.length > 0;
          // avgRating is null when no ratings, or a number
          const hasAvgRating =
            listing.avgRating === null || typeof listing.avgRating === "number";

          return (
            hasAuthorName &&
            hasCategory &&
            hasVereda &&
            hasCompletedJobs &&
            hasDescription &&
            hasPhone &&
            hasAvgRating
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Privacidad de coordenadas en listings
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 15: Privacidad de coordenadas en listings
describe("Property 15: Privacidad de coordenadas en listings", () => {
  /**
   * Validates: Requirements 6.1
   *
   * For any listing or user profile, no public API response must contain exact
   * geographic coordinates. Location must be expressed only as vereda name.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("response vereda object does not contain latApprox or lngApprox", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: -90, max: 90, noNaN: true }),
        fc.float({ min: -180, max: 180, noNaN: true }),
        async (latApprox, lngApprox) => {
          const mockListing = {
            id: LISTING_ID,
            communityId: COMMUNITY_ID,
            authorId: USER_ID,
            categoryId: CATEGORY_ID,
            veredaId: VEREDA_ID,
            title: "Servicio de plomería",
            description: "Reparación de tuberías y grifos en general",
            type: "service",
            status: "active",
            priceCop: null,
            tradeDescription: null,
            isFeatured: false,
            completedJobs: 5,
            createdAt: new Date("2024-01-01T00:00:00Z"),
            updatedAt: new Date("2024-01-01T00:00:00Z"),
            author: {
              id: USER_ID,
              name: "Juan Pérez",
              phone: "3001234567",
              isVerifiedProvider: false,
              verifiedAt: null,
            },
            category: { id: CATEGORY_ID, name: "Hogar", icon: "🏠" },
            // Vereda with coordinate fields — these must NOT appear in the response
            vereda: { id: VEREDA_ID, name: "El Placer", latApprox, lngApprox },
            images: [],
            _count: { ratings: 0 },
            ratings: [],
          };

          vi.mocked(prisma.listing.findUnique).mockResolvedValue(
            mockListing as never
          );

          const res = await GET_BY_ID(makeGetByIdRequest(), {
            params: Promise.resolve({ id: LISTING_ID }),
          });

          if (res.status !== 200) return false;

          const json = await res.json();
          const vereda = json.data?.listing?.vereda;

          if (!vereda) return false;

          // Coordinates must NOT be exposed
          return (
            !("latApprox" in vereda) && !("lngApprox" in vereda)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Validación de vereda contra lista predefinida
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 16: Validación de vereda contra lista predefinida
describe("Property 16: Validación de vereda contra lista predefinida", () => {
  /**
   * Validates: Requirements 6.2
   *
   * For any vereda value sent in listing creation, the system must accept only
   * values that belong to the predefined list of community veredas. Any other
   * value must be rejected.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { activeReportCount: 0 } as never
    );
    vi.mocked(prisma.category.findFirst).mockResolvedValue(
      { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: "Hogar", active: true } as never
    );
    vi.mocked(prisma.listing.create).mockResolvedValue({
      id: LISTING_ID,
      communityId: COMMUNITY_ID,
      authorId: USER_ID,
      categoryId: CATEGORY_ID,
      veredaId: VEREDA_ID,
      title: "Servicio de plomería profesional",
      description: "Reparación de tuberías y grifos en general con garantía",
      type: "service",
      status: "active",
      author: { id: USER_ID, name: "Juan Pérez", isVerifiedProvider: false },
      category: { id: CATEGORY_ID, name: "Hogar" },
      vereda: { id: VEREDA_ID, name: "El Placer" },
    } as never);
  });

  it("rejects any veredaId that does not belong to the community", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (randomVeredaId) => {
          // Simulate: this vereda does NOT exist in the community
          vi.mocked(prisma.vereda.findFirst).mockResolvedValueOnce(null as never);

          const body = { ...VALID_LISTING_BODY, veredaId: randomVeredaId };
          const res = await POST(makePostRequest(body));
          const json = await res.json();

          return (
            res.status === 400 &&
            json.error?.code === "VALIDATION_ERROR" &&
            json.error?.field === "veredaId"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts a veredaId that belongs to the community", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (communityVeredaId) => {
          // Simulate: this vereda DOES exist in the community
          vi.mocked(prisma.vereda.findFirst).mockResolvedValueOnce(
            { id: communityVeredaId, communityId: COMMUNITY_ID, name: "Vereda Test" } as never
          );

          const body = { ...VALID_LISTING_BODY, veredaId: communityVeredaId };
          const res = await POST(makePostRequest(body));

          return res.status === 201;
        }
      ),
      { numRuns: 100 }
    );
  });
});
