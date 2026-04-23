/**
 * NextAuth.js v5 route handler.
 * Handles all /api/auth/* requests (sign-in, sign-out, session, callbacks).
 */
import { handlers } from "@/lib/auth/config";

export const { GET, POST } = handlers;
