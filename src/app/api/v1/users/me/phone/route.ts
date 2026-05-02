import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";
import { storeVerificationCode, generateVerificationCode, hasPendingCode } from "@/lib/verification";
import { sendVerificationSms } from "@/lib/sms";

const schema = z.object({
  phone: z.string().regex(/^3\d{9}$/, "Teléfono inválido (10 dígitos, comienza con 3)"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();

  let body: unknown;
  try { body = await request.json(); } catch { return Errors.validation("JSON inválido"); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Datos inválidos", "phone");

  const { phone } = parsed.data;

  try {
    const conflict = await prisma.user.findFirst({
      where: { phone, communityId: context.communityId, id: { not: context.userId } },
      select: { id: true },
    });
    if (conflict) return Errors.conflict("Este número ya está registrado por otro usuario");

    const pending = await hasPendingCode(phone, context.communityId);
    if (pending) return Errors.tooManyRequests("Ya existe un código pendiente para este número. Espera 10 minutos.");

    const code = generateVerificationCode();
    await storeVerificationCode(phone, context.communityId, code);
    await sendVerificationSms(phone, code);

    return NextResponse.json({ data: { message: "Código enviado al nuevo número" } });
  } catch (err) {
    console.error("[POST /users/me/phone]", err);
    return Errors.internal();
  }
}
