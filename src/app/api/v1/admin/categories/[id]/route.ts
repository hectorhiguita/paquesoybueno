import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/categories/:id
// Rename or deactivate a category
// Requirements: 11.2
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const adminId = request.headers.get("X-Admin-ID");
  if (!adminId) {
    return Errors.unauthorized("Se requiere X-Admin-ID");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const updateData = parsed.data;

  if (Object.keys(updateData).length === 0) {
    return Errors.validation("Se requiere al menos un campo para actualizar");
  }

  // Check category exists
  let existing: { id: string } | null;
  try {
    existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
  } catch (err) {
    console.error("[PATCH /admin/categories/:id] DB error:", err);
    return Errors.internal();
  }

  if (!existing) {
    return Errors.notFound("Categoría no encontrada");
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: { category } }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /admin/categories/:id] DB update error:", err);
    return Errors.internal();
  }
}
