import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";
import { requireAdminSessionFromRequest } from "@/lib/admin/session";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

const createCategorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  icon: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) {
    return Errors.unauthorized("Sesión de administrador expirada");
  }

  try {
    const categories = await prisma.category.findMany({
      where: { communityId: SANTA_ELENA_COMMUNITY_ID },
      include: {
        _count: { select: { listings: true } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({
      data: {
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          description: category.description,
          active: category.active,
          listingsCount: category._count.listings,
        })),
      },
    });
  } catch (err) {
    console.error("[GET /admin/categories] DB error:", err);
    return Errors.internal();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) {
    return Errors.unauthorized("Sesión de administrador expirada");
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
        communityId: SANTA_ELENA_COMMUNITY_ID,
        name,
        icon: icon ?? null,
        description: description ?? null,
        active: true,
      },
    });

    return NextResponse.json({ data: { category } }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string } | null)?.code === "P2002") {
      return Errors.validation("Ya existe una categoría con ese nombre", "name");
    }
    console.error("[POST /admin/categories] DB error:", err);
    return Errors.internal();
  }
}
