/**
 * Better Auth's catch-all route handler.
 * Handles /api/auth/sign-in/social/microsoft, /api/auth/sign-in/pin,
 * /api/auth/sign-out, /api/auth/get-session, /api/auth/ok, etc.
 */
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
