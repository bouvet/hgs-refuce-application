---
domain: data-repository
related: [backend-api, frontend-architecture]
---

# Data Repository Pattern — Mental Model

## WasteRepository interface

- OWNS: abstract interface defining all data operations (list, create, update, delete registrations/reports)
- OWNS: async methods for registrations, reports, locations, users
- READS FROM: implemented by BackendWasteRepository
- INVARIANT: singleton instance wasteRepository exported from waste-repository.ts
- INVARIANT: all frontend data reads/writes go through this single instance (no direct API calls)
- DECIDED: repository pattern centralizes API logic; easier to swap implementations (testing, offline mode)

## BackendWasteRepository

- OWNS: HTTP client implementation of WasteRepository interface
- OWNS: fetch() calls to NEXT_PUBLIC_API_URL endpoints
- READS FROM: environment variable NEXT_PUBLIC_API_URL, localStorage for auth state
- WRITES TO: HTTP requests to backend, no local state persistence
- INVARIANT: base URL defaults to http://localhost:8000
- INVARIANT: auth state (user role, email) assumed available in UserProvider (fetched via separate /auth/login call)
- INVARIANT: no request/response caching; every call hits backend
- FLOW[list_registrations]: WasteRepository.getRegistrations(locationId) → GET /locations/{id}/registrations → parse response → return WasteRegistration[]
- FLOW[create_registration]: WasteRepository.createRegistration() → POST /locations/{id}/registrations → return created WasteRegistration
- FLOW[list_reports]: WasteRepository.getReports(locationId) → GET /locations/{id}/reports → return Report[]
- FLOW[submit_report]: WasteRepository.submitReport(locationId, period) → POST /locations/{id}/reports → lock quarter
- TENSION: no caching means high backend load on rapid page navigations; consider React Query or SWR

## singleton pattern

- OWNS: single wasteRepository instance shared across entire frontend
- INVARIANT: created once at app startup (imported in components)
- DECIDED: singleton simplifies prop drilling; central point for adding caching/interceptors later
- TENSION: singleton makes testing harder (requires dependency injection or module mocking)

## data types

- OWNS: TypeScript types for WasteRegistration, Report, Location, User (mirror backend Pydantic models)
- INVARIANT: WasteRegistration has id, type, kg, date, notes, locationId
- INVARIANT: Report has id, period (YYYY-Qn), locationId, locked
- INVARIANT: period always formatted as YYYY-Qn (quarter string)

## error handling

- OWNS: fetch error responses (4xx, 5xx), parsing errors
- READS FROM: HTTP status codes from backend
- INVARIANT: errors logged to console but not user-facing (check components for toast/alert handling)
- TENSION: no centralized error boundary for API errors; each component handles locally

## identity model (updated)

- OWNS: identity injection happens server-side in `frontend/app/api/[...path]/route.ts` via `userIdentityHeaders(session.user.backendUserId)`
- READS FROM: Better Auth session (via `getServerSession()`)
- WRITES TO: outbound HMAC-signed headers `X-User-Id`, `X-User-Sig-Version`, `X-User-Sig-Timestamp`, `X-User-Sig`
- INVARIANT: **`BackendWasteRepository` no longer takes a `userId` constructor arg** and does not set any `X-User-Id` header. The proxy is the sole authority on identity.
- INVARIANT: **`createWasteRepository(locationId)` takes ONE argument**, not `(locationId, userId)`. All 11 call sites updated.
- INVARIANT: **`lib/api.ts` no longer accepts `userId` arguments** on any method. The old `api.login()` is also gone (sign-in is `authClient.signIn.{social, pin}` instead).
- INVARIANT: the route handler strips any client-sent identity headers (`BLOCKED_REQUEST_HEADERS` set) before forwarding, preventing impersonation.
- DECIDED: **Reverses prior `auth state available in UserProvider`.** Repositories are now stateless w.r.t. identity — the proxy handles it. This eliminates a whole class of bugs where the wrong userId was passed.
