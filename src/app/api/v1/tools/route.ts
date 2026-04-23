import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const TOOL_CONDITIONS = ["Bueno", "Regular", "Necesita reparación"] as const;

const createToolSchema = z.object({
  title: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede superar 200 caracteres"),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(2000, "La descripción no puede superar 2000 caracteres"),
  condition: z.enum(TOOL_CONDITIONS, {
    errorMap: () => ({
      message: "La condición debe ser: Bueno, Regular o Necesita reparación",
    }),
  }),
  veredaId: z.string().uuid("Vereda inválida"),
  categoryId: z.string().uuid("Categoría inválida"),
  communityId: z.string().uuid("ID de comunidad inválido"),
});

// ---------------------------------------------------------------------------
// GET /api/v1/tools
// List tool listings with availability info
// Requirements: 8.1, 8.2
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  try {
    const tools = await prisma.listing.findMany({
      where: { communityId, type: "tool", status: "active" },
      include: {
        author: {
          select: { id: true, name: true, isVerifiedProvider: true, phone: true },
        },
        vereda: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        reservations: {
          where: { status: { in: ["pending", "confirmed"] } },
          select: { startDate: true, endDate: true, status: true },
        },
      },
      orderBy: [{ author: { isVerifiedProvider: "desc" } }, { createdAt: "desc" }],
    });

    // Expose condition from tradeDescription and availability calendar
    const toolsWithAvailability = tools.map((tool) => ({
      id: tool.id,
      title: tool.title,
      description: tool.description,
      condition: tool.tradeDescription ?? null,
      vereda: tool.vereda,
      category: tool.category,
      author: tool.author,
      status: tool.status,
      isFeatured: tool.isFeatured,
      createdAt: tool.createdAt,
      // Calendar: list of blocked date ranges (pending + confirmed)
      blockedDates: tool.reservations.map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
      })),
    }));

    return NextResponse.json({ data: { tools: toolsWithAvailability } }, { status: 200 });
  } catch (err) {
    console.error("[GET /tools] DB error:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/tools
// Create a tool listing
// Requirements: 8.1
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authorId = request.headers.get("X-User-ID");
  if (!authorId) {
    return Errors.unauthorized("Se requiere autenticación para publicar una herramienta");
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

  const bodyWithCommunity = { ...(body as Record<string, unknown>), communityId };
  const parsed = createToolSchema.safeParse(bodyWithCommunity);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const data = parsed.data;

  // Validate veredaId belongs to this community (Req 6.2)
  try {
    const vereda = await prisma.vereda.findFirst({
      where: { id: data.veredaId, communityId: data.communityId },
    });
    if (!vereda) {
      return Errors.validation(
        "La vereda seleccionada no pertenece a esta comunidad",
        "veredaId"
      );
    }
  } catch (err) {
    console.error("[POST /tools] DB error validating vereda:", err);
    return Errors.internal();
  }

  // Validate categoryId belongs to this community and is active
  try {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, communityId: data.communityId, active: true },
    });
    if (!category) {
      return Errors.validation(
        "La categoría seleccionada no pertenece a esta comunidad o no está activa",
        "categoryId"
      );
    }
  } catch (err) {
    console.error("[POST /tools] DB error validating category:", err);
    return Errors.internal();
  }

  try {
    const tool = await prisma.listing.create({
      data: {
        communityId: data.communityId,
        authorId,
        categoryId: data.categoryId,
        veredaId: data.veredaId,
        title: data.title,
        description: data.description,
        type: "tool",
        status: "active",
        // Store condition in tradeDescription field (Req 8.1)
        tradeDescription: data.condition,
      },
      include: {
        author: { select: { id: true, name: true, isVerifiedProvider: true } },
        category: { select: { id: true, name: true } },
        vereda: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        data: {
          tool: {
            ...tool,
            condition: tool.tradeDescription,
          },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /tools] DB error:", err);
    return Errors.internal();
  }
}
