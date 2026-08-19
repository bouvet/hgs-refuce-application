---
layout: default
parent: Frontend
title: Auth
nav_order: 2
---

# Auth

Sessions are managed by **Better Auth 1.6** (`frontend/lib/auth.ts`), but role and location
membership are never stored on the Better Auth session — they're fetched live from the FastAPI
backend on every request. See [Authentication]({{ site.baseurl }}/architecture/authentication/)
for the full sign-in flows (Microsoft SSO / username+PIN); this page covers how the frontend
enforces authorization once a session exists.

## Roles

Three roles, plain string literals (no `isAdmin`/`isSuperAdmin` booleans on the frontend side):

- `user` — register own waste only (`/registrer`, `/historikk`)
- `admin` — user pages + admin pages (`/oversikt`, `/rapportering`, `/registreringer`, `/statistikk`)
- `superadmin` — admin pages + `/sadmin` (location/user provisioning)

The role is normalized and served by the backend's `GET /currentUser` endpoint (see
`src/hgs_refuce_app/main.py`, `_role_for()`) — the frontend never computes or stores it itself.

## `requireSession()` / `requireRole()` — `frontend/lib/server-session.ts`

These are the **only** authorization boundary in the app. Client-side checks exist purely for
rendering (hiding a nav link), never for security.

```ts
// frontend/lib/server-session.ts
export async function getServerSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(redirectTo?: string): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    redirect(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login");
  }
  return session;
}

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
```

Notes on the actual behavior (verified against the source, not assumed):

- `requireSession()` redirects to `/login` (optionally with a `?redirect=` back-link) if there is
  no Better Auth session at all.
- `requireRole()` calls `requireSession()` first, then fetches the role via
  `getCurrentUser(getBackendUserId(session.user))` — from `lib/server-currentUser.ts`, which calls
  the backend's `GET /currentUser` under the hood (deduped per-request with React `cache()`). If
  the role isn't in the allowed set (or the backend has no record of the user), it redirects to `/`
  rather than to `/login` — the session is valid, just insufficiently privileged.
- `getBackendUserId(user)` reads `user.backendUserId` off the Better Auth session user object —
  this is the FastAPI user id, set once at first sign-in and otherwise immutable from the
  frontend's perspective.
- Every admin-only `page.tsx` calls `requireRole(...)` itself (see
  [Project structure]({{ site.baseurl }}/frontend/project-structure/)) — the `(app)/layout.tsx`
  `requireSession()` check is necessary but not sufficient, since it doesn't gate by role.

## `proxy.ts` is optimistic only

`frontend/proxy.ts` (Next.js 16's renamed `middleware.ts`) does **not** perform real
authentication. It checks only whether the Better Auth session cookie is *present*:

```ts
// frontend/proxy.ts
export function proxy(request: NextRequest): NextResponse | void {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return;

  const sessionCookie = getSessionCookie(request, { cookiePrefix: "avfall" });
  if (sessionCookie) return;

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname + search);
  return NextResponse.redirect(loginUrl);
}
```

`getSessionCookie` only checks cookie presence and shape — it does not hit the database, so a
forged or stale cookie would pass this check. That's intentional and matches Next.js 16 guidance
that proxy/middleware must not do slow work (no DB calls, no token verification). The comment at
the top of the file spells this out:

> Performs an OPTIMISTIC unauthenticated-request check ... Real session validation happens in
> server components (via `requireSession()`/`requireRole()`) and the `/api/[...path]` proxy route
> (via `getServerSession()`).

The `matcher` config excludes `api/auth`, `api/`, `_next/static`, `_next/image`, `favicon.ico`,
and common static asset extensions — the API routes authenticate themselves independently (see
[Data layer]({{ site.baseurl }}/frontend/data-layer/)). `PUBLIC_ROUTES` is just `["/login"]`.

## No client-side route guards

There is no `RoleGuard`/`SuperAdminGuard`/`UserProvider` component — those were deleted as part of
the 2026-06 Better Auth rewrite (`.claude/knowledge/component-structure.md`). The only client-side
role awareness is *rendering*: components like `app-sidebar.tsx` and `app-header.tsx` read
`useCurrentUser()` (`frontend/hooks/use-current-user.ts`) to decide which nav links to show, using
`user?.role === "admin" || user?.role === "superadmin"` checks — never to block navigation, since
the underlying page itself is what enforces `requireRole()` server-side. `useCurrentUser()` reads
from a server-seeded, read-only `SessionProvider` (seeded once per request in
`app/(app)/layout.tsx`), not from `authClient.useSession()` — there are no client-side setters for
role or location.
