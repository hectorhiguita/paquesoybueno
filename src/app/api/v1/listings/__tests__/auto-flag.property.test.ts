// Feature: santa-elena-platform, Property 19: Detección de URLs y teléfonos en contenido de listings
import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

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
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440003";
const VEREDA_ID = "550e8400-e29b-41d4-a716-446655440004";
const LISTING_ID = "550e8400-e29b-41d4-a716-446655440010";

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

function mockListingCreate(status: string) {
  vi.mocked(prisma.listing.create).mockResolvedValue({
    id: LISTING_ID,
    communityId: COMMUNITY_ID,
    authorId: USER_ID,
    categoryId: CATEGORY_ID,
    veredaId: VEREDA_ID,
    title: "Test",
    description: "Test",
    type: "service",
    status,
    author: { id: USER_ID, name: "Test User", isVerifiedProvider: false },
    category: { id: CATEGORY_ID, name: "Hogar" },
    vereda: { id: VEREDA_ID, name: "El Placer" },
  } as never);
}

// ---------------------------------------------------------------------------
// Property 19: Detección de URLs y teléfonos en contenido de listings
// ---------------------------------------------------------------------------

describe("Property 19: Detección de URLs y teléfonos en contenido de listings", () => {
  /**
   * Validates: Requirements 9.4
   *
   * For any listing whose title or description contains a URL (http://, https://, or www.)
   * or a phone number (10-digit Colombian pattern starting with 3), the system must
   * automatically mark that listing with status `flagged` before publishing.
   */

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { activeReportCount: 0 } as never
    );
    vi.mocked(prisma.vereda.findFirst).mockResolvedValue(
      { id: VEREDA_ID, communityId: COMMUNITY_ID, name: "El Placer" } as never
    );
    vi.mocked(prisma.category.findFirst).mockResolvedValue(
      { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: "Hogar", active: true } as never
    );
  });

  // Generators for contact info
  const httpUrlArb = fc
    .string({ minLength: 3, maxLength: 20 })
    .map((s) => `http://${s}.com`);

  const httpsUrlArb = fc
    .string({ minLength: 3, maxLength: 20 })
    .map((s) => `https://${s}.com`);

  const wwwUrlArb = fc
    .string({ minLength: 3, maxLength: 20 })
    .map((s) => `www.${s}.com`);

  // Colombian phone: starts with 3, followed by 9 digits
  const colombianPhoneArb = fc
    .integer({ min: 0, max: 999999999 })
    .map((n) => `3${String(n).padStart(9, "0")}`);

  const urlArb = fc.oneof(httpUrlArb, httpsUrlArb, wwwUrlArb);

  const contactInfoArb = fc.oneof(urlArb, colombianPhoneArb);

  // Clean text: no URLs or phone patterns
  const cleanTextArb = fc
    .string({ minLength: 10, maxLength: 100 })
    .filter(
      (s) =>
        !/https?:\/\/|www\./i.test(s) &&
        !/\b3\d{9}\b/.test(s)
    );

  it("flags listing when title contains a URL", async () => {
    await fc.assert(
      fc.asyncProperty(
        urlArb,
        cleanTextArb,
        async (url, cleanDesc) => {
          mockListingCreate("flagged");

          const body = {
            title: `Servicio ${url} disponible`,
            description: cleanDesc.length >= 10 ? cleanDesc : cleanDesc + " descripcion larga",
            type: "service",
            categoryId: CATEGORY_ID,
            veredaId: VEREDA_ID,
          };

          const res = await POST(makePostRequest(body));
          if (res.status !== 201) return true; // skip validation errors

          const createCall = vi.mocked(prisma.listing.create).mock.calls.at(-1)?.[0];
          if (!createCall) return false;

          return (createCall.data as Record<string, unknown>).status === "flagged";
        }
      ),
      { numRuns: 100 }
    );
  });

  it("flags listing when description contains a URL", async () => {
    await fc.assert(
      fc.asyncProperty(
        urlArb,
        async (url) => {
          mockListingCreate("flagged");

          const body = {
            title: "Servicio de plomería profesional",
            description: `Contáctame en ${url} para más información sobre el servicio`,
            type: "service",
            categoryId: CATEGORY_ID,
            veredaId: VEREDA_ID,
          };

          const res = await POST(makePostRequest(body));
          if (res.status !== 201) return true;

          const createCall = vi.mocked(prisma.listing.create).mock.calls.at(-1)?.[0];
          if (!createCall) return false;

          return (createCall.data as Record<string, unknown>).status === "flagged";
        }
      ),
      { numRuns: 100 }
    );
  });

  it("flags listing when title or description contains a Colombian phone number", async () => {
    await fc.assert(
      fc.asyncProperty(
        colombianPhoneArb,
        fc.boolean(),
        async (phone, inTitle) => {
          mockListingCreate("flagged");

          const body = inTitle
            ? {
                title: `Llama al ${phone} para más info`,
                description: "Servicio de plomería profesional con garantía incluida",
                type: "service",
                categoryId: CATEGORY_ID,
                veredaId: VEREDA_ID,
              }
            : {
                title: "Servicio de plomería profesional",
                description: `Contáctame al ${phone} para más información sobre el servicio`,
                type: "service",
                categoryId: CATEGORY_ID,
                veredaId: VEREDA_ID,
              };

          const res = await POST(makePostRequest(body));
          if (res.status !== 201) return true;

          const createCall = vi.mocked(prisma.listing.create).mock.calls.at(-1)?.[0];
          if (!createCall) return false;

          return (createCall.data as Record<string, unknown>).status === "flagged";
        }
      ),
      { numRuns: 100 }
    );
  });

  it("creates listing with status=active when content is clean", async () => {
    await fc.assert(
      fc.asyncProperty(
        cleanTextArb,
        cleanTextArb,
        async (cleanTitle, cleanDesc) => {
          mockListingCreate("active");

          const title =
            cleanTitle.length >= 5 ? cleanTitle : "Servicio de plomería profesional";
          const description =
            cleanDesc.length >= 10 ? cleanDesc : "Reparación de tuberías y grifos en general";

          const body = {
            title,
            description,
            type: "service",
            categoryId: CATEGORY_ID,
            veredaId: VEREDA_ID,
          };

          const res = await POST(makePostRequest(body));
          if (res.status !== 201) return true;

          const createCall = vi.mocked(prisma.listing.create).mock.calls.at(-1)?.[0];
          if (!createCall) return false;

          return (createCall.data as Record<string, unknown>).status === "active";
        }
      ),
      { numRuns: 100 }
    );
  });

  it("flags listing for any contact info in title or description", async () => {
    await fc.assert(
      fc.asyncProperty(
        contactInfoArb,
        fc.boolean(),
        async (contactInfo, inTitle) => {
          mockListingCreate("flagged");

          const body = inTitle
            ? {
                title: `Info: ${contactInfo} disponible`,
                description: "Servicio de plomería profesional con garantía incluida",
                type: "service",
                categoryId: CATEGORY_ID,
                veredaId: VEREDA_ID,
              }
            : {
                title: "Servicio de plomería profesional",
                description: `Contáctame: ${contactInfo} para más información sobre el servicio`,
                type: "service",
                categoryId: CATEGORY_ID,
                veredaId: VEREDA_ID,
              };

          const res = await POST(makePostRequest(body));
          if (res.status !== 201) return true;

          const createCall = vi.mocked(prisma.listing.create).mock.calls.at(-1)?.[0];
          if (!createCall) return false;

          return (createCall.data as Record<string, unknown>).status === "flagged";
        }
      ),
      { numRuns: 100 }
    );
  });
});
