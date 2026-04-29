import { type NextRequest } from "next/server";
import { Errors } from "@/lib/api/errors";
import type { SessionContext } from "@/types/auth";

export async function getSessionContext(
  request: NextRequest
): Promise<SessionContext | null> {
  const headerUserId = request.headers.get("X-User-ID");
  const headerCommunityId = request.headers.get("X-Community-ID");

  // In tests and internal calls we often pass explicit headers; prefer them and
  // avoid loading NextAuth at import-time, which is brittle in Vitest.
  if (headerUserId || headerCommunityId) {
    if (!headerUserId || !headerCommunityId) {
      return null;
    }
    return { userId: headerUserId, communityId: headerCommunityId, role: "member" };
  }

  const { auth } = await import("@/lib/auth/config");
  const session = await auth();
  const userId = session?.user?.id;
  const communityId = session?.communityId;
  const role = session?.role ?? "member";

  if (!userId || !communityId) {
    return null;
  }

  return { userId, communityId, role };
}

export async function requireSessionContext(
  request: NextRequest
) {
  const headerUserId = request.headers.get("X-User-ID");
  const headerCommunityId = request.headers.get("X-Community-ID");

  if (headerUserId || headerCommunityId) {
    if (!headerUserId) {
      return { error: Errors.unauthorized(), context: null };
    }
    if (!headerCommunityId) {
      return { error: Errors.validation("El header X-Community-ID es requerido"), context: null };
    }
  }

  const context = await getSessionContext(request);
  if (!context) {
    return { error: Errors.unauthorized(), context: null };
  }

  return { error: null, context };
}
