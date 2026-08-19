---
layout: default
parent: Architecture
title: Decisions
nav_order: 4
---

# Architecture decisions

This page collects every line starting `DECIDED` across the seven files in `.claude/knowledge/`
— the project's externalized mental model — grouped by the file it came from. Several entries
explicitly say **"Reverses prior..."**; those are kept in the order they appear in their source
file so the reversal reads as a correction of the entry just above it, not a contradiction. If
you're about to make a change that contradicts one of these, the convention this repo follows
(see the root `CLAUDE.md`) is to cite the entry and get it justified before overriding it.

## From `auth-rbac.md`

- **Three roles, not two.** Consolidated `admin`/`common` into `user` \| `admin` \| `superadmin`
  to give the existing super-admin endpoints (`/admin/*` in FastAPI) a first-class frontend role
  instead of a magic `isSuperAdmin` boolean. `common` was renamed to `user` for clarity.
- **Sessions moved out of the browser.** Reverses "frontend stores in UserProvider +
  localStorage." Sessions live in an http-only signed cookie managed by Better Auth; the browser
  never sees session data. `UserProvider`, `lib/user-context.ts`, and the
  `boss-app:current-user` localStorage key are deleted.
- **Cookie-based sessions are the norm now.** Reverses "no token-based session (uncommon but
  intentional)." Backend trust still does not use JWTs for this path — instead, the proxy mints a
  short-lived HMAC over `${version}.${timestamp}.${userId}` per request.
- **Every proxied request carries a signed identity header.** Reverses "each request to backend
  carries no explicit auth header." Every request now carries the signed identity triple; the
  backend *should* verify `X-User-Sig` with `BACKEND_SHARED_SECRET` and a clock-skew tolerance.
  See the open gap below — that verification is not yet implemented for this per-user header
  (only the separate service-to-service header is checked today).
- **Backend re-derives role from its own table.** Reverses "frontend trust model: backend accepts
  role from UserProvider." Backend gets identity (userId) from the signed header and re-derives
  the role from its own user table. The frontend cannot impersonate or escalate.
- **Authorization moved into RSC server-side helpers.** Reverses the `RoleGuard` /
  `SuperAdminGuard` client-component pattern. Files deleted:
  `components/auth/{role-guard,superadmin-guard,role-selector}.tsx`.
- **Per-page `requireRole` calls, not just layout-level gating.** *(2026-06)* Admin pages must
  each call `requireRole` — gating only in the route-group layout was considered but the per-page
  guard keeps the role fetch close to the protected content and lets `user`-role pages
  (`registrer`, `historikk`) share the same layout.
- **Client reads role/location from a server-seeded provider.** *(2026-06)* Client reads
  role/location from a server-seeded read-only provider, not from `authClient.useSession()`,
  because the session no longer carries role/location. `useSession()` is still used for sign-out
  only.
- **No client-side mutation of user/location state.** Reverses the `UserProvider.setUser() +
  setLocationId()` mutation model. Client reads but cannot mutate.
- **Backend `PATCH /currentUser/location` is the only write.** *(2026-06)* Reverses "write BOTH
  backend and BA row via raw SQL." The raw `UPDATE "user"` against the BA-owned table (and its
  duplicate pg pool) is gone. Backend `PATCH /currentUser/location` is the only write; the next
  request reads it back through `GET /currentUser`. Removes two-store divergence and the
  cookie-cache redirect loop.
- **PIN plugin keeps FastAPI as the credential authority.** No password rewrite into Better
  Auth — Better Auth owns session/cookie/rate-limit/CSRF instead. Clean separation.
- **Explicit aliases for auth-client re-exports.** Documented because the symptom is opaque:
  destructuring `authClient` at module level (`export const { useSession } = authClient`) loses
  the generic flow from the plugin types, causing `useSession()` to infer `data: never` in
  consumers. Explicit aliases (`export const useSession = authClient.useSession`) preserve
  inference.
- **The client can never pass a `userId`.** Reverses the `api.*(userId, ...)` pattern. The client
  cannot pass `userId` even to admin endpoints; impersonation is structurally impossible from the
  browser.
- **Cookie cache disabled.** *(2026-06)* Reverses "cookie cache enabled (5min)." Disabled so
  server checks (`requireSession`/`requireRole`, the `/api` proxy) always read fresh from
  Postgres. The session carries identity only and role/location are fetched per request, so there
  is no cached auth data to go stale; revocation and role/location changes are visible
  immediately. `proxy.ts` only checks cookie *presence*, so it is unaffected.
