import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireAdminSessionFromRequest } from "@/lib/admin/session";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) return Errors.unauthorized("Sesión de administrador expirada");

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  try {
    const listings = await prisma.listing.findMany({
      where: {
        communityId: SANTA_ELENA_COMMUNITY_ID,
        ...(status ? { status: status as never } : {}),
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ data: { listings } });
  } catch (err) {
    console.error("[GET /admin/listings] DB error:", err);
    return Errors.internal();
  }
}
