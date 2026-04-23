import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { listingFiltersSchema } from "@/lib/validations/listing";

// ---------------------------------------------------------------------------
// GET /api/v1/services
// List service listings with optional filters.
// Delegates to the same query logic as GET /api/v1/listings but forces
// type = "service" by default.
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const { searchParams } = new URL(request.url);
  const rawFilters = {
    categoryId: searchParams.get("categoryId") ?? undefined,
    veredaId: searchParams.get("veredaId") ?? undefined,
    minRating: searchParams.get("minRating") ?? undefined,
    available: searchParams.get("available") ?? undefined,
    // Services endpoint always filters by type=service; ignore any type param
    type: "service",
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
      type,
      ...(categoryId ? { categoryId } : {}),
      ...(veredaId ? { veredaId } : {}),
    };

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
    console.error("[GET /services] DB error:", err);
    return Errors.internal();
  }
}
