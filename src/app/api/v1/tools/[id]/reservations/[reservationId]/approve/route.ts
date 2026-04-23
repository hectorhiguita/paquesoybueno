import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// PATCH /api/v1/tools/:id/reservations/:reservationId/approve
// Approve a pending reservation (tool owner only)
// Requirements: 8.4
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; reservationId: string } }
): Promise<NextResponse> {
  const userId = request.headers.get("X-User-ID");
  if (!userId) {
    return Errors.unauthorized("Se requiere autenticación");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const { id: toolListingId, reservationId } = params;

  // Verify the tool listing exists and the requester is the owner
  let toolListing: { id: string; authorId: string } | null;
  try {
    toolListing = await prisma.listing.findFirst({
      where: { id: toolListingId, communityId, type: "tool" },
      select: { id: true, authorId: true },
    });
  } catch (err) {
    console.error("[PATCH /tools/:id/reservations/:reservationId/approve] DB error:", err);
    return Errors.internal();
  }

  if (!toolListing) {
    return Errors.notFound("Herramienta no encontrada");
  }

  if (toolListing.authorId !== userId) {
    return Errors.forbidden("Solo el dueño de la herramienta puede aprobar reservas");
  }

  // Find the reservation
  let reservation: { id: string; status: string; requesterId: string } | null;
  try {
    reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, toolListingId, communityId },
      select: { id: true, status: true, requesterId: true },
    });
  } catch (err) {
    console.error("[PATCH approve] DB error fetching reservation:", err);
    return Errors.internal();
  }

  if (!reservation) {
    return Errors.notFound("Reserva no encontrada");
  }

  if (reservation.status !== "pending") {
    return Errors.validation(
      `No se puede aprobar una reserva con estado '${reservation.status}'`,
      "status"
    );
  }

  // Approve the reservation
  try {
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "confirmed", respondedAt: new Date() },
    });

    // Notify the requester
    try {
      await prisma.notification.create({
        data: {
          communityId,
          userId: reservation.requesterId,
          type: "reservation_confirmed",
          payload: { reservationId, toolListingId },
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (notifErr) {
      console.error("[PATCH approve] Failed to create notification:", notifErr);
    }

    return NextResponse.json({ data: { reservation: updated } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH approve] DB error updating reservation:", err);
    return Errors.internal();
  }
}
