import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// POST /api/v1/tools/cleanup
// Cancel pending reservations that have not been responded to within 48 hours.
// Intended to be called by a cron job (e.g. Vercel Cron, Railway cron).
// Requirements: 8.5
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Protect with a shared secret so only the cron caller can trigger this
  const cronSecret = request.headers.get("X-Cron-Secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return Errors.unauthorized("Acceso no autorizado");
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

  try {
    // Find all pending reservations older than 48 hours
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "pending",
        requestedAt: { lt: cutoff },
      },
      select: {
        id: true,
        communityId: true,
        requesterId: true,
        toolListingId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (expiredReservations.length === 0) {
      return NextResponse.json(
        { data: { cancelled: 0, message: "No hay reservas pendientes expiradas" } },
        { status: 200 }
      );
    }

    const expiredIds = expiredReservations.map((r) => r.id);

    // Cancel all expired reservations in one query
    const { count } = await prisma.reservation.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "cancelled", respondedAt: new Date() },
    });

    // Notify each requester (non-fatal if it fails)
    const notificationPromises = expiredReservations.map((r) =>
      prisma.notification
        .create({
          data: {
            communityId: r.communityId,
            userId: r.requesterId,
            type: "reservation_expired",
            payload: {
              reservationId: r.id,
              toolListingId: r.toolListingId,
              startDate: r.startDate,
              endDate: r.endDate,
              reason: "El dueño no respondió en 48 horas",
            },
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        })
        .catch((err) =>
          console.error(`[cleanup] Failed to notify requester ${r.requesterId}:`, err)
        )
    );

    await Promise.allSettled(notificationPromises);

    return NextResponse.json(
      { data: { cancelled: count, message: `${count} reserva(s) cancelada(s) por timeout` } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /tools/cleanup] DB error:", err);
    return Errors.internal();
  }
}
