import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const createCommunitySchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .max(60)
    .regex(
      /^[a-z0-9-]+$/,
      "El slug solo puede contener letras minúsculas, números y guiones"
    ),
});

// ---------------------------------------------------------------------------
// GET /api/v1/communities
// List all active communities (public, no auth required)
// Requirements: 12.1
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const communities = await prisma.community.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: { communities } }, { status: 200 });
  } catch (err) {
    console.error("[GET /communities] DB error:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/communities
// Create a new community (admin only)
// Requirements: 12.1, 12.2
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // --- Parse body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  // --- Validate ---
  const parsed = createCommunitySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(
      firstIssue.message,
      firstIssue.path[0] as string | undefined
    );
  }

  const { name, slug } = parsed.data;

  // --- Create community ---
  try {
    const community = await prisma.community.create({
      data: { name, slug },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: { community } }, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint violation on slug
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint") &&
      err.message.includes("slug")
    ) {
      return Errors.conflict("Ya existe una comunidad con ese slug");
    }

    // Prisma error code P2002 = unique constraint
    const prismaErr = err as { code?: string; meta?: { target?: string[] } };
    if (prismaErr?.code === "P2002") {
      return Errors.conflict("Ya existe una comunidad con ese slug");
    }

    console.error("[POST /communities] DB error:", err);
    return Errors.internal();
  }
}
