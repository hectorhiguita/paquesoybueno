import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";

// GET /api/v1/notifications — returns notifications for the authenticated user
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) {
    return error ?? Errors.unauthorized("Se requiere autenticación para ver notificaciones");
  }
  const { userId, communityId } = context;

  const { searchParams } = new URL(request.url);
  const readParam = searchParams.get("read");

  let readFilter: boolean | undefined;
  if (readParam === "true") readFilter = true;
  else if (readParam === "false") readFilter = false;
  else if (readParam !== null) {
    return Errors.validation("El parámetro read debe ser 'true' o 'false'", "read");
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        communityId,
        ...(readFilter !== undefined ? { read: readFilter } : {}),
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        type: true,
        payload: true,
        read: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { data: { notifications, total: notifications.length } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /notifications] DB error:", err);
    return Errors.internal();
  }
}
