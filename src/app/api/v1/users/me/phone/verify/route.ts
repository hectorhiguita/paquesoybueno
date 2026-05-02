import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";
import { verifyCode } from "@/lib/verification";

const schema = z.object({
  phone: z.string().regex(/^3\d{9}$/, "Teléfono inválido"),
  code: z.string().length(6).regex(/^\d{6}$/, "Código debe ser 6 dígitos"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();

  let body: unknown;
  try { body = await request.json(); } catch { return Errors.validation("JSON inválido"); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Errors.validation(issue?.message ?? "Datos inválidos", issue?.path[0] as string);
  }

  const { phone, code } = parsed.data;

  try {
    const valid = await verifyCode(phone, context.communityId, code);
    if (!valid) {
      return NextResponse.json(
        { error: { code: "INVALID_CODE", message: "Código inválido o expirado" } },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: context.userId },
      data: { phone, phoneVerified: true },
    });

    return NextResponse.json({ data: { message: "Teléfono actualizado exitosamente" } });
  } catch (err) {
    console.error("[POST /users/me/phone/verify]", err);
    return Errors.internal();
  }
}
