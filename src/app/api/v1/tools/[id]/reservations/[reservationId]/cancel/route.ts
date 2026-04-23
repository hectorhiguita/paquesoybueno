import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// PATCH /api/v1/tools/:id/reservations/:reservationId/cancel
// Cancel a reservation.
// If cancellation is within 24 hours of startDate, record it in the member's
// profile history via verificationReason (appended note).
// Requirements: 8.7
// ---------------------------------------------------------------------------

const LATE_CANCELLATION_MARKER = "[CANCELACIÓN TARDÍA]";

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

  // Find the reservation — only the requester can cancel their own reservation
  let reservation: {
    id: string;
    status: string;
    requesterId: string;
    startDate: Date;
    communityId: string;
    toolListingId: string;
  } | null;

  try {
    reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, toolListingId, communityId },
      select: {
        id: true,
        status: true,
        requesterId: true,
        startDate: true,
        communityId: true,
        toolListingId: true,
      },
    });
  } catch (err) {
    console.error("[PATCH cancel] DB error fetching reservation:", err);
    return Errors.internal();
  }

  if (!reservation) {
    return Errors.notFound("Reserva no encontrada");
  }

  if (reservation.requesterId !== userId) {
    return Errors.forbidden("Solo el solicitante puede cancelar esta reserva");
  }

  if (reservation.status === "cancelled") {
    return Errors.validation("La reserva ya está cancelada", "status");
  }

  if (reservation.status === "completed") {
    return Errors.validation("No se puede cancelar una reserva completada", "status");
  }

  // Determine if this is a late cancellation (< 24 hours before startDate)
  const now = new Date();
  const hoursUntilStart =
    (reservation.startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLateCancellation = hoursUntilStart < 24;

  try {
    // Cancel the reservation
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "cancelled", respondedAt: now },
    });

    // Record late cancellation in member's profile history (Req 8.7)
    if (isLateCancellation) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { verificationReason: true },
        });

        const existingReason = user?.verificationReason ?? "";
        const lateCancelEntry = `${LATE_CANCELLATION_MARKER} Reserva ${reservationId} cancelada el ${now.toISOString()} (menos de 24h antes del inicio)`;
        const updatedReason = existingReason
          ? `${existingReason}\n${lateCancelEntry}`
          : lateCancelEntry;

        await prisma.user.update({
          where: { id: userId },
          data: { verificationReason: updatedReason },
        });
      } catch (profileErr) {
        // Non-fatal: log but don't fail the cancellation
        console.error("[PATCH cancel] Failed to record late cancellation in profile:", profileErr);
      }
    }

    return NextResponse.json(
      {
        data: {
          reservation: updated,
          lateCancellation: isLateCancellation,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH cancel] DB error:", err);
    return Errors.internal();
  }
}
