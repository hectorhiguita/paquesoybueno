import { NextRequest, NextResponse } from "next/server";
import { verifyCodeSchema } from "@/lib/validations/auth";
import { verifyCode } from "@/lib/verification";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

/**
 * POST /api/v1/auth/verify
 *
 * Verifies the 6-digit SMS code and activates the Member's account.
 *
 * Requirements: 1.3
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  // --- Validate input ---
  const parsed = verifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(
      firstIssue.message,
      firstIssue.path[0] as string | undefined
    );
  }

  const { phone, code, communityId } = parsed.data;

  // --- Find user ---
  let user: { id: string; phoneVerified: boolean } | null;
  try {
    user = await prisma.user.findFirst({
      where: { phone, communityId },
      select: { id: true, phoneVerified: true },
    });
  } catch (err) {
    console.error("[verify] DB error:", err);
    return Errors.internal();
  }

  if (!user) {
    return Errors.notFound("Usuario no encontrado");
  }

  // --- Verify code ---
  const valid = verifyCode(phone, communityId, code);
  if (!valid) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CODE",
          message: "Código inválido o expirado",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 400 }
    );
  }

  // --- Activate account ---
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    });
  } catch (err) {
    console.error("[verify] DB update error:", err);
    return Errors.internal();
  }

  return NextResponse.json(
    { data: { message: "Cuenta verificada exitosamente" } },
    { status: 200 }
  );
}
