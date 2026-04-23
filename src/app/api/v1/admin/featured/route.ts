import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";

const featureListingSchema = z.object({
  listingId: z.string().uuid("listingId debe ser un UUID válido"),
});

const MAX_FEATURED = 5;

// ---------------------------------------------------------------------------
// POST /api/v1/admin/featured
// Feature a listing (max 5 at a time)
// Requirements: 11.3, 11.4
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminId = request.headers.get("X-Admin-ID");
  if (!adminId) {
    return Errors.unauthorized("Se requiere X-Admin-ID");
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

  const parsed = featureListingSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { listingId } = parsed.data;

  // Check current featured count
  let featuredCount: number;
  try {
    featuredCount = await prisma.listing.count({
      where: { communityId, isFeatured: true },
    });
  } catch (err) {
    console.error("[POST /admin/featured] DB error counting featured:", err);
    return Errors.internal();
  }

  if (featuredCount >= MAX_FEATURED) {
    return Errors.conflict(
      `Ya hay ${MAX_FEATURED} listings destacados. Elimina uno antes de agregar otro.`
    );
  }

  try {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: { isFeatured: true },
      select: { id: true, title: true, isFeatured: true },
    });

    return NextResponse.json({ data: { listing } }, { status: 201 });
  } catch (err) {
    console.error("[POST /admin/featured] DB error updating listing:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/admin/featured/:listingId
// Unfeature a listing
// Requirements: 11.4
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const adminId = request.headers.get("X-Admin-ID");
  if (!adminId) {
    return Errors.unauthorized("Se requiere X-Admin-ID");
  }

  // Extract listingId from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const listingId = pathParts[pathParts.length - 1];

  if (!listingId || listingId === "featured") {
    return Errors.validation("Se requiere listingId en la URL");
  }

  try {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: { isFeatured: false },
      select: { id: true, title: true, isFeatured: true },
    });

    return NextResponse.json({ data: { listing } }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /admin/featured] DB error:", err);
    return Errors.internal();
  }
}
