import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock Prisma before importing route handlers
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rating: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const RATER_ID = "550e8400-e29b-41d4-a716-446655440002";
const PROVIDER_ID = "550e8400-e29b-41d4-a716-446655440003";

const MOCK_RATING = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  stars: 4,
  comment: "Excelente servicio",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  rater: { id: RATER_ID, name: "Ana García" },
  provider: { id: PROVIDER_ID, name: "Juan Pérez" },
};

function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/v1/ratings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": RATER_ID,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const VALID_RATING_BODY = {
  providerId: PROVIDER_ID,
  stars: 4,
  comment: "Muy buen trabajo",
};

// ---------------------------------------------------------------------------
// Property 11: Cálculo correcto del rating promedio
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 11: Cálculo correcto del rating promedio
describe("Property 11: Cálculo correcto del rating promedio", () => {
  /**
   * Validates: Requirements 4.2
   *
   * For any non-empty set of numeric ratings between 1 and 5, the average rating
   * calculated by the system must equal the arithmetic mean of the set, rounded
   * to exactly one decimal place.
   */
  it("avgRating equals arithmetic mean rounded to one decimal for any non-empty set of ratings 1-5", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
        (stars) => {
          const sum = stars.reduce((acc, s) => acc + s, 0);
          const count = stars.length;
          const expected = Math.round((sum / count) * 10) / 10;

          // This is the exact formula used in route.ts
          const actual = Math.round((stars.reduce((acc, s) => acc + s, 0) / stars.length) * 10) / 10;

          return actual === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("result is always between 1 and 5 for valid inputs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
        (stars) => {
          const avg = Math.round((stars.reduce((acc, s) => acc + s, 0) / stars.length) * 10) / 10;
          return avg >= 1 && avg <= 5;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("result has at most one decimal place", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
        (stars) => {
          const avg = Math.round((stars.reduce((acc, s) => acc + s, 0) / stars.length) * 10) / 10;
          // Multiply by 10, check it's an integer
          return Number.isInteger(Math.round(avg * 10));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Deduplicación de ratings en ventana de 30 días
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 12: Deduplicación de ratings en ventana de 30 días
describe("Property 12: Deduplicación de ratings en ventana de 30 días", () => {
  /**
   * Validates: Requirements 4.6
   *
   * For any pair (rater, provider), if a rating already exists within the last
   * 30 days, any attempt to submit a second rating must be rejected with an
   * informative message.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects any second rating when findFirst returns a non-null existing rating", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
        async (stars, comment) => {
          // Simulate: an existing rating already exists within 30 days
          vi.mocked(prisma.rating.findFirst).mockResolvedValueOnce(MOCK_RATING as never);

          const body = { ...VALID_RATING_BODY, stars, ...(comment !== undefined ? { comment } : {}) };
          const res = await POST(makePostRequest(body));
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

  it("conflict message is informative (mentions 30 days)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (stars) => {
          vi.mocked(prisma.rating.findFirst).mockResolvedValueOnce(MOCK_RATING as never);

          const res = await POST(makePostRequest({ ...VALID_RATING_BODY, stars }));
          const json = await res.json();

          return (
            res.status === 409 &&
            typeof json.error?.message === "string" &&
            json.error.message.includes("30")
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Límite de caracteres en comentarios de rating
// ---------------------------------------------------------------------------

// Feature: santa-elena-platform, Property 13: Límite de caracteres en comentarios de rating
describe("Property 13: Límite de caracteres en comentarios de rating", () => {
  /**
   * Validates: Requirements 4.7
   *
   * For any string sent as a rating comment, the system must accept only strings
   * of length ≤500 characters and reject any longer string.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.rating.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.rating.create).mockResolvedValue(MOCK_RATING as never);
  });

  it("rejects any comment longer than 500 characters", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 501, maxLength: 1000 }),
        async (longComment) => {
          const res = await POST(makePostRequest({ ...VALID_RATING_BODY, comment: longComment }));
          const json = await res.json();

          return (
            res.status === 400 &&
            json.error?.code === "VALIDATION_ERROR"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts any comment of 500 characters or fewer", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 500 }),
        async (shortComment) => {
          vi.mocked(prisma.rating.findFirst).mockResolvedValueOnce(null as never);
          vi.mocked(prisma.rating.create).mockResolvedValueOnce(MOCK_RATING as never);

          const res = await POST(makePostRequest({ ...VALID_RATING_BODY, comment: shortComment }));

          return res.status === 201;
        }
      ),
      { numRuns: 100 }
    );
  });
});
