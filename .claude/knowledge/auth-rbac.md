---
domain: auth-rbac
related:
  [backend-api, database-layer, component-structure, frontend-architecture]
---

# Authentication & RBAC — Mental Model

> **MAJOR REWRITE (2026-06):** Auth moved from a localStorage role selector to **Better Auth 1.6** running inside Next.js. All `DECIDED` entries below supersede the previous localStorage-era model. The Python backend remains the source of truth for _roles_ and _location membership_, but it is no longer the credential authority for SSO (Entra ID is) and no longer the session authority for either flow (Better Auth is).

> **REFINEMENT (2026-06, backend-authoritative):** Better Auth now stores **identity only** (`backendUserId`). Role and the user's locations/preferred location are NOT mirrored onto the BA `user` row — they are fetched live from FastAPI `GET /currentUser` per request via `lib/server-currentUser.ts` (deduped with React `cache()`). This reverses the earlier "mirror role/preferredLocationId/currentLocationId onto the session" decisions below. Rationale: a mirrored copy goes stale (it caused a `/select-location` redirect loop and stale-role bugs under the BA cookie cache); keeping the backend authoritative removes the two-store divergence. The BA session cookie cache is **disabled** so server checks always read fresh.

## roles

- OWNS: three-tier role model: `user` | `admin` | `superadmin`
- INVARIANT: `user` — register own waste only
- INVARIANT: `admin` — user pages + admin pages (oversikt, rapportering, registreringer, statistikk)
- INVARIANT: `superadmin` — admin pages + `/sadmin` (location/user provisioning)
- INVARIANT: `role` is owned by FastAPI and derived from `isSuperAdmin`/`isAdmin` flags, normalized in the `/currentUser` and `/auth/sso-resolve` responses (`superadmin` if `isSuperAdmin`, else `admin` if `isAdmin`, else `user`). It is NOT stored on the Better Auth `user` row — fetch it via `lib/server-currentUser.ts` (`getCurrentUser`). `requireRole` reads it from `/currentUser`, never from the session.
- DECIDED: **Reverses prior `roles: two roles admin and common` decision.** Consolidated to three roles to give the existing super-admin endpoints (`/admin/*` in FastAPI) a first-class frontend role instead of a magic `isSuperAdmin` boolean. `common` was renamed to `user` for clarity.

## authentication flow

- OWNS: Better Auth (`frontend/lib/auth.ts`) is the session authority for _both_ sign-in flows
- OWNS: Entra ID is the credential authority for SSO; FastAPI is the credential authority for PIN
- OWNS: HMAC-signed identity header (`X-User-Id` + `X-User-Sig-*` + `X-User-Sig`) on every proxied call — backend trusts the signature, never client-supplied identity
- READS FROM: cookie `avfall.session_token` (Better Auth, http-only, signed)
- READS FROM: `BETTER_AUTH_SECRET`, `BACKEND_SHARED_SECRET`, `MICROSOFT_{CLIENT_ID,CLIENT_SECRET,TENANT_ID}` from env
- WRITES TO: Better Auth Postgres tables (`user`, `session`, `account`, `verification`)
- FLOW[sso_sign_in]: user clicks “Logg inn med Microsoft” → `authClient.signIn.social({ provider: "microsoft" })` → OIDC roundtrip to Entra → callback hits `/api/auth/callback/microsoft` → Better Auth `databaseHooks.user.create.before` calls `POST /auth/sso-resolve { email, name }` on FastAPI → backend returns `{ backendUserId, role }` → hook stores ONLY `backendUserId` on the new BA user row (role is NOT persisted) → session cookie issued → redirect to `/` → RSC redirect-chain calls `/currentUSer` for role/location and lands on role default route.
- FLOW[pin_sign_in]: user enters `{ username, pin }` on `/login` → `authClient.signIn.pin({ username, pin })` → custom Better Auth endpoint `POST /api/auth/sign-in/pin` (in `lib/auth-plugins/pin-credentials.ts`) → service-to-service `POST /auth/login` to FastAPI (HMAC-signed) → backend validates pin → plugin upserts a BA user keyed on synthetic email `${username}@pin.local` with the backend payload merged in → `adapter.createSession(user.id)` → `setSessionCookie(ctx, { session, user })` → redirect by client.
- FLOW[sign_out]: client calls `authClient.signOut({ fetchOptions: { onSuccess: () => router.replace("/login") } })` → Better Auth deletes the session row and clears the cookie.
- DECIDED: **Reverses prior `frontend stores in UserProvider + localStorage` decision.** Sessions live in an http-only signed cookie managed by Better Auth; the browser never sees session data. `UserProvider`, `lib/user-context.ts`, and `boss-app:current-user` localStorage key are deleted.
- DECIDED: **Reverses prior `no token-based session (uncommon but intentional)`.** Cookie-based sessions are now the norm. Backend trust still does not use JWTs — instead, the proxy mints a short-lived HMAC over `${version}.${timestamp}.${userId}` per request.

