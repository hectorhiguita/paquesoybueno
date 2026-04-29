import { NextResponse } from "next/server";

/**
 * POST /api/v1/admin/auth/logout
 * Elimina la cookie de sesión del administrador.
 */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json(
    { data: { message: "Sesión cerrada correctamente" } },
    { status: 200 }
  );

  response.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
