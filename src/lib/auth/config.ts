/**
 * NextAuth.js v5 configuration.
 *
 * Providers:
 *  - Credentials: email + password with failed-attempt tracking and account locking
 *  - Google OAuth: requires phone verification on first login
 *
 * Requirements: 1.5, 1.6, 1.7, 1.8
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { sendAccountLockedEmail } from "@/lib/email";
import { loginSchema } from "@/lib/validations/auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of failed attempts before locking the account. */
const MAX_FAILED_ATTEMPTS = 5;
/** Window in milliseconds within which failed attempts are counted. */
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
/** How long the account stays locked after reaching the threshold. */
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// NextAuth config
// ---------------------------------------------------------------------------

export const authConfig: NextAuthConfig = {
  providers: [
    // ------------------------------------------------------------------
    // Credentials provider (Req 1.5, 1.6, 1.7)
    // ------------------------------------------------------------------
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        communityId: { label: "Community ID", type: "text" },
      },
      async authorize(credentials) {
        // Validate shape
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, communityId } = parsed.data;

        // Fetch user
        const user = await prisma.user.findFirst({
          where: { email, communityId },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            status: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            communityId: true,
            role: true,
            isVerifiedProvider: true,
            phoneVerified: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        // Check if account is locked (Req 1.7)
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        // Check account status (suspended, etc.)
        if (user.status !== "active" && user.status !== "locked") {
          return null;
        }

        // Verify password (Req 1.5)
        const valid = await verifyPassword(password, user.passwordHash);

        if (!valid) {
          // Increment failed attempts (Req 1.6)
          await incrementFailedAttempts(user.id, user.email, user.failedLoginAttempts);
          return null;
        }

        // Successful login — reset counter
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          communityId: user.communityId,
          role: user.role,
          isVerifiedProvider: user.isVerifiedProvider,
          phoneVerified: user.phoneVerified,
        };
      },
    }),

    // ------------------------------------------------------------------
    // Google OAuth provider (Req 1.8) — opcional, solo si están configuradas
    // las variables de entorno. Se puede activar después sin cambios de código.
    // ------------------------------------------------------------------
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  // ------------------------------------------------------------------
  // Callbacks
  // ------------------------------------------------------------------
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // First sign-in: persist custom fields into the JWT
        token.userId = user.id;
        token.communityId = (user as Record<string, unknown>).communityId as string;
        token.role = (user as Record<string, unknown>).role as string;
        token.isVerifiedProvider = (user as Record<string, unknown>).isVerifiedProvider as boolean;
        token.phoneVerified = (user as Record<string, unknown>).phoneVerified as boolean;
      }

      // Google OAuth first login: check phone verification (Req 1.8)
      if (account?.provider === "google" && user) {
        const dbUser = await prisma.user.findFirst({
          where: { email: user.email ?? "" },
          select: { phoneVerified: true, id: true, communityId: true, role: true, isVerifiedProvider: true },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.communityId = dbUser.communityId;
          token.role = dbUser.role;
          token.isVerifiedProvider = dbUser.isVerifiedProvider;
          token.phoneVerified = dbUser.phoneVerified;
          token.requiresPhoneVerification = !dbUser.phoneVerified;
        } else {
          // New Google user — will need phone verification
          token.requiresPhoneVerification = true;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        (session as Record<string, unknown> & typeof session).communityId = token.communityId;
        (session as Record<string, unknown> & typeof session).role = token.role;
        (session as Record<string, unknown> & typeof session).isVerifiedProvider = token.isVerifiedProvider;
        (session as Record<string, unknown> & typeof session).phoneVerified = token.phoneVerified;
        (session as Record<string, unknown> & typeof session).requiresPhoneVerification = token.requiresPhoneVerification;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// ---------------------------------------------------------------------------
// Account locking helpers
// ---------------------------------------------------------------------------

/**
 * Increments the failed login attempt counter.
 * If the threshold is reached within the attempt window, locks the account
 * for LOCK_DURATION_MS and sends an email notification (Req 1.7).
 */
async function incrementFailedAttempts(
  userId: string,
  email: string,
  currentAttempts: number
): Promise<void> {
  const newCount = currentAttempts + 1;

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newCount,
        lockedUntil,
        status: "locked",
      },
    });

    // Notify via email (non-fatal)
    sendAccountLockedEmail(email, lockedUntil).catch((err) => {
      console.error("[auth] Failed to send account-locked email:", err);
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: newCount },
    });
  }
}