## proxy & request authentication

- OWNS: `frontend/proxy.ts` (Next.js 16 — NOT `middleware.ts`; see frontend-architecture.md)
- OWNS: `frontend/app/api/[...path]/route.ts` (server-side proxy to FastAPI)
- READS FROM: Better Auth cookie cache via `getSessionCookie(request, { cookiePrefix: "avfall" })` in `proxy.ts` (optimistic only, no DB hit)
- READS FROM: `getServerSession()` from `lib/server-session.ts` in the route handler (validates against Postgres)
- WRITES TO: outbound request — strips any client-sent `X-User-Id`/`X-User-Sig*` headers and replaces with `userIdentityHeaders(session.user.backendUserId)`
- INVARIANT: **`proxy.ts` is optimistic only** — Next 16 middleware/proxy cannot be the security boundary. Real authorisation happens in `/api/[...path]/route.ts` and in server components via `requireSession()`/`requireRole()`.
- INVARIANT: the proxy returns `401` if no session, `403` if the session has no `backendUserId` (means user signed in via SSO but FastAPI never resolved them)
- INVARIANT: every backend request from the browser flows through `/api/[...path]` — the frontend never has the backend URL
- INVARIANT: HMAC version (`X-User-Sig-Version`) is currently `"1"`; bump and accept both during rollover when rotating the secret
- DECIDED: **Reverses prior `each request to backend carries no explicit auth header`.** Every request now carries the signed identity triple; backend should verify `X-User-Sig` with `BACKEND_SHARED_SECRET` and a clock skew tolerance.
- DECIDED: **Reverses prior `frontend trust model: backend accepts role from UserProvider`.** Backend gets identity (userId) from the signed header and re-derives the role from its own user table. The frontend cannot impersonate or escalate.

## authorization

- OWNS: server-side guards in `frontend/lib/server-session.ts`: `getServerSession()`, `requireSession(redirectTo?)`, `requireRole(role | Role[], redirectTo?)`
- OWNS: per-page authorisation in RSC `page.tsx`/`layout.tsx` — e.g. `app/(app)/sadmin/page.tsx` calls `await requireRole("superadmin")`
- OWNS: client-side role-aware rendering in `components/layout/app-sidebar.tsx`, `app-header.tsx`, `app-nav.tsx` via `useCurrentUser()`
- READS FROM: `session.user.role` (server) and `user.role` from `useCurrentUser()` (client)
- INVARIANT: page-level authorisation is server-side; client `useCurrentUser()` is for _rendering_ only — never the security boundary
- INVARIANT: **every admin-only page gates server-side** with `await requireRole(["admin","superadmin"])` — `oversikt`, `rapportering`, `statistikk`, `registreringer`; `/sadmin` uses `requireRole("superadmin")`. The `(app)/layout` `requireSession()` + location check is NOT sufficient on its own (a plain `user` could otherwise open admin pages by URL).
- INVARIANT: `app/(app)/layout.tsx` calls `requireSession()`, fetches `/currentUser`, redirects to `/select-location` if `preferredLocationId` is null, and seeds the read-only `SessionProvider` from the `/currentUser` result
- INVARIANT: `app/page.tsx` is an RSC redirect: no session → `/login`; no location → `/select-location`; role default → `/registrer` (user) or `/oversikt` (admin/superadmin), with role/location read from `/currentUser`
- DECIDED: **Reverses prior `RoleGuard` / `SuperAdminGuard` client component pattern.** Authorisation moved into RSC server-side helpers. Files deleted: `components/auth/{role-guard,superadmin-guard,role-selector}.tsx`.
- DECIDED (2026-06): admin pages must each call `requireRole` — gating only in the route-group layout was considered but the per-page guard keeps the role fetch close to the protected content and lets `user`-role pages (`registrer`, `historikk`) share the same layout.

