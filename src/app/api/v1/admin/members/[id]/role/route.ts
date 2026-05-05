import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireAdminSessionFromRequest } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) return Errors.unauthorized("Sesión de administrador requerida");

  let body: unknown;
  try { body = await request.json(); } catch {
    return Errors.validation("JSON inválido");
  }

  const { role } = (body ?? {}) as { role?: unknown };
  if (role !== "admin" && role !== "member") {
    return Errors.validation("El campo 'role' debe ser 'admin' o 'member'", "role");
  }

  let existing: { id: string; role: string } | null;
  try {
    existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
  } catch (err) {
    console.error("[PATCH /admin/members/:id/role] DB error:", err);
    return Errors.internal();
  }

  if (!existing) return Errors.notFound("Miembro no encontrado");
  if (existing.role === role) {
    return NextResponse.json({ data: { message: "El usuario ya tiene ese rol" } });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ data: { member: updated } });
  } catch (err) {
    console.error("[PATCH /admin/members/:id/role] DB update error:", err);
    return Errors.internal();
  }
}
