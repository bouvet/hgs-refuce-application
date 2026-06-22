/**
 * Server-side session helpers used by RSC pages, server actions, and the
 * `/api/[...path]` proxy route.
 *
 * Session validation is delegated to Better Auth's
 * `auth.api.getSession({ headers })`. The session carries IDENTITY ONLY —
 * role and location come from the backend (see `lib/server-currentUser.ts`), so
 * `requireRole` fetches the role rather than reading it off the session.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session, type SessionUser } from "@/lib/auth";
import { getCurrentUser, type Role } from "@/lib/server-currentUser";

export type { Role };

/** Returns the current session, or null if the user is signed out. */
export async function getServerSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Server-side gate. Returns the session, or redirects to /login if absent.
 * Use as the first line of any RSC that requires authentication.
 */
export async function requireSession(redirectTo?: string): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    const dest = redirectTo
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : "/login";
    redirect(dest);
  }
  return session;
}

/** The stable backend user id stored on the Better Auth session, or null. */
export function getBackendUserId(user: SessionUser): string | null {
  const raw = (user as Record<string, unknown>).backendUserId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * Server-side role gate. Role is read from the backend (the source of truth),
 * never from the session. Redirects to /login if signed out, or / if the role
 * doesn't match. Accepts a single role or an array of allowed roles.
 */
export async function requireRole(
  role: Role | Role[],
  redirectTo?: string,
): Promise<Session> {
  const session = await requireSession(redirectTo);
  const currentUser = await getCurrentUser(getBackendUserId(session.user));
  const allowed = Array.isArray(role) ? role : [role];
  if (!currentUser || !allowed.includes(currentUser.role)) {
    redirect("/");
  }
  return session;
}
