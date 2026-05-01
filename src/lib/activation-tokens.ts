import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export async function generateActivationToken(
  userId: string,
  email: string,
  communityId: string
): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await prisma.activationToken.create({
    data: {
      token,
      userId,
      email,
      communityId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return token;
}

export async function validateActivationToken(
  token: string
): Promise<{ userId: string; email: string; communityId: string } | null> {
  const entry = await prisma.activationToken.findUnique({
    where: { token },
    select: { userId: true, email: true, communityId: true, expiresAt: true, used: true },
  });

  if (!entry) return null;
  if (entry.used) return null;
  if (entry.expiresAt < new Date()) {
    await prisma.activationToken.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return { userId: entry.userId, email: entry.email, communityId: entry.communityId };
}

export async function consumeActivationToken(token: string): Promise<boolean> {
  const updated = await prisma.activationToken.updateMany({
    where: { token, used: false, expiresAt: { gt: new Date() } },
    data: { used: true },
  });
  return updated.count > 0;
}
