import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/members/:id/verify
// Grant Verified_Provider badge to a member
// Requirements: 4.5, 9.7
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

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const { reason } = (body ?? {}) as { reason?: unknown };

  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return Errors.validation(
      "El campo 'reason' es requerido y debe tener al menos 3 caracteres",
      "reason"
    );
  }

  // Check member exists
  let existing: { id: string } | null;
  try {
    existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
  } catch (err) {
    console.error("[PATCH /admin/members/:id/verify] DB error:", err);
    return Errors.internal();
  }

  if (!existing) {
    return Errors.notFound("Miembro no encontrado");
  }

  // Persist verification
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        isVerifiedProvider: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        verificationReason: reason.trim(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerifiedProvider: true,
        verifiedAt: true,
        verifiedBy: true,
        verificationReason: true,
      },
    });

    return NextResponse.json({ data: { member: updated } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /admin/members/:id/verify] DB update error:", err);
    return Errors.internal();
  }
}
