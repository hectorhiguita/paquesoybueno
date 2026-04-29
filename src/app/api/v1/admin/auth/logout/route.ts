import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin/session";

/**
 * POST /api/v1/admin/auth/logout
 * Elimina la cookie de sesión del administrador.
 */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json(
    { data: { message: "Sesión cerrada correctamente" } },
    { status: 200 }
  );

  clearAdminSessionCookie(response);

  return response;
}
