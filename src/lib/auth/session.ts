import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { Errors } from "@/lib/api/errors";
import type { SessionContext } from "@/types/auth";

export async function getSessionContext(
  request: NextRequest
): Promise<SessionContext | null> {
  const session = await auth();
  const userId = session?.user?.id ?? request.headers.get("X-User-ID");
  const communityId = session?.communityId ?? request.headers.get("X-Community-ID");
  const role = session?.role ?? "member";

  if (!userId || !communityId) {
    return null;
  }

  return { userId, communityId, role };
}

export async function requireSessionContext(
  request: NextRequest
) {
  const context = await getSessionContext(request);
  if (!context) {
    return { error: Errors.unauthorized(), context: null };
  }

  return { error: null, context };
}
