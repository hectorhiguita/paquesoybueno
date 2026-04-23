import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  icon: z.string().optional(),
  description: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/v1/admin/categories
// Create a new category
// Requirements: 11.1, 11.2
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminId = request.headers.get("X-Admin-ID");
  if (!adminId) {
    return Errors.unauthorized("Se requiere X-Admin-ID");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { name, icon, description } = parsed.data;

  try {
    const category = await prisma.category.create({
      data: {
        communityId,
        name,
        icon: icon ?? null,
        description: description ?? null,
        active: true,
      },
    });

    return NextResponse.json({ data: { category } }, { status: 201 });
  } catch (err) {
    console.error("[POST /admin/categories] DB error:", err);
    return Errors.internal();
  }
}
