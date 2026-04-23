import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { z } from "zod";

const createReportSchema = z.object({
  targetListingId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  reason: z.string().min(10, "El motivo debe tener al menos 10 caracteres"),
});

// ---------------------------------------------------------------------------
// POST /api/v1/reports
// Submit a report against a listing or user
// Requirements: 9.1, 9.4, 9.5
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const reporterId = request.headers.get("X-User-ID");
  if (!reporterId) {
    return Errors.unauthorized("Se requiere autenticación para enviar un reporte");
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

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { targetListingId, targetUserId, reason } = parsed.data;

  // At least one target required
  if (!targetListingId && !targetUserId) {
    return Errors.validation(
      "Se requiere al menos uno de: targetListingId o targetUserId"
    );
  }

  // Create the report
  let report: unknown;
  try {
    report = await prisma.report.create({
      data: {
        communityId,
        reporterId,
        targetListingId: targetListingId ?? null,
        targetUserId: targetUserId ?? null,
        reason,
        status: "pending",
      },
    });
  } catch (err) {
    console.error("[POST /reports] DB error creating report:", err);
    return Errors.internal();
  }

  // Auto-suspension: check if targetUser now has 5+ reports in last 30 days (Req 9.5)
  if (targetUserId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentReportCount = await prisma.report.count({
        where: {
          targetUserId,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      if (recentReportCount >= 5) {
        // Suspend the user
        await prisma.user.update({
          where: { id: targetUserId },
          data: { status: "suspended" },
        });

        // Notify admins
        const admins = await prisma.user.findMany({
          where: { communityId, role: "admin" },
          select: { id: true },
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                communityId,
                userId: admin.id,
                type: "user_auto_suspended",
                payload: { targetUserId, reportCount: recentReportCount },
                expiresAt,
              },
            })
          )
        );
      }
    } catch (err) {
      // Non-fatal: log but don't fail the report creation
      console.error("[POST /reports] Error in auto-suspension check:", err);
    }
  }

  return NextResponse.json({ data: { report } }, { status: 201 });
}
