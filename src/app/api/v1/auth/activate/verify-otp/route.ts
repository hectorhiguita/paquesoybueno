import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { validateActivationToken, consumeActivationToken } from "@/lib/activation-tokens";
import { getPendingActivation, clearPendingActivation } from "@/lib/pending-activation";
import { verifyCode } from "@/lib/verification";

const verifyOtpSchema = z.object({
  token: z.string().min(64, "Token inválido"),
  code: z.string().length(6, "El código OTP debe tener 6 dígitos"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { token, code } = parsed.data;
  const entry = await validateActivationToken(token);
  if (!entry) {
    return Errors.validation("El enlace de activación es inválido o ya fue utilizado", "token");
  }

  const pending = getPendingActivation(token);
  if (!pending) {
    return Errors.validation("La activación OTP expiró. Vuelve a abrir el enlace e intenta de nuevo.");
  }

  const valid = verifyCode(pending.phone, pending.communityId, code);
  if (!valid) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CODE",
          message: "Código OTP inválido o expirado",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 400 }
    );
  }

  try {
    await prisma.user.update({
      where: { id: pending.userId },
      data: {
        passwordHash: pending.passwordHash,
        phoneVerified: true,
        status: "active",
        verifiedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[activate/verify-otp] DB error:", err);
    return Errors.internal();
  }

  await consumeActivationToken(token);
  clearPendingActivation(token);

  return NextResponse.json(
    { data: { message: "Cuenta activada. Ya puedes iniciar sesión." } },
    { status: 200 }
  );
}
