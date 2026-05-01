import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generates a cryptographically random 6-digit numeric code.
 */
export function generateVerificationCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, "0");
}

/**
 * Stores a verification code for the given phone + community pair.
 * Overwrites any existing code (allows resend).
 */
export async function storeVerificationCode(
  phone: string,
  communityId: string,
  code: string
): Promise<void> {
  await prisma.verificationCode.upsert({
    where: { phone_communityId: { phone, communityId } },
    create: {
      phone,
      communityId,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
    update: {
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
}

/**
 * Verifies a code for the given phone + community pair.
 * Returns true if valid and not expired; deletes the entry on success.
 */
export async function verifyCode(
  phone: string,
  communityId: string,
  code: string
): Promise<boolean> {
  const entry = await prisma.verificationCode.findUnique({
    where: { phone_communityId: { phone, communityId } },
  });

  if (!entry) return false;
  if (new Date() > entry.expiresAt) {
    await prisma.verificationCode.delete({
      where: { phone_communityId: { phone, communityId } },
    });
    return false;
  }
  if (entry.code !== code) return false;

  await prisma.verificationCode.delete({
    where: { phone_communityId: { phone, communityId } },
  });
  return true;
}

/**
 * Checks whether a pending (non-expired) code exists for the given phone.
 */
export async function hasPendingCode(
  phone: string,
  communityId: string
): Promise<boolean> {
  const entry = await prisma.verificationCode.findUnique({
    where: { phone_communityId: { phone, communityId } },
  });

  if (!entry) return false;
  if (new Date() > entry.expiresAt) {
    await prisma.verificationCode.delete({
      where: { phone_communityId: { phone, communityId } },
    });
    return false;
  }
  return true;
}
