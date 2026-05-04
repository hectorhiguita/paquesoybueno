import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { validateActivationToken, consumeActivationToken } from "@/lib/activation-tokens";
import { hashPassword } from "@/lib/auth/password";

const activateSchema = z.object({
  token:           z.string().min(64, "Token inválido"),
  password:        z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

/**
 * POST /api/v1/auth/activate
 * Valida el token, establece la contraseña y activa la cuenta directamente.
 * El token de activación prueba la propiedad del correo — no se requiere OTP adicional.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { token, password } = parsed.data;

  const entry = await validateActivationToken(token);
  if (!entry) {
    return Errors.validation("El enlace de activación es inválido o ya fue utilizado", "token");
  }

  let user: { id: string } | null;
  try {
    user = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { id: true },
    });
  } catch (err) {
    console.error("[activate POST] DB read error:", err);
    return Errors.internal();
  }

  if (!user) {
    return Errors.notFound("Usuario no encontrado");
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (err) {
    console.error("[activate POST] hashPassword error:", err);
    return Errors.internal();
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        phoneVerified: true,
        status: "active",
        verifiedAt: new Date(),
      },
      select: { id: true },
    });
  } catch (err) {
    console.error("[activate POST] DB update error:", err);
    return Errors.internal();
  }

  // Consume the token so it can't be reused
  await consumeActivationToken(token);

  return NextResponse.json(
    { data: { message: "Cuenta activada exitosamente. Ya puedes iniciar sesión." } },
    { status: 200 }
  );
}

/**
 * GET /api/v1/auth/activate?token=...
 * Verifica si el token es válido (para mostrar el formulario en el frontend).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return Errors.validation("Token requerido", "token");

  const entry = await validateActivationToken(token);
  if (!entry) {
    return NextResponse.json(
      { valid: false, message: "El enlace es inválido o ya fue utilizado" },
      { status: 400 }
    );
  }

  return NextResponse.json({ valid: true, email: entry.email });
}
