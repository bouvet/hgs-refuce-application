---
layout: default
parent: Architecture
title: Authentication
nav_order: 2
---

# Authentication

Sessions live in **Better Auth 1.6**, configured in `frontend/lib/auth.ts`. The backend
(`backend_fast_api/`) remains the source of truth for credentials (PIN), roles, and location
membership — Better Auth stores identity only. This page cites the actual files read while writing
it; where the code differs from a prior written summary, that's called out explicitly.

## Two sign-in paths

### Microsoft Entra ID SSO

`frontend/lib/auth.ts` registers the built-in `microsoft` social provider under `socialProviders`,
configured with `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID`.

On the **first** sign-in for a given Entra account, Better Auth's `databaseHooks.user.create.before`
hook (also in `lib/auth.ts`) calls `resolveSsoUser()`, which POSTs to FastAPI's
`POST /auth/sso-resolve` with `{ email, name }`, signed with the service-to-service HMAC headers
(`backendServiceFetch`, `frontend/lib/server-api.ts`).

```
authClient.signIn.social({ provider: "microsoft" })
  → Entra OIDC roundtrip
  → /api/auth/callback/microsoft
  → databaseHooks.user.create.before
  → POST /auth/sso-resolve { email, name }  (X-Service-Sig*, HMAC-verified by the backend)
  → backend looks up user by email
```

**Verified against `backend_fast_api/src/hgs_refuce_app/main.py`:** `sso_resolve()` does **not**
404 when the email is unknown. It always returns `200` with a discriminated response
(`SsoResolveResponse` in `models.py`):

- `{ status: "resolved", backendUserId, role }` — the email matched an existing backend user.
- `{ status: "pending" }` — the email is unknown. The backend calls
  `user_storage.upsert_pending_request(email, name)`, queuing a row a superadmin can later approve
  or dismiss from the admin panel (`GET`/`DELETE` on the pending-access-request endpoints in
  `main.py`).

On `resolved`, the hook stores **only** `backendUserId` on the new Better Auth `user` row — `role`
is deliberately not persisted there, even though the response includes it. On `pending` (or a
transport failure — `resolveSsoUser` catches and returns `null`), the Better Auth user is still
created, but without a `backendUserId`. That user lands on `/select-location`, which shows an
"awaiting approval" notice, and future requests can lazily re-resolve once a superadmin provisions
the account.

### Username + PIN

`frontend/lib/auth-plugins/pin-credentials.ts` is a custom Better Auth plugin (`pinCredentials()`)
that registers `POST /api/auth/sign-in/pin`, accepting `{ username, pin }` (validated with a zod
schema).

```
authClient.signIn.pin({ username, pin })
  → POST /api/auth/sign-in/pin
  → POST /auth/login { username, password: pin }  (X-Service-Sig*, HMAC-verified by the backend)
  → backend validates the PIN, returns { accessToken, user: { id, isAdmin, isSuperAdmin } }
  → plugin upserts a Better Auth user keyed on synthetic email "${username}@pin.local"
  → adapter.createSession(user.id)
  → setSessionCookie(ctx, { session, user })
```

Only `backendUserId` (from `payload.user.id`) is persisted on the Better Auth row — role is not
read from the login response here either; it's fetched later via `/currentUser`. Any non-2xx from
the backend, or any adapter failure (e.g. a `backendUserId` unique-constraint collision), throws a
generic `APIError("UNAUTHORIZED", { message: "Invalid username or PIN" })` so the endpoint never
reveals whether a username exists.

`POST /auth/login` is also the same endpoint the backend exposes for its own historical JWT flow
(`LoginResponse` includes an `accessToken` signed with `JWT_SECRET`), but that token is not used
anywhere in the current Better Auth flow — the plugin discards it and relies on Better Auth's own
session/cookie mechanism instead.

## The HMAC identity header — two distinct schemes

`frontend/lib/server-api.ts` builds two different header sets, both HMAC-SHA256 over
`${version}.${timestamp}.${subject}` using `BACKEND_SHARED_SECRET`:

| Header set | Subject in payload | Sent by | Verified by backend? |
| --- | --- | --- | --- |
| `X-User-Id`, `X-User-Sig-Timestamp`, `X-User-Sig-Version`, `X-User-Sig` | the signed-in user's `backendUserId` | `app/api/[...path]/route.ts` on every proxied data call (`/locations/*`, `/currentUser`, etc.) | **No** — `get_user_id()` in `backend_fast_api/src/hgs_refuce_app/main.py` reads `X-User-Id` directly and does not check `X-User-Sig` at all. This is an open, tracked gap, not a design choice — see [Decisions]({{ site.baseurl }}/architecture/decisions/). |
| `X-Service-Sig-Timestamp`, `X-Service-Sig-Version`, `X-Service-Sig` | the literal string `service` | Better Auth server code calling `POST /auth/login` and `POST /auth/sso-resolve` (`backendServiceFetch`) | **Yes** — `verify_service_auth` / `verify_service_hmac` in `backend_fast_api/src/hgs_refuce_app/{main,auth}.py` reject missing, expired (>300s clock skew), or invalid signatures with `401`. |

`app/api/[...path]/route.ts` unconditionally strips any client-sent `X-User-Id`/`X-User-Sig*`
headers before forwarding, so a browser cannot forge them — but note the backend does not currently
need to be forged against, since it isn't checking the signature on that path yet.

## Roles

Three roles, normalized by the backend's `_role_for(user)` helper from two booleans on the FastAPI
`User` model (`isAdmin`, `isSuperAdmin` — see
[Data model]({{ site.baseurl }}/architecture/data-model/)):

- **`user`** — register own waste only.
- **`admin`** — user pages plus admin pages (oversikt, rapportering, registreringer, statistikk).
- **`superadmin`** — admin pages plus `/sadmin` (location/user provisioning, pending-access-request review).

The role is never stored on the Better Auth session. `frontend/lib/server-session.ts`'s
`requireRole()` calls `getCurrentUser()` (backed by `GET /currentUser`) on every check; there is no
cached copy to go stale.

## Server-side guards

`frontend/lib/server-session.ts` exports:

- `getServerSession()` — wraps `auth.api.getSession({ headers })`.
- `requireSession(redirectTo?)` — redirects to `/login` (optionally with `?redirect=`) if signed out.
- `requireRole(role | Role[], redirectTo?)` — calls `requireSession()`, then fetches the current
  role from the backend and redirects to `/` if it doesn't match.

Every admin-only page (`oversikt`, `rapportering`, `statistikk`, `registreringer`) calls
`requireRole(["admin", "superadmin"])` itself; `/sadmin` calls `requireRole("superadmin")`. There
are no client-side route guards — `useCurrentUser()` (`frontend/hooks/use-current-user.ts`) is for
rendering only.

## Related pages

- [Overview]({{ site.baseurl }}/architecture/overview/) — where this fits in the overall request flow and trust boundaries.
- [Data model]({{ site.baseurl }}/architecture/data-model/) — the `User` and `CurrentUser` models referenced above.
- [Decisions]({{ site.baseurl }}/architecture/decisions/) — why identity-only sessions, why no client guards, and the open HMAC-verification gap.
- [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/) — `BACKEND_SHARED_SECRET`, `MICROSOFT_*`, and friends.
- [Frontend: Auth]({{ site.baseurl }}/frontend/auth/) — the frontend-side implementation detail (hooks, guards, components) that consumes everything described above.