- **`/debug` is no longer an auth bypass.** Reverses "`/debug` accessible without auth (dev
  helper)." Use a real seeded backend account for local dev instead.

## From `backend-api.md`

- **One FastAPI app, not a blueprint split.** Keeps routes simple and co-located with logic
  rather than splitting into separate routers/blueprints.
- **No backend token generation for this path.** The session lives in Better Auth; the backend
  authenticates each request via the signed `X-User-Id` header rather than issuing its own session
  token for proxied calls.
- **`/currentUser` is the single source for role + location.** The frontend stores neither on the
  Better Auth session (see the `auth-rbac.md` entries above).
- **Admin endpoints stay dev-only.** `/admin/*` endpoints exist for local testing; never expose
  them in production.
- **Backend stores only `backendUserId`, not full user state.** Reverses "frontend stores user
  state in localStorage." The session lives in Better Auth's Postgres tables; the backend is the
  role/location authority, called with a signed identity. The frontend stores only
  `backendUserId`.

## From `build-deploy.md`

- **Monorepo layout.** Allows parallel development; each sub-project can be deployed
  independently.
- **Shell scripts for developer convenience.** `start.sh`/`start.ps1`/`start.bat` were decided on
  for convenience, with the developer still able to run backend and frontend separately.

  {: .warning }
  > **This decision is recorded but the artifact isn't there.** No `start.sh`, `start.ps1`, or
  > `start.bat` exists at the repo root today, and no commit in the repository's history ever
  > added them (checked directly against the working tree and `git log`). See
  > [Running locally]({{ site.baseurl }}/getting-started/running-locally/) for the two-terminal
  > workaround.

- **No migrations — schema applied directly from `models.py`.** SQLite schema comes straight
  from `models.py`; there's no migration tool on the backend side.
- **Turbopack for frontend dev.** Chosen for faster rebuilds — experimental when this was
  written, stable by Next.js 16.
- **Env vars for cross-environment flexibility.** Configuration travels via environment variables
  so the same code runs across dev/staging/prod.
- **Backend URL is server-only.** Reverses `NEXT_PUBLIC_API_URL`. Backend URL is server-only; the
  browser only ever calls `/api/*`. See
  [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/).
- **Postgres required for local Better Auth, even natively.** SQLite is not supported by the
  current Better Auth setup (it uses the `pg` driver directly); local dev requires Postgres even
  outside Docker.
- **Microsoft as the sole SSO provider.** Per requirements. Other providers can be added later by
  extending `socialProviders` in `lib/auth.ts`.

## From `component-structure.md`

- **Flat component directories.** Single-level nesting (no deeply-nested subdirectories) keeps
  navigation simple.
- **Layout composition lives in `app/(app)/layout.tsx`.** Reusable pieces are imported into the
  layout rather than duplicated per page.
- **`@base-ui/react` instead of Radix UI.** Simpler and less opinionated — also why shadcn/UI is
  configured with the `base-vega` style in this repo.
- **Server/client component separation.** Kept separate to avoid hydration mismatches —
  `page.tsx` (server) imports `*-content.tsx` (client).
- **Auth UI moved server-side.** Reverses the `RoleGuard` / `RoleSelector` decision. Auth UI is
  `app/login/login-form.tsx` (two-step: Microsoft SSO button + PIN form); authorization is
  server-side in RSCs via `requireRole()` from `lib/server-session.ts`.
- **Components only read, never mutate, session state.** Reverses the `setUser`/`setLocationId`
  mutation pattern. Components only read from `useCurrentUser()`; mutations go through
  `authClient` or server actions.
- **Kept the `useCurrentUser` hook name across a rewrite.** Minimizes diff churn across the
  existing 9 callers, despite the underlying implementation changing completely (context provider
  → server-seeded read-only provider).

## From `data-repository.md`

- **Repository pattern centralizes API logic.** Easier to swap implementations later (testing,
  offline mode) than calling `fetch` ad hoc from components.
- **Singleton `wasteRepository` instance.** Simplifies prop drilling and gives a central point
  for adding caching/interceptors later.
- **Repositories are stateless with respect to identity.** Reverses "auth state available in
  UserProvider." The proxy handles identity now, eliminating a whole class of bugs where the
  wrong `userId` was passed. `createWasteRepository(locationId)` takes one argument, not
  `(locationId, userId)`.

## From `database-layer.md`

- **SQLite in dev, PostgreSQL in prod.** SQLite gives a simple reset-between-tests story locally;
  PostgreSQL's schema is mirrored in production via the same SQLAlchemy models.
