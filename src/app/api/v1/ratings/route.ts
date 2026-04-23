import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { createRatingSchema } from "@/lib/validations/rating";

// ---------------------------------------------------------------------------
// GET /api/v1/ratings?providerId=<uuid>
// Returns all ratings for a provider with computed avgRating
// Requirements: 4.2
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");

  if (!providerId) {
    return Errors.validation("El parámetro providerId es requerido", "providerId");
  }

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(providerId)) {
    return Errors.validation("ID de proveedor inválido", "providerId");
  }

  try {
    const ratings = await prisma.rating.findMany({
      where: { communityId, providerId },
      select: {
        id: true,
        stars: true,
        comment: true,
        createdAt: true,
        rater: { select: { id: true, name: true } },
        listing: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate avgRating: arithmetic mean rounded to one decimal (Req 4.2)
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length) * 10) / 10
        : null;

    return NextResponse.json(
      { data: { ratings, avgRating, total: ratings.length } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /ratings] DB error:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ratings
// Creates a new rating with deduplication check
// Requirements: 4.1, 4.2, 4.3, 4.6, 4.7
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const raterId = request.headers.get("X-User-ID");
  if (!raterId) {
    return Errors.unauthorized("Se requiere autenticación para calificar");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  // Inject communityId from header
  const bodyWithCommunity = { ...(body as Record<string, unknown>), communityId };

  const parsed = createRatingSchema.safeParse(bodyWithCommunity);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const data = parsed.data;

  // Prevent self-rating
  if (raterId === data.providerId) {
    return Errors.validation("No puedes calificarte a ti mismo", "providerId");
  }

  // Deduplication: reject if same rater rated same provider within 30 days (Req 4.6)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const existing = await prisma.rating.findFirst({
      where: {
        raterId,
        providerId: data.providerId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    if (existing) {
      return Errors.conflict("Ya calificaste a este proveedor en los últimos 30 días");
    }
  } catch (err) {
    console.error("[POST /ratings] DB error checking duplicate:", err);
    return Errors.internal();
  }

  // Create the rating
  try {
    const rating = await prisma.rating.create({
      data: {
        communityId: data.communityId,
        raterId,
        providerId: data.providerId,
        listingId: data.listingId ?? null,
        stars: data.stars,
        comment: data.comment ?? null,
      },
      select: {
        id: true,
        stars: true,
        comment: true,
        createdAt: true,
        rater: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: { rating } }, { status: 201 });
  } catch (err) {
    console.error("[POST /ratings] DB error:", err);
    return Errors.internal();
  }
}
