import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { Errors } from "@/lib/api/errors";
import { verifyPassword } from "@/lib/auth/password";

const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * POST /api/v1/admin/auth/login
 *
 * Autentica al administrador con credenciales de variables de entorno.
 * Emite un JWT firmado (HS256) en una cookie httpOnly para sesión stateless.
 *
 * Credenciales requeridas en .env:
 *   ADMIN_USERNAME=admin
 *   ADMIN_PASSWORD_HASH=<hash generado con: node scripts/gen-admin-hash.mjs <contraseña>>
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("JSON inválido");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return Errors.validation("Usuario y contraseña requeridos");

  const { username, password } = parsed.data;

  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH ?? "";

  if (!adminPasswordHash) {
    console.error("[admin/login] ADMIN_PASSWORD_HASH no está configurado");
    return Errors.internal("Configuración de administrador incompleta");
  }

  const usernameOk = username === adminUsername;
  const passwordOk = await verifyPassword(password, adminPasswordHash);

  // Validar ambos aunque uno falle (evitar timing attack por short-circuit)
  if (!usernameOk || !passwordOk) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Credenciales incorrectas",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 401 }
    );
  }

  // Emitir JWT firmado con NEXTAUTH_SECRET
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production"
  );

  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setAudience("admin-panel")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);

  const response = NextResponse.json(
    { data: { message: "Autenticado correctamente" } },
    { status: 200 }
  );

  response.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });

  return response;
}
