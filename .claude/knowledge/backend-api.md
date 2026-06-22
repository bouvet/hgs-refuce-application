---
domain: backend-api
related: [database-layer, auth-rbac, data-repository]
---

# Backend API — Mental Model

## main.py

- OWNS: FastAPI application instance, route definitions, CORS configuration
- OWNS: root endpoint `/` and health check behavior
- READS FROM: environment variables (BACKEND_CORS_ORIGINS, ADMIN_SECRET)
- WRITES TO: HTTP responses, database via storage layer
- INVARIANT: CORS origins default to `http://localhost:3000` if env var not set
- INVARIANT: ADMIN_SECRET header required for `/admin/*` endpoints
- FLOW[auth]: POST /auth/login → parse User credentials → query database → return token/user info
- FLOW[registration]: GET/POST /locations/{id}/registrations → validate location ownership → read/write WasteRegistration records
- FLOW[reporting]: POST /locations/{id}/reports → lock quarter → prevent future edits → return Report
- TENSION: CORS string parsing is simple (`split(',')`), will break on whitespace; consider URL validation
- DECIDED: Single FastAPI app rather than blueprint-based modularization to keep routes simple and co-located with logic

## auth endpoints

- OWNS: POST /auth/login, POST /auth/sso-resolve
- READS FROM: request body — `/auth/login` `{ username, password }`; `/auth/sso-resolve` `{ email, name? }`
- WRITES TO: `/auth/login` returns `User { id, isAdmin, isSuperAdmin }`; `/auth/sso-resolve` returns `{ backendUserId, role }`
- INVARIANT: role is normalized to `user | admin | superadmin` via `_role_for(user)` (`superadmin` if `isSuperAdmin`, else `admin` if `isAdmin`, else `user`)
- INVARIANT: `/auth/sso-resolve` looks up the user by email (the backend user id) and 404s if not provisioned — it does NOT auto-create users
- DECIDED: no token generation; the session lives in Better Auth, the backend authenticates each request via the signed `X-User-Id` header

## currentUser endpoints

- OWNS: GET /currentUser, PATCH /currentUser/location
- READS FROM: `X-User-Id` (proxy-injected identity) via `get_user_id`
- WRITES TO: GET /currentUser returns `CurrentUser { backendUserId, role, locations, preferredLocationId }`; PATCH /currentUser/location updates `users.preferred_location_id`
- INVARIANT: GET /currentUser only returns a `preferredLocationId` the user still has access to (filtered against their locations)
- INVARIANT: PATCH /currentUSer/location validates the location belongs to the user (403 otherwise) before persisting
- INVARIANT: `preferred_location_id` is a nullable column on `users` (no separate table); migrated in via `ALTER TABLE ... ADD COLUMN` guarded for re-runs
- DECIDED: `/currentUser` is the frontend's single source for role + location; the frontend stores neither on the Better Auth session (see auth-rbac.md)

## location endpoints

- OWNS: GET/POST /locations (list/create)
- OWNS: GET/POST /locations/{id}/users (admin user management per location)
- READS FROM: user context (authenticated via login endpoint)
- WRITES TO: Location records in database
- INVARIANT: only super-admin can create locations (checked via user.role)
- INVARIANT: users can only see locations they are assigned to (verified in storage layer)

## registration endpoints

- OWNS: GET/POST/PUT/DELETE /locations/{id}/registrations/{id}
- READS FROM: WasteRegistration data (type, kg, notes, date)
- WRITES TO: WasteRegistration records, prevents edits after report locked
- INVARIANT: registration quarter must not exceed currently-locked quarter
- FLOW: GET registrations → filter by location+quarter → return sorted by date
- FLOW: POST registration → validate quarter not locked → insert into database
- FLOW: PUT registration → validate not locked → update existing record
- FLOW: DELETE registration → validate not locked → soft-delete (or hard delete, verify in models.py)
- TENSION: quarter locking checked at write time; concurrent reads of unlocked + write lock can race

## report endpoints

- OWNS: GET/POST /locations/{id}/reports (list/submit)
- OWNS: GET/DELETE /locations/{id}/reports/{period} (retrieve/unlock)
- READS FROM: Report submission body (quarter string YYYY-Qn)
- WRITES TO: Report records, locked status
- INVARIANT: POST locks the quarter; subsequent POSTs to same period fail
- INVARIANT: DELETE unlocks (soft-delete or full delete; verify in storage)
- FLOW[submit]: POST /locations/{id}/reports → validate quarter → insert Report with locked=true
- FLOW[retrieve]: GET /locations/{id}/reports/{period} → return Report details
- FLOW[unlock]: DELETE /locations/{id}/reports/{period} → set locked=false (or delete row)
- TENSION: deleting a report re-opens a quarter; no audit trail by default

## admin endpoints

- OWNS: GET/POST/DELETE /admin/locations, /admin/users (developer-only)
- READS FROM: ADMIN_SECRET header
- WRITES TO: Location and User records (developer overrides)
- INVARIANT: ADMIN_SECRET must match env var exactly; no hashing
- DECIDED: admin endpoints exist for local testing; never expose in production

## auth integration with Better Auth

- READS FROM: `X-User-Id` (+ `X-User-Sig-*` HMAC headers) on every request from the Next.js proxy; `get_user_id` currently trusts `X-User-Id`
- INVARIANT: `POST /auth/login` is still used — but only service-to-service from the PIN plugin (`backendServiceFetch` in `frontend/lib/server-api.ts`), never from the browser
- INVARIANT: SSO/`/currentUser`/`/currentUser/location` integration endpoints now EXIST (see "auth endpoints" / "currentUser endpoints" above). The frontend calls:
  - `POST /auth/sso-resolve { email, name? }` → `{ backendUserId, role }` from Better Auth `databaseHooks.user.create.before` (first SSO sign-in)
  - `GET /currentUser` → role + locations + preferred location, fetched per request by `frontend/lib/server-currentUser.ts`
  - `PATCH /currentUser/location { locationId }` from the `/select-location` server action
- DECIDED: **Reverses prior `frontend stores user state in localStorage`.** The session lives in Better Auth's Postgres tables; the backend is the role/location authority, called with a (signed) identity. The frontend stores only `backendUserId`.
- TODO (still open, security hardening): `get_user_id` does not yet VERIFY the `X-User-Sig` HMAC (payload `${version}.${timestamp}.${userId}`, ±60s skew) with `BACKEND_SHARED_SECRET`. The frontend already sends it; the backend should reject unsigned/invalid requests. Out of scope for the 2026-06 frontend refactor — backend changes were kept minimal (identity model unchanged).
