import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/:id/read
// Marks a notification as read for the authenticated user
// Requirements: 7.4, 7.6
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.headers.get("X-User-ID");
  if (!userId) {
    return Errors.unauthorized("Se requiere autenticación para marcar notificaciones");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const { id } = params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Errors.validation("ID de notificación inválido", "id");
  }

  try {
    // Verify notification exists and belongs to this user/community
    const existing = await prisma.notification.findFirst({
      where: { id, userId, communityId },
    });

    if (!existing) {
      return Errors.notFound("Notificación no encontrada");
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
      select: {
        id: true,
        type: true,
        payload: true,
        read: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ data: { notification } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /notifications/:id/read] DB error:", err);
    return Errors.internal();
  }
}
