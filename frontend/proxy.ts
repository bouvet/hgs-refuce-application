/**
 * Next.js 16 proxy (replaces middleware.ts).
 *
 * Performs an OPTIMISTIC unauthenticated-request check: if the Better Auth
 * session cookie is missing entirely, the user is redirected to /login.
 * Real session validation happens in:
 *   - server components (via `requireSession()` / `requireRole()`)
 *   - the `/api/[...path]` proxy route (via `getServerSession()`)
 *
 * Per Next.js docs, proxy must NOT do slow work (no DB calls, no token
 * validation). Reading the cookie is O(1) and safe here.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = ["/login"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return false;
}

export function proxy(request: NextRequest): NextResponse | void {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return;

  const sessionCookie = getSessionCookie(request, { cookiePrefix: "avfall" });
  if (sessionCookie) return;

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every page route, but skip Next.js internals, the auth API, the
  // backend proxy (which authenticates itself), static assets, and favicon.
  matcher: [
    "/((?!api/auth|api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js)$).*)",
  ],
};
