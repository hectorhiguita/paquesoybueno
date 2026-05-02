import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  veredaId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();

  try {
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        phoneVerified: true,
        isVerifiedProvider: true,
        avatarUrl: true,
        veredaId: true,
        role: true,
        createdAt: true,
        homeVereda: { select: { id: true, name: true } },
      },
    });
    if (!user) return Errors.notFound("Usuario no encontrado");
    return NextResponse.json({ data: { user } });
  } catch (err) {
    console.error("[GET /users/me]", err);
    return Errors.internal();
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();

  let body: unknown;
  try { body = await request.json(); } catch { return Errors.validation("Cuerpo JSON inválido"); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0] as string | undefined;
    return Errors.validation(parsed.error.issues[0]?.message ?? "Datos inválidos", field);
  }

  const { name, veredaId } = parsed.data;
  if (!name && veredaId === undefined) return Errors.validation("No hay campos para actualizar");

  try {
    if (veredaId) {
      const vereda = await prisma.vereda.findFirst({
        where: { id: veredaId, communityId: context.communityId },
      });
      if (!vereda) return Errors.notFound("Vereda no encontrada");
    }

    const updated = await prisma.user.update({
      where: { id: context.userId },
      data: {
        ...(name ? { name } : {}),
        ...(veredaId !== undefined ? { veredaId } : {}),
      },
      select: { id: true, name: true, veredaId: true, avatarUrl: true },
    });

    return NextResponse.json({ data: { user: updated } });
  } catch (err) {
    console.error("[PATCH /users/me]", err);
    return Errors.internal();
  }
}
