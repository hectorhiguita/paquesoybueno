import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireAdminSessionFromRequest } from "@/lib/admin/session";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminSession = await requireAdminSessionFromRequest(request);
  if (!adminSession) return Errors.unauthorized("Sesión de administrador requerida");

  try {
    const communityId = SANTA_ELENA_COMMUNITY_ID;
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      verifiedProviders,
      totalListings,
      listingsByStatus,
      listingsByType,
      newListingsThisWeek,
      totalRatings,
      avgRatingResult,
      totalMessages,
      messagesThisWeek,
      totalThreads,
      pendingReports,
      totalReservations,
      totalCategories,
    ] = await Promise.all([
      prisma.user.count({ where: { communityId } }),
      prisma.user.count({ where: { communityId, status: "active" } }),
      prisma.user.count({ where: { communityId, createdAt: { gte: last7d } } }),
      prisma.user.count({ where: { communityId, createdAt: { gte: last30d } } }),
      prisma.user.count({ where: { communityId, isVerifiedProvider: true } }),

      prisma.listing.count({ where: { communityId } }),
      prisma.listing.groupBy({
        by: ["status"],
        where: { communityId },
        _count: { _all: true },
      }),
      prisma.listing.groupBy({
        by: ["type"],
        where: { communityId },
        _count: { _all: true },
      }),
      prisma.listing.count({ where: { communityId, createdAt: { gte: last7d } } }),

      prisma.rating.count({ where: { communityId } }),
      prisma.rating.aggregate({
        where: { communityId },
        _avg: { stars: true },
      }),

      prisma.message.count({ where: { communityId } }),
      prisma.message.count({ where: { communityId, sentAt: { gte: last7d } } }),
      prisma.messageThread.count({ where: { communityId } }),

      prisma.report.count({ where: { communityId, status: "pending" } }),

      prisma.reservation.count({ where: { communityId } }),

      prisma.category.count({ where: { communityId, active: true } }),
    ]);

    const recentActivity = await prisma.listing.findMany({
      where: { communityId, createdAt: { gte: last24h } },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const statusMap = Object.fromEntries(
      listingsByStatus.map((r) => [r.status, r._count._all])
    );
    const typeMap = Object.fromEntries(
      listingsByType.map((r) => [r.type, r._count._all])
    );

    return NextResponse.json({
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
          verifiedProviders,
        },
        listings: {
          total: totalListings,
          newThisWeek: newListingsThisWeek,
          byStatus: statusMap,
          byType: typeMap,
        },
        engagement: {
          totalRatings,
          avgRating: avgRatingResult._avg.stars
            ? Math.round(avgRatingResult._avg.stars * 10) / 10
            : null,
          totalMessages,
          messagesThisWeek,
          totalThreads,
        },
        moderation: {
          pendingReports,
          totalReservations,
          activeCategories: totalCategories,
        },
        recentActivity,
      },
    });
  } catch (err) {
    console.error("[GET /admin/stats]", err);
    return Errors.internal();
  }
}
