import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { createListingSchema, listingFiltersSchema } from "@/lib/validations/listing";

// Patterns for auto-flagging (Req 9.4)
const URL_PATTERN = /https?:\/\/|www\./i;
const PHONE_PATTERN = /\b3\d{9}\b/;

function containsContactInfo(text: string): boolean {
  return URL_PATTERN.test(text) || PHONE_PATTERN.test(text);
}

// ---------------------------------------------------------------------------
// GET /api/v1/listings
// List listings with optional filters
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const rawFilters = {
    categoryId: searchParams.get("categoryId") ?? undefined,
    veredaId: searchParams.get("veredaId") ?? undefined,
    minRating: searchParams.get("minRating") ?? undefined,
    available: searchParams.get("available") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = listingFiltersSchema.safeParse(rawFilters);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { categoryId, veredaId, minRating, type, status, page, limit } = parsed.data;

  // Default to active listings only
  const statusFilter = status ?? "active";

  try {
    const where: Record<string, unknown> = {
      communityId,
      status: statusFilter,
      ...(categoryId ? { categoryId } : {}),
      ...(veredaId ? { veredaId } : {}),
      ...(type ? { type } : {}),
    };

    // When minRating is set we need ratings to post-filter; always include them
    // so avgRating can be computed and exposed in the list response.
    const [rawListings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              isVerifiedProvider: true,
              phone: true,
            },
          },
          category: { select: { id: true, name: true, icon: true } },
          vereda: { select: { id: true, name: true } },
          _count: { select: { ratings: true } },
          ratings: { select: { stars: true } },
        },
        orderBy: [
          // Verified providers first (Req 2.6)
          { author: { isVerifiedProvider: "desc" } },
          { createdAt: "desc" },
        ],
        // Note: when minRating is active we fetch all and post-filter.
        // For large datasets a raw SQL HAVING clause would be more efficient,
        // but Prisma findMany does not support HAVING on aggregates.
        ...(minRating === undefined ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
      prisma.listing.count({ where }),
    ]);

    // Compute avgRating and apply minRating post-filter (Req 2.4)
    type RawListing = (typeof rawListings)[number];
    const withAvg = rawListings.map((l: RawListing) => {
      const { ratings, ...rest } = l as RawListing & { ratings: { stars: number }[] };
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10
          : null;
      return { ...rest, avgRating };
    });

    const listings =
      minRating !== undefined
        ? withAvg
            .filter((l) => l.avgRating !== null && l.avgRating >= minRating)
            .slice((page - 1) * limit, page * limit)
        : withAvg;

    // When minRating is active the total count reflects post-filtered results
    const filteredTotal =
      minRating !== undefined
        ? withAvg.filter((l) => l.avgRating !== null && l.avgRating >= minRating).length
        : total;

    return NextResponse.json(
      {
        data: {
          listings,
          pagination: {
            page,
            limit,
            total: filteredTotal,
            pages: Math.ceil(filteredTotal / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /listings] DB error:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/listings
// Create a new listing
// Requirements: 3.1, 3.2, 3.3, 3.7, 9.4
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth: extract user from session or X-User-ID header (stub for testing)
  const authorId = request.headers.get("X-User-ID");
  if (!authorId) {
    return Errors.unauthorized("Se requiere autenticación para crear un listing");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  // Inject communityId from header if not in body
  const bodyWithCommunity = { ...(body as Record<string, unknown>), communityId };

  // Validate
  const parsed = createListingSchema.safeParse(bodyWithCommunity);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const data = parsed.data;

  // Check active report count (Req 3.7): block if ≥3 active unmoderated reports
  let user: { activeReportCount: number } | null;
  try {
    user = await prisma.user.findUnique({
      where: { id: authorId },
      select: { activeReportCount: true },
    });
  } catch (err) {
    console.error("[POST /listings] DB error fetching user:", err);
    return Errors.internal();
  }

  if (!user) {
    return Errors.notFound("Usuario no encontrado");
  }

  if (user.activeReportCount >= 3) {
    return Errors.forbidden(
      "Tu cuenta está bajo revisión. No puedes crear nuevos listings en este momento."
    );
  }

  // Validate veredaId belongs to this community (Req 6.2)
  try {
    const vereda = await prisma.vereda.findFirst({
      where: { id: data.veredaId, communityId: data.communityId },
    });
    if (!vereda) {
      return Errors.validation(
        "La vereda seleccionada no pertenece a esta comunidad",
        "veredaId"
      );
    }
  } catch (err) {
    console.error("[POST /listings] DB error validating vereda:", err);
    return Errors.internal();
  }

  // Validate categoryId belongs to this community and is active (Req 6.2)
  try {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, communityId: data.communityId, active: true },
    });
    if (!category) {
      return Errors.validation(
        "La categoría seleccionada no pertenece a esta comunidad o no está activa",
        "categoryId"
      );
    }
  } catch (err) {
    console.error("[POST /listings] DB error validating category:", err);
    return Errors.internal();
  }

  // Auto-detect URLs/phones → flag status (Req 9.4 preview)
  const hasContactInfo =
    containsContactInfo(data.title) || containsContactInfo(data.description);
  const status = hasContactInfo ? "flagged" : "active";

  // Create listing
  try {
    const listing = await prisma.listing.create({
      data: {
        communityId: data.communityId,
        authorId,
        categoryId: data.categoryId,
        veredaId: data.veredaId,
        title: data.title,
        description: data.description,
        type: data.type,
        status,
        priceCop: data.priceCop ?? null,
        tradeDescription: data.tradeDescription ?? null,
      },
      include: {
        author: { select: { id: true, name: true, isVerifiedProvider: true } },
        category: { select: { id: true, name: true } },
        vereda: { select: { id: true, name: true } },
      },
    });

    const responseBody: Record<string, unknown> = { data: { listing } };
    if (hasContactInfo) {
      responseBody.warning =
        "Tu listing está pendiente de revisión porque contiene URLs o números de teléfono.";
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    console.error("[POST /listings] DB error:", err);
    return Errors.internal();
  }
}
