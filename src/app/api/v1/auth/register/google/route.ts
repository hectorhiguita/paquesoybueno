import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

const schema = z.object({
  name:        z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email:       z.string().email("Correo inválido"),
  phone:       z.string().regex(/^3\d{9}$/, "Teléfono inválido (10 dígitos, comienza con 3)"),
  communityId: z.string().uuid("ID de comunidad inválido"),
  veredaId:    z.string().uuid().optional(),
});

/**
 * POST /api/v1/auth/register/google
 * Crea la cuenta para un usuario que ya se autenticó con Google.
 * Activa la cuenta directamente sin verificación OTP (SMS no disponible).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); } catch {
    return Errors.validation("JSON inválido");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Errors.validation(issue.message, issue.path[0] as string);
  }

  const { name, email, phone, communityId, veredaId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const upsert = async (withVereda: boolean) => {
    const veredaData = withVereda && veredaId ? { veredaId } : {};

    const existing = await prisma.user.findFirst({
      where: { communityId, OR: [{ email: normalizedEmail }, { phone }] },
      select: { id: true, email: true, phoneVerified: true, passwordHash: true },
    });

    if (existing) {
      if (existing.phoneVerified && existing.passwordHash) {
        return Errors.conflict("Ya existe una cuenta con estos datos. Intenta iniciar sesión.");
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, phone, phoneVerified: true, ...veredaData },
        select: { id: true },
      });
      return NextResponse.json({ data: { message: "Cuenta activada" } }, { status: 200 });
    }

    await prisma.user.create({
      data: { id: randomUUID(), communityId, email: normalizedEmail, phone, name, phoneVerified: true, ...veredaData },
      select: { id: true },
    });
    return NextResponse.json({ data: { message: "Cuenta creada exitosamente" } }, { status: 201 });
  };

  try {
    return await upsert(true);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") return Errors.conflict("Ya existe una cuenta con estos datos");
    // P2022 = column does not exist (migrations pending) — retry without veredaId
    if (code === "P2022") {
      try {
        return await upsert(false);
      } catch (err2) {
        if ((err2 as { code?: string })?.code === "P2002") return Errors.conflict("Ya existe una cuenta con estos datos");
        console.error("[register/google] fallback", err2);
        return Errors.internal();
      }
    }
    console.error("[register/google]", err);
    return Errors.internal();
  }
}
