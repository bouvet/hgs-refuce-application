/**
 * React client for Better Auth.
 *
 * Use this in client components only. Server-side code should import
 * helpers from `@/lib/server-session` instead.
 */
"use client";

import { createAuthClient } from "better-auth/react";
import { pinCredentialsClient } from "@/lib/auth-plugins/pin-credentials-client";

export const authClient = createAuthClient({
  // baseURL inferred from window.location at runtime; no env needed client-side
  plugins: [pinCredentialsClient()],
});

export const useSession = authClient.useSession;
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