## useCurrentUser hook

- OWNS: `frontend/hooks/use-current-user.ts` — reads the read-only `SessionProvider` (`components/providers/session-provider.tsx`)
- OWNS: returns `{ user: User | null, locationId: string | null, isPending: boolean }`
- READS FROM: `SessionProvider`, which `app/(app)/layout.tsx` seeds **server-side** from the backend `/currentUser` response (role + locations + preferred location). NOT from `authClient.useSession()` anymore.
- INVARIANT: `user.id` is the **backend** user id, NOT the Better Auth uuid — preserves the legacy contract consumers rely on for `createdBy` and admin API calls
- INVARIANT: `user.role` and `locationId` come from the backend `/currentUser` (source of truth), seeded by the server; the client cannot mutate them
- INVARIANT: `isPending` is always `false` — the value is seeded synchronously by the server layout, so there is no client loading state
- INVARIANT: `User` type no longer carries `currentLocationId`; the active location is exposed separately as `locationId`
- INVARIANT: no setters — mutations go through server actions (`setCurrentLocation`) then `router.refresh()`, which re-runs the layout and re-seeds the provider
- DECIDED (2026-06): client reads role/location from a server-seeded read-only provider, not from `authClient.useSession()`, because the session no longer carries role/location. `useSession()` is still used for sign-out only.
- DECIDED: **Reverses prior `UserProvider.setUser() + setLocationId()` mutation model.** Client reads but cannot mutate.

## location selection

- OWNS: `frontend/app/select-location/{page,actions,location-picker}.tsx`
- OWNS: server action `setCurrentLocation(locationId)` in `actions.ts`
- READS FROM: backend `GET /currentUSer` (role + permitted locations + preferred location) via `lib/server-currentUSer.ts`
- WRITES TO: backend `PATCH /currentUser/location` only (`{ locationId }`); the backend validates the user has access and stores `preferred_location_id`. Nothing is written to the Better Auth row.
- INVARIANT: 1 location → auto-selected and redirected to `/oversikt`; many → `<LocationPicker>`; zero → error “Ingen lokasjoner”; no backend user → “Bruker ikke klargjort”
- INVARIANT: the active location is the backend's `preferredLocationId`, read via `useCurrentUser().locationId` (server-seeded); there is no `currentLocationId` on the session anymore
- INVARIANT: `setCurrentLocation` THROWS if the backend PATCH fails (no silent best-effort) — the location is the backend's to persist
- DECIDED (2026-06): **Reverses prior "write BOTH backend and BA row via raw SQL" decision.** The raw `UPDATE "user"` against the BA-owned table (and its duplicate pg pool) is gone. Backend `PATCH /currentUser/location` is the only write; the next request reads it back through `/currentUSer`. Removes two-store divergence and the cookie-cache redirect loop.

## PIN credentials plugin

- OWNS: `frontend/lib/auth-plugins/pin-credentials.ts` (server) + `pin-credentials-client.ts` (client `$InferServerPlugin`)
- OWNS: endpoint `POST /api/auth/sign-in/pin` with zod body `{ username: string, pin: string }`
- READS FROM: FastAPI `POST /auth/login` (service-to-service, HMAC-signed) via `backendServiceFetch()`
- WRITES TO: Better Auth `user` table (upsert via `internalAdapter.findUserByEmail` / `createUser` / `updateUser`, storing ONLY `backendUserId`) and `session` table (via `adapter.createSession(user.id)`)
- INVARIANT: synthetic email format is `${username}@pin.local` to satisfy Better Auth's email-as-unique-key constraint without polluting real email space
- INVARIANT: the plugin stores identity only (`backendUserId`); it does NOT read or persist role/location from the `/auth/login` payload — role comes from `/currentUSer` later
- INVARIANT: any non-2xx from FastAPI, and any adapter failure (e.g. `backendUserId` unique-constraint collision), throws `new APIError("UNAUTHORIZED", { message: "Invalid username or PIN" })` — generic, never leaks whether the username exists, and never surfaces a raw 500
- INVARIANT: `signIn.pin` returns `{ data, error }` (Better Auth does not throw on 4xx); the client (`login-form.tsx`) must check `result.error` and NOT navigate on failure
- INVARIANT: `adapter.createSession(userId)` — only first positional arg is the userId; second positional is `dontRememberMe: boolean`, NOT the endpoint ctx (this was a real bug caught by `tsc`)
- DECIDED: PIN plugin keeps FastAPI as the credential authority (no password rewrite) while letting Better Auth own session/cookie/rate-limit/CSRF. Clean separation.

