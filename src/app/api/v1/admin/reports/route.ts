import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// GET /api/v1/admin/reports
// List pending reports for moderation
// Requirements: 9.2, 9.3
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminId = request.headers.get("X-Admin-ID");
  if (!adminId) {
    return Errors.unauthorized("Se requiere X-Admin-ID");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  try {
    const reports = await prisma.report.findMany({
      where: { communityId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: { reports } }, { status: 200 });
  } catch (err) {
    console.error("[GET /admin/reports] DB error:", err);
    return Errors.internal();
  }
}
