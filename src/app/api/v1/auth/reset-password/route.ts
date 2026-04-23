import { NextRequest, NextResponse } from "next/server";
import { resetPasswordRequestSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { generateResetToken, validateResetToken } from "@/lib/reset-tokens";
import { sendEmail } from "@/lib/email";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

/**
 * POST /api/v1/auth/reset-password
 *
 * Requests a password reset link. Always returns 200 to avoid email enumeration.
 *
 * Requirements: 1.9
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = resetPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(
      firstIssue.message,
      firstIssue.path[0] as string | undefined
    );
  }

  const { email, communityId } = parsed.data;

  try {
    const user = await prisma.user.findFirst({
      where: { email, communityId },
      select: { id: true, email: true },
    });

    if (user) {
      const token = generateResetToken(email, communityId);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: email,
        subject: "Restablece tu contraseña — Santa Elena Platform",
        text: [
          "Hola,",
          "",
          "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
          "",
          `Haz clic en el siguiente enlace para restablecer tu contraseña (válido por 30 minutos):`,
          resetLink,
          "",
          "Si no solicitaste este cambio, puedes ignorar este correo.",
          "",
          "— Equipo Santa Elena Platform",
        ].join("\n"),
        html: `
          <p>Hola,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p><a href="${resetLink}">Restablecer contraseña</a> (válido por 30 minutos)</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p>— Equipo Santa Elena Platform</p>
        `,
      });
    }
  } catch (err) {
    console.error("[reset-password POST] error:", err);
    // Still return 200 to avoid leaking information
  }

  return NextResponse.json(
    {
      data: {
        message:
          "Si el correo está registrado, recibirás un enlace de restablecimiento.",
      },
    },
    { status: 200 }
  );
}

/**
 * PUT /api/v1/auth/reset-password
 *
 * Confirms a password reset using the token from the email link.
 *
 * Requirements: 1.9
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(
      firstIssue.message,
      firstIssue.path[0] as string | undefined
    );
  }

  const { token, password } = parsed.data;

  // Validate and consume the token
  const tokenData = validateResetToken(token);
  if (!tokenData) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TOKEN",
          message: "Token inválido o expirado",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 400 }
    );
  }

  const { email, communityId } = tokenData;

  // Find user
  let user: { id: string } | null;
  try {
    user = await prisma.user.findFirst({
      where: { email, communityId },
      select: { id: true },
    });
  } catch (err) {
    console.error("[reset-password PUT] DB findFirst error:", err);
    return Errors.internal();
  }

  if (!user) {
    return Errors.notFound("Usuario no encontrado");
  }

  // Hash new password and update
  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (err) {
    console.error("[reset-password PUT] hashPassword error:", err);
    return Errors.internal();
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  } catch (err) {
    console.error("[reset-password PUT] DB update error:", err);
    return Errors.internal();
  }

  return NextResponse.json(
    { data: { message: "Contraseña actualizada exitosamente" } },
    { status: 200 }
  );
}
