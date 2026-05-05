/**
 * NextAuth.js v5 configuration.
 *
 * Providers:
 *  - Credentials: email + password with failed-attempt tracking and account locking
 *  - Google OAuth: requires phone verification on first login
 *
 * Requirements: 1.5, 1.6, 1.7, 1.8
 */

import { randomUUID } from "crypto";
import NextAuth, { type NextAuthConfig, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { sendAccountLockedEmail } from "@/lib/email";
import { loginSchema } from "@/lib/validations/auth";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

interface AppUser extends User {
  communityId: string;
  role: "member" | "admin";
  isVerifiedProvider: boolean;
  phoneVerified: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of failed attempts before locking the account. */
const MAX_FAILED_ATTEMPTS = 5;
/** How long the account stays locked after reaching the threshold. */
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 horas

// ---------------------------------------------------------------------------
// NextAuth config
// ---------------------------------------------------------------------------

export const authConfig: NextAuthConfig = {
  trustHost: true,
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
          select: { id: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          communityId: user.communityId,
          role: user.role as "member" | "admin",
          isVerifiedProvider: user.isVerifiedProvider,
          phoneVerified: user.phoneVerified,
        } satisfies AppUser;
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
    async jwt({ token, user, account, trigger }) {
      if (user) {
        const appUser = user as AppUser;
        token.userId = appUser.id ?? "";
        token.communityId = appUser.communityId;
        token.role = appUser.role;
        token.isVerifiedProvider = appUser.isVerifiedProvider;
        token.phoneVerified = appUser.phoneVerified;
      }

      // Heal old tokens missing communityId (e.g. sessions created before this field was added)
      if (!token.communityId && token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { communityId: true, role: true, isVerifiedProvider: true, phoneVerified: true },
        });
        if (dbUser) {
          token.communityId = dbUser.communityId;
          token.role = dbUser.role as "member" | "admin";
          token.isVerifiedProvider = dbUser.isVerifiedProvider;
          token.phoneVerified = dbUser.phoneVerified;
        }
      }

      // Google OAuth first login: sync DB user (Req 1.8)
      if (account?.provider === "google" && user) {
        const dbUser = await prisma.user.findFirst({
          where: { email: user.email ?? "" },
          select: { id: true, communityId: true, role: true, isVerifiedProvider: true, phoneVerified: true },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.communityId = dbUser.communityId;
          token.role = dbUser.role as "member" | "admin";
          token.isVerifiedProvider = dbUser.isVerifiedProvider;
          token.phoneVerified = dbUser.phoneVerified;
          token.requiresPhoneVerification = !dbUser.phoneVerified;
        } else {
          // New Google user — save email to DB immediately (phone added in complete-profile)
          const normalizedEmail = (user.email ?? "").trim().toLowerCase();
          const newId = randomUUID();
          try {
            await prisma.user.create({
              data: {
                id: newId,
                communityId: SANTA_ELENA_COMMUNITY_ID,
                email: normalizedEmail,
                name: user.name ?? "",
              },
              select: { id: true },
            });
            token.userId = newId;
            token.communityId = SANTA_ELENA_COMMUNITY_ID;
            token.role = "member";
            token.isVerifiedProvider = false;
            token.phoneVerified = false;
          } catch (createErr) {
            // P2002: race condition — another request already created this email
            if ((createErr as { code?: string })?.code === "P2002") {
              const existing = await prisma.user.findFirst({
                where: { email: normalizedEmail },
                select: { id: true, phoneVerified: true },
              });
              if (existing) {
                token.userId = existing.id;
                if (existing.phoneVerified) {
                  token.requiresPhoneVerification = false;
                }
              }
            }
            // Other errors: fall through, token.userId stays as Google sub
          }
          if (token.requiresPhoneVerification !== false) {
            token.requiresPhoneVerification = true;
          }
          token.googleName = user.name ?? "";
          token.googleEmail = normalizedEmail;
        }
      }

      // On session update (trigger=update): re-sync DB user for Google accounts
      if (trigger === "update" && token.requiresPhoneVerification) {
        const email = (token.googleEmail as string | undefined) ?? (token.email as string | undefined);
        if (email) {
          const dbUser = await prisma.user.findFirst({
            where: { email },
            select: { id: true, communityId: true, role: true, isVerifiedProvider: true, phoneVerified: true },
          });
          if (dbUser) {
            token.userId = dbUser.id;
            token.communityId = dbUser.communityId;
            token.role = dbUser.role as "member" | "admin";
            token.isVerifiedProvider = dbUser.isVerifiedProvider;
            token.phoneVerified = dbUser.phoneVerified;
            if (dbUser.phoneVerified) {
              token.requiresPhoneVerification = false;
            }
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
      }
      session.communityId = token.communityId;
      session.role = token.role;
      session.isVerifiedProvider = token.isVerifiedProvider;
      session.phoneVerified = token.phoneVerified;
      session.requiresPhoneVerification = token.requiresPhoneVerification;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
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
      select: { id: true },
    });

    // Notify via email (non-fatal)
    sendAccountLockedEmail(email, lockedUntil).catch((err) => {
      console.error("[auth] Failed to send account-locked email:", err);
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: newCount },
      select: { id: true },
    });
  }
}
