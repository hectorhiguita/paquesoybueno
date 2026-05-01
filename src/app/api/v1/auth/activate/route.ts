import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { validateActivationToken, consumeActivationToken } from "@/lib/activation-tokens";
import { hashPassword } from "@/lib/auth/password";
import { generateVerificationCode, storeVerificationCode } from "@/lib/verification";
import { sendVerificationSms } from "@/lib/sms";
import { storePendingActivation } from "@/lib/pending-activation";

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
 * Valida el token, prepara la contraseña y envía OTP por SMS.
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

  // Validar token (sin consumirlo aún)
  const entry = await validateActivationToken(token);
  if (!entry) {
    return Errors.validation("El enlace de activación es inválido o ya fue utilizado", "token");
  }

  let user: { id: string; phone: string; communityId: string } | null;
  try {
    user = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { id: true, phone: true, communityId: true },
    });
  } catch (err) {
    console.error("[activate] DB read error:", err);
    return Errors.internal();
  }

  if (!user) {
    return Errors.notFound("Usuario no encontrado");
  }

  const passwordHash = await hashPassword(password);

  const code = generateVerificationCode();
  await storeVerificationCode(user.phone, user.communityId, code);
  storePendingActivation(token, {
    userId: user.id,
    communityId: user.communityId,
    phone: user.phone,
    passwordHash,
  });

  const smsResult = await sendVerificationSms(user.phone, code);
  if (!smsResult.success) {
    console.error("[activate] SMS send failed:", smsResult.error);
    return NextResponse.json(
      {
        error: {
          code: "SMS_SEND_FAILED",
          message: "No fue posible enviar el código OTP por SMS. Intenta de nuevo.",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 502 }
    );
  }

  const maskedPhone = user.phone.length >= 4 ? `***${user.phone.slice(-4)}` : user.phone;

  return NextResponse.json(
    {
      data: {
        requiresOtp: true,
        maskedPhone,
        message: "Te enviamos un código OTP por SMS para completar la activación.",
      },
    },
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
