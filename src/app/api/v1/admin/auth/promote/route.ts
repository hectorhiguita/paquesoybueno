import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";
import { signAdminSession, setAdminSessionCookie } from "@/lib/admin/session";

/**
 * POST /api/v1/admin/auth/promote
 * Emite una cookie admin_session para usuarios con role=admin en la base de datos.
 * Permite acceder al panel admin sin conocer las credenciales de entorno.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();

  try {
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { role: true, status: true },
    });

    if (!user) return Errors.notFound("Usuario no encontrado");
    if (user.status !== "active") return Errors.forbidden("Cuenta inactiva");
    if (user.role !== "admin") return Errors.forbidden("No tienes permisos de administrador");

    const token = await signAdminSession();
    const response = NextResponse.json({ data: { message: "Sesión admin iniciada" } });
    setAdminSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error("[POST /admin/auth/promote]", err);
    return Errors.internal();
  }
}
