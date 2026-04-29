import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PATCH /api/v1/notifications/:id/read — marks a notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();
  const { userId, communityId } = context;

  const { id } = params;
  if (!UUID_RE.test(id)) return Errors.validation("ID de notificación inválido", "id");

  try {
    const existing = await prisma.notification.findFirst({
      where: { id, userId, communityId },
    });
    if (!existing) return Errors.notFound("Notificación no encontrada");

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
      select: { id: true, type: true, payload: true, read: true, createdAt: true, expiresAt: true },
    });

    return NextResponse.json({ data: { notification } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /notifications/:id/read] DB error:", err);
    return Errors.internal();
  }
}

// PATCH /api/v1/notifications/all/read — marks all as read
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();
  const { userId, communityId } = context;

  try {
    await prisma.notification.updateMany({
      where: { userId, communityId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  } catch (err) {
    console.error("[PUT /notifications/all/read] DB error:", err);
    return Errors.internal();
  }
}
