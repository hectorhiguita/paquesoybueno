import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireAdminSessionFromRequest } from "@/lib/admin/session";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

// ---------------------------------------------------------------------------
// GET /api/v1/admin/reports
// List pending reports for moderation
// Requirements: 9.2, 9.3
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) return Errors.unauthorized("Sesión de administrador requerida");

  const communityId = request.headers.get("X-Community-ID") ?? SANTA_ELENA_COMMUNITY_ID;

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
