import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/members/:id/suspend
// Suspend a member: blocks login and hides all their active listings
// Requirements: 9.3, 9.6
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const adminId = request.headers.get("X-Admin-ID");
  if (!adminId) {
    return Errors.unauthorized("Se requiere X-Admin-ID");
  }

  // Check member exists
  let existing: { id: string } | null;
  try {
    existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
  } catch (err) {
    console.error("[PATCH /admin/members/:id/suspend] DB error:", err);
    return Errors.internal();
  }

  if (!existing) {
    return Errors.notFound("Miembro no encontrado");
  }

  try {
    // Suspend user (blocks login) and hide all active listings simultaneously
    const [user] = await Promise.all([
      prisma.user.update({
        where: { id },
        data: { status: "suspended" },
        select: { id: true, name: true, email: true, status: true },
      }),
      prisma.listing.updateMany({
        where: { authorId: id, status: "active" },
        data: { status: "inactive" },
      }),
    ]);

    return NextResponse.json({ data: { member: user } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /admin/members/:id/suspend] DB update error:", err);
    return Errors.internal();
  }
}
