import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { updateListingSchema } from "@/lib/validations/listing";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/v1/listings/:id
// Get listing detail with author info, category, vereda, avg rating, completedJobs
// Requirements: 2.7
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            phone: true,
            isVerifiedProvider: true,
            verifiedAt: true,
          },
        },
        category: { select: { id: true, name: true, icon: true } },
        vereda: { select: { id: true, name: true } },
        images: { select: { id: true, url: true, order: true }, orderBy: { order: "asc" } },
        _count: { select: { ratings: true } },
        ratings: { select: { stars: true } },
      },
    });

    if (!listing) {
      return Errors.notFound("Listing no encontrado");
    }

    // Calculate average rating (Req 4.2)
    const avgRating =
      listing.ratings.length > 0
        ? Math.round(
            (listing.ratings.reduce((sum, r) => sum + r.stars, 0) /
              listing.ratings.length) *
              10
          ) / 10
        : null;

    // Build response — exclude exact coordinates (Req 6.1)
    const { ratings, ...listingData } = listing;
    // Explicitly strip coordinate fields from vereda to prevent leaking location data
    const { latApprox: _lat, lngApprox: _lng, ...veredaSafe } =
      (listingData.vereda ?? {}) as Record<string, unknown>;
    const response = {
      ...listingData,
      vereda: veredaSafe,
      avgRating,
      ratingsCount: ratings.length,
    };

    return NextResponse.json({ data: { listing: response } }, { status: 200 });
  } catch (err) {
    console.error("[GET /listings/:id] DB error:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/listings/:id
// Update listing (author only)
// Requirements: 3.1, 3.2, 3.3
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const authorId = request.headers.get("X-User-ID");
  if (!authorId) {
    return Errors.unauthorized("Se requiere autenticación");
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  // Validate
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  // Fetch existing listing to verify ownership
  let existing: { authorId: string } | null;
  try {
    existing = await prisma.listing.findUnique({
      where: { id },
      select: { authorId: true },
    });
  } catch (err) {
    console.error("[PATCH /listings/:id] DB error:", err);
    return Errors.internal();
  }

  if (!existing) {
    return Errors.notFound("Listing no encontrado");
  }

  if (existing.authorId !== authorId) {
    return Errors.forbidden("Solo el autor puede modificar este listing");
  }

  // Apply update
  try {
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
        ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
        ...(parsed.data.veredaId !== undefined ? { veredaId: parsed.data.veredaId } : {}),
        ...(parsed.data.priceCop !== undefined ? { priceCop: parsed.data.priceCop } : {}),
        ...(parsed.data.tradeDescription !== undefined
          ? { tradeDescription: parsed.data.tradeDescription }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      },
      include: {
        author: { select: { id: true, name: true, isVerifiedProvider: true } },
        category: { select: { id: true, name: true } },
        vereda: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: { listing: updated } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /listings/:id] DB error:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/listings/:id
// Soft delete — set status to inactive (author only)
// Requirements: 3.6
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const authorId = request.headers.get("X-User-ID");
  if (!authorId) {
    return Errors.unauthorized("Se requiere autenticación");
  }

  // Fetch existing listing to verify ownership
  let existing: { authorId: string; status: string } | null;
  try {
    existing = await prisma.listing.findUnique({
      where: { id },
      select: { authorId: true, status: true },
    });
  } catch (err) {
    console.error("[DELETE /listings/:id] DB error:", err);
    return Errors.internal();
  }

  if (!existing) {
    return Errors.notFound("Listing no encontrado");
  }

  if (existing.authorId !== authorId) {
    return Errors.forbidden("Solo el autor puede eliminar este listing");
  }

  // Soft delete
  try {
    await prisma.listing.update({
      where: { id },
      data: { status: "inactive" },
    });

    return NextResponse.json(
      { data: { message: "Listing eliminado correctamente" } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[DELETE /listings/:id] DB error:", err);
    return Errors.internal();
  }
}
