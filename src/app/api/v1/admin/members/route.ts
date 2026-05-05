import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireAdminSessionFromRequest } from "@/lib/admin/session";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import type { Prisma, UserStatus } from "@prisma/client";

const VALID_STATUSES = new Set<UserStatus>(["active", "locked", "suspended", "under_review"]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) return Errors.unauthorized("Sesión de administrador requerida");

  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get("status") ?? "all";
  const take = Math.min(Number(searchParams.get("limit") ?? "100"), 200);

  const where: Prisma.UserWhereInput = {
    communityId: SANTA_ELENA_COMMUNITY_ID,
    ...(statusParam !== "all" && VALID_STATUSES.has(statusParam as UserStatus)
      ? { status: statusParam as UserStatus }
      : {}),
  };

  try {
    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        isVerifiedProvider: true,
        createdAt: true,
        homeVereda: { select: { name: true } },
        ratingsReceived: { select: { stars: true } },
        _count: { select: { listings: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const result = members.map((m) => {
      const stars = m.ratingsReceived.map((r) => r.stars);
      const avgRating =
        stars.length > 0
          ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10
          : null;

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        status: m.status,
        isVerifiedProvider: m.isVerifiedProvider,
        createdAt: m.createdAt.toISOString(),
        veredaName: m.homeVereda?.name ?? null,
        avgRating,
        listingsCount: m._count.listings,
      };
    });

    return NextResponse.json({ data: { members: result } });
  } catch (err) {
    console.error("[GET /admin/members]", err);
    return Errors.internal();
  }
}