- **No query logging by default.** Add debug output to `main.py` directly if you need to trace
  queries — there's no built-in logging/tracing layer for the ORM calls.
- **Better Auth and FastAPI can share one Postgres instance.** *(2026-06)* No separate database
  instance is required; schema isolation via a separate `search_path` is optional if table-name
  conflicts arise.

  {: .note }
  > In `docker-compose.yml` they are, in fact, given fully separate containers/databases
  > (`auth-db` / `refuce_auth` vs. `data-db` / `refuce_data`) rather than one shared instance —
  > sharing is *possible* per this decision, not what's actually configured today. See
  > [Running with Docker]({{ site.baseurl }}/getting-started/with-docker/).

## From `frontend-architecture.md`

- **Server components for routing/auth, client for interactivity.** Minimizes hydration cost —
  pages and layouts default to server components.
- **RoleGuard redirects instead of 404.** *(pre-Better-Auth)* Chosen for clearer UX for
  unauthorized users. Superseded by the RSC-based `requireRole()` pattern described under
  `auth-rbac.md` above.
- **Backend URL configurable per environment.** Supported multi-environment deploys — later
  reversed (see below) once the URL moved server-side only.
- **Turbopack for fast dev rebuilds.** Same rationale as the `build-deploy.md` entry above.
- **`middleware.ts` renamed to `proxy.ts`.** Reverses the `middleware.ts` filename. Next.js 16
  renamed the file and its named export to `proxy`; the `edge` runtime is not supported there
  (use `nodejs`).
- **Landing and `/sadmin` pages are pure RSC, no content component.** Reverses "each page has
  `page.tsx` + `*-content.tsx` pair" for these two routes specifically. `app/page.tsx` is now a
  pure RSC redirect (no content component); `app/(app)/sadmin/page.tsx` calls
  `await requireRole("superadmin")` then renders `<SuperAdminContent />` directly.
- **Layout calls `requireSession()` directly.** Reverses the `RoleGuard` wrapper pattern on
  `(app)/layout.tsx`. The layout now calls `requireSession()` and redirects to `/select-location`
  if `currentLocationId` is null.
- **`NEXT_PUBLIC_API_URL` removed.** Reverses the "backend URL configurable per environment"
  entry above. Exposing the backend URL to the browser is unnecessary now that the proxy handles
  every backend call; removing it lets the app add HMAC headers without leaking the shared
  secret. See [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/).

## Known open gaps (verified in code, not `DECIDED` entries)

These aren't recorded as `DECIDED` lines anywhere, but came up while fact-checking the knowledge
base against the actual source for this documentation pass — flagged here because this is the
page about what's deliberate vs. not.

- **Per-user `X-User-Sig` is sent but not verified.** `get_user_id()` in
  `backend_fast_api/src/hgs_refuce_app/main.py` trusts whatever `X-User-Id` header it receives
  and never checks the accompanying `X-User-Sig`. The separate service-to-service header
  (`X-Service-Sig*`, used by `/auth/login` and `/auth/sso-resolve`) *is* fully verified via
  `verify_service_auth`/`verify_service_hmac`. This is `backend-api.md`'s own tracked TODO, not a
  design choice. See [Authentication]({{ site.baseurl }}/architecture/authentication/).
- **`docker-compose.yml`'s `backend` service never receives `BACKEND_SHARED_SECRET` or
  `JWT_SECRET`**, even though the `frontend` service does. As shipped, the default Compose
  stack's HMAC-signed requests will not match on both sides. See
  [Running with Docker]({{ site.baseurl }}/getting-started/with-docker/).
- **Root `.env`'s `SECRET_KEY` is dead configuration.** It's passed into the `backend` container's
  environment, but no backend code reads `os.environ.get("SECRET_KEY")` anywhere — the actual
  signing key env var is `JWT_SECRET`. See
  [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/).
- **`/auth/sso-resolve` does not 404 unprovisioned users.** It queues a `PendingAccessRequest` for
  superadmin review instead. This isn't a reversed `DECIDED` entry, but it does contradict how
  `backend-api.md` currently describes the endpoint. See
  [Data model]({{ site.baseurl }}/architecture/data-model/).
- **Quarter locking has no dedicated boolean or audit trail.** A period is "locked" purely by the
  existence of a `Report` row; `DELETE /locations/{id}/reports/{period}` unlocks it by deleting
  that row, with nothing recording who unlocked it or when.

## See also

- [Overview]({{ site.baseurl }}/architecture/overview/)
- [Authentication]({{ site.baseurl }}/architecture/authentication/)
- [Data model]({{ site.baseurl }}/architecture/data-model/)
