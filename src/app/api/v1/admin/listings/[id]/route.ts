import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireAdminSessionFromRequest } from "@/lib/admin/session";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["active", "inactive", "flagged", "pending_review"]),
});

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) return Errors.unauthorized("Sesión de administrador expirada");

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0].message);
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!listing) return Errors.notFound("Publicación no encontrada");

    const updated = await prisma.listing.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });

    return NextResponse.json({ data: { listing: updated } });
  } catch (err) {
    console.error("[PATCH /admin/listings/:id] DB error:", err);
    return Errors.internal();
  }
}
