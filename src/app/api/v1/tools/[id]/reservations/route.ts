import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const createReservationSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate debe ser una fecha ISO (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate debe ser una fecha ISO (YYYY-MM-DD)"),
});

// ---------------------------------------------------------------------------
// POST /api/v1/tools/:id/reservations
// Create a reservation request for a tool
// Requirements: 8.3, 8.4
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requesterId = request.headers.get("X-User-ID");
  if (!requesterId) {
    return Errors.unauthorized("Se requiere autenticación para reservar una herramienta");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const { id: toolListingId } = params;
  if (!toolListingId || !/^[0-9a-f-]{36}$/i.test(toolListingId)) {
    return Errors.validation("ID de herramienta inválido", "id");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { startDate: startDateStr, endDate: endDateStr } = parsed.data;
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (endDate < startDate) {
    return Errors.validation("endDate debe ser igual o posterior a startDate", "endDate");
  }

  // Verify the tool listing exists and belongs to this community
  let toolListing: { id: string; authorId: string } | null;
  try {
    toolListing = await prisma.listing.findFirst({
      where: { id: toolListingId, communityId, type: "tool", status: "active" },
      select: { id: true, authorId: true },
    });
  } catch (err) {
    console.error("[POST /tools/:id/reservations] DB error fetching tool:", err);
    return Errors.internal();
  }

  if (!toolListing) {
    return Errors.notFound("Herramienta no encontrada");
  }

  // Prevent owner from reserving their own tool
  if (toolListing.authorId === requesterId) {
    return Errors.forbidden("No puedes reservar tu propia herramienta");
  }

  // Check for date conflicts: reject if any pending/confirmed reservation overlaps
  // Overlap condition: existing.startDate <= endDate AND existing.endDate >= startDate
  try {
    const conflict = await prisma.reservation.findFirst({
      where: {
        toolListingId,
        status: { in: ["pending", "confirmed"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (conflict) {
      return Errors.conflict(
        "Las fechas solicitadas se superponen con una reserva existente"
      );
    }
  } catch (err) {
    console.error("[POST /tools/:id/reservations] DB error checking conflicts:", err);
    return Errors.internal();
  }

  // Create reservation with status='pending'
  try {
    const reservation = await prisma.reservation.create({
      data: {
        communityId,
        toolListingId,
        requesterId,
        startDate,
        endDate,
        status: "pending",
      },
    });

    // Notify the tool owner (create in-app notification)
    try {
      await prisma.notification.create({
        data: {
          communityId,
          userId: toolListing.authorId,
          type: "reservation_request",
          payload: {
            reservationId: reservation.id,
            toolListingId,
            requesterId,
            startDate: startDateStr,
            endDate: endDateStr,
          },
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (notifErr) {
      // Notification failure is non-fatal — degrade gracefully
      console.error("[POST /tools/:id/reservations] Failed to create notification:", notifErr);
    }

    return NextResponse.json({ data: { reservation } }, { status: 201 });
  } catch (err) {
    console.error("[POST /tools/:id/reservations] DB error creating reservation:", err);
    return Errors.internal();
  }
}
