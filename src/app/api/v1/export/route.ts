import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// Supported exportable tables (user-generated content only)
const SUPPORTED_TABLES = ["listings", "ratings", "messages", "reports"] as const;
type ExportTable = (typeof SUPPORTED_TABLES)[number];

// ---------------------------------------------------------------------------
// GET /api/v1/export?table=listings|ratings|messages|reports
// Export user-generated content as JSON (admin only)
// Requirements: 12.4
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const adminId = request.headers.get("X-Admin-ID");
  if (!adminId) {
    return Errors.unauthorized("Se requiere autenticación de administrador");
  }

  // Verify admin exists and has admin role
  let admin: { role: string } | null;
  try {
    admin = await prisma.user.findFirst({
      where: { id: adminId, communityId, role: "admin" },
      select: { role: true },
    });
  } catch (err) {
    console.error("[GET /export] DB error verifying admin:", err);
    return Errors.internal();
  }

  if (!admin) {
    return Errors.forbidden("Solo los administradores pueden exportar datos");
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table");

  if (!table || !SUPPORTED_TABLES.includes(table as ExportTable)) {
    return Errors.validation(
      `El parámetro 'table' debe ser uno de: ${SUPPORTED_TABLES.join(", ")}`,
      "table"
    );
  }

  try {
    const data = await exportTable(table as ExportTable, communityId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error(`[GET /export] DB error exporting ${table}:`, err);
    return Errors.internal();
  }
}

async function exportTable(table: ExportTable, communityId: string): Promise<unknown[]> {
  switch (table) {
    case "listings":
      return prisma.listing.findMany({
        where: { communityId },
        select: {
          id: true,
          communityId: true,
          authorId: true,
          categoryId: true,
          veredaId: true,
          title: true,
          description: true,
          type: true,
          status: true,
          priceCop: true,
          tradeDescription: true,
          isFeatured: true,
          completedJobs: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    case "ratings":
      return prisma.rating.findMany({
        where: { communityId },
        select: {
          id: true,
          communityId: true,
          raterId: true,
          providerId: true,
          listingId: true,
          stars: true,
          comment: true,
          createdAt: true,
        },
      });

    case "messages":
      return prisma.message.findMany({
        where: { communityId },
        select: {
          id: true,
          communityId: true,
          threadId: true,
          senderId: true,
          content: true,
          sentAt: true,
          delivered: true,
        },
      });

    case "reports":
      return prisma.report.findMany({
        where: { communityId },
        select: {
          id: true,
          communityId: true,
          reporterId: true,
          targetListingId: true,
          targetUserId: true,
          reason: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
        },
      });
  }
}
