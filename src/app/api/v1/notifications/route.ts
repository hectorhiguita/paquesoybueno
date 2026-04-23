import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// GET /api/v1/notifications
// Returns notifications for the authenticated user, ordered by createdAt desc
// Query params: read (boolean, optional) — filter by read status
// Requirements: 7.1, 7.2, 7.3, 7.5
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.headers.get("X-User-ID");
  if (!userId) {
    return Errors.unauthorized("Se requiere autenticación para ver notificaciones");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const { searchParams } = new URL(request.url);
  const readParam = searchParams.get("read");

  // Parse optional `read` filter
  let readFilter: boolean | undefined;
  if (readParam !== null) {
    if (readParam === "true") readFilter = true;
    else if (readParam === "false") readFilter = false;
    else {
      return Errors.validation("El parámetro read debe ser 'true' o 'false'", "read");
    }
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        communityId,
        ...(readFilter !== undefined ? { read: readFilter } : {}),
        // Only return non-expired notifications
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

    // Guarantee descending order by createdAt (most recent first) — Req 7.5
    const sorted = notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(
      { data: { notifications: sorted, total: sorted.length } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /notifications] DB error:", err);
    return Errors.internal();
  }
}