## auth-client export pattern

- OWNS: `frontend/lib/auth-client.ts`
- INVARIANT: re-exports must be explicit aliases, NOT destructured — `export const useSession = authClient.useSession;` rather than `export const { useSession } = authClient;`
- TENSION: destructuring at module level loses the generic flow from the auth client's plugin types, causing `useSession()` to infer `data: never` in consumers. Explicit aliases preserve inference.
- DECIDED: this is a Better Auth + TS quirk worth documenting because the symptom (`Property 'user' does not exist on type 'never'`) is opaque.

## superadmin / admin endpoints

- OWNS: `/admin/*` endpoints on FastAPI (still exist; still require `ADMIN_SECRET` header or superadmin user)
- OWNS: `components/admin/superadmin-content.tsx` (in `app/(app)/sadmin`) — user/location management UI
- READS FROM: `api.getMyLocations()`, `api.listAllUsers()`, etc. — all in `lib/api.ts`, all with no `userId` argument
- INVARIANT: no API call accepts a `userId` argument from the client — identity is always proxy-injected from the signed cookie
- DECIDED: **Reverses prior `api.* (userId, ...)` pattern.** The client cannot pass `userId` even to admin endpoints; impersonation is structurally impossible from the browser.

## rate limiting & security

- OWNS: Better Auth `rateLimit` config — `/sign-in/pin: { window: 60, max: 5 }` (5 PIN attempts per minute per IP)
- INVARIANT: `BETTER_AUTH_SECRET` is **required** (via `authEnv.secret`) and passed explicitly to `betterAuth({ secret })` — the app fails loud on boot if it's unset (no implicit/auto secret)
- INVARIANT: `AUTH_DATABASE_URL` (Better Auth Postgres) and the FastAPI `DATABASE_URL` are **different databases on different servers** — deliberately different env var names to prevent accidental aliasing. They must never share a connection pool. In docker-compose the `postgres_ba` service owns `refuce_auth`; the backend uses SQLite (dev) or its own Postgres (prod). No cross-database queries exist.
- INVARIANT: `BACKEND_SHARED_SECRET` is **required** (`authEnv.backendSharedSecret`) — used to HMAC-sign every proxied request and every service-to-service call. App throws on boot if unset. Must match the FastAPI `BACKEND_SHARED_SECRET` env var.
- INVARIANT: Microsoft `tenantId` is **required** (`MICROSOFT_TENANT_ID`, no `"common"` default) — pinned to the Bouvet tenant so arbitrary Microsoft accounts can't authenticate. `.env.local` currently has `"common"` for local dev convenience; this MUST be replaced with the Bouvet tenant id before any production/staging deployment.
- INVARIANT: secure cookies enabled in production (`useSecureCookies: process.env.NODE_ENV === "production"`)
- INVARIANT: cookie prefix `"avfall"` (custom — ensure `getSessionCookie` callers pass `{ cookiePrefix: "avfall" }`)
- INVARIANT: `trustedOrigins: [authEnv.baseURL]` — set `BETTER_AUTH_URL` to the public frontend origin in each environment
- INVARIANT: session 7d max-age, 24h update window; **cookie cache DISABLED** (`cookieCache: { enabled: false }`)
- INVARIANT: the `?redirect=` param is sanitized by `lib/safe-redirect.ts` (`sanitizeRedirect`) to a same-origin relative path before any `redirect()`/`callbackURL` use — guards against open redirects
- DECIDED (2026-06): **Reverses prior "cookie cache enabled (5min)" decision.** Disabled so server checks (`requireSession`/`requireRole`, the `/api` proxy) always read fresh from Postgres. The session carries identity only and role/location are fetched per request, so there is no cached auth data; revocation and role/location changes are visible immediately. `proxy.ts` only checks cookie _presence_, so it is unaffected.

## debug page

- OWNS: `frontend/app/debug/page.tsx`
- INVARIANT: previously auto-impersonated `sadmin`; now just a static notice page (the localStorage trick is incompatible with cookie-based sessions)
- DECIDED: **Reverses prior `/debug accessible without auth (dev helper)`.** Use a real seeded backend account for local dev.
