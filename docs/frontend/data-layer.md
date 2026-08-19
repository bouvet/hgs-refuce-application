---
layout: default
parent: Frontend
title: Data layer
nav_order: 3
---

# Data layer

All waste-registration and report data flows through a small repository abstraction, backed by an
authenticated reverse-proxy. The browser never talks to FastAPI directly and never knows its URL.

## `WasteRepository` interface — `frontend/lib/data/waste-repository.ts`

```ts
export interface WasteRepository {
  getRegistrations(): Promise<WasteRegistration[]>;
  getRegistrationByDate(date: string): Promise<WasteRegistration | null>;
  createRegistration(reg: WasteRegistration): Promise<void>;
  updateRegistration(reg: WasteRegistration): Promise<void>;
  deleteRegistration(id: string): Promise<void>;
  getRegistrationsByDateRange(from: string, to: string): Promise<WasteRegistration[]>;
  getRegistrationsInPeriod(period: string): Promise<WasteRegistration[]>;
  getReports(): Promise<Report[]>;
  getReportForPeriod(period: string): Promise<Report | null>;
  submitReport(period: string, submittedBy: string): Promise<Report>;
  unlockReport(period: string): Promise<void>;
  isPeriodLocked(periodOrDate: string): Promise<boolean>;
  getReportForDate(date: string): Promise<Report | null>;
}
```

`createWasteRepository(locationId: string)` is the factory that returns the concrete
implementation, scoped to a single location:

```ts
const API_URL = "/api";

export function createWasteRepository(locationId: string): WasteRepository {
  return new BackendWasteRepository(API_URL, locationId);
}
```

It takes **one** argument — `locationId`. There is no `userId` parameter: identity is injected
server-side by the Next.js proxy, never passed in by callers (see below). All call sites were
updated to this single-argument signature as part of the 2026-06 auth rewrite
(`.claude/knowledge/data-repository.md`); adding a `userId` parameter back would be a regression.

## `BackendWasteRepository` — `frontend/lib/data/backend-waste-repository.ts`

The HTTP client implementation. Every method builds a path under `/locations/{locationId}/...`
and calls a private `request<T>()` helper that wraps `fetch`, throwing an `HttpError` (with the
backend's `detail` message where available) on non-2xx/204 responses. All requests are made
against `this.baseUrl` (`/api`, i.e. always same-origin, relative), resolved against
`window.location.origin` in the browser or `http://localhost:3000` during SSR.

Two examples of how it maps to backend routes:

```ts
async getRegistrations(): Promise<WasteRegistration[]> {
  return this.request<WasteRegistration[]>(
    `/locations/${encodeURIComponent(this.locationId)}/registrations`,
  );
}

async submitReport(period: string, submittedBy: string): Promise<Report> {
  return this.request<Report>(
    `/locations/${encodeURIComponent(this.locationId)}/reports`,
    { method: "POST", body: JSON.stringify({ period, submittedBy }) },
  );
}
```

`isPeriodLocked` and `getReportForDate` both normalize a date to its `YYYY-Qn` quarter (via
`dateToQuarter` from `lib/quarters.ts`) before checking for a report — a report's mere existence
for that quarter means it's locked, mirroring the backend's `is_period_locked`/`is_date_locked` in
`storage.py` (see [Database]({{ site.baseurl }}/backend/database/)).

## The `/api/[...path]` proxy — where identity gets injected

`frontend/app/api/[...path]/route.ts` is the single choke point every backend call passes through.
It:

1. Calls `getServerSession()` — if there's no session, returns `401`.
2. Reads `backendUserId` off the session via `getBackendUserId(session.user)` — if missing (an SSO
   user Better Auth created but FastAPI never resolved), returns `403` rather than proxying
   anonymously.
3. Strips a fixed set of inbound headers (`BLOCKED_REQUEST_HEADERS`: `host`, `connection`,
   `x-user-id`, `x-user-sig*`, `x-service-sig*`) — the browser cannot supply its own identity, no
   matter what it sends.
4. Adds the real identity headers via `userIdentityHeaders(backendUserId)` from
   `lib/server-api.ts` — an HMAC-signed `X-User-Id` / `X-User-Sig-Version` / `X-User-Sig-Timestamp`
   / `X-User-Sig` header set (see [Authentication]({{ site.baseurl }}/architecture/authentication/)
   for the signing scheme).
5. Forwards the request (method, remaining headers, body, query string) to `BACKEND_API_URL` and
   streams the response back, stripping a small set of hop-by-hop response headers
   (`connection`, `transfer-encoding`, `content-encoding`).

```ts
const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
```

`BACKEND_API_URL` is read directly from `process.env` inside this server-only route handler — it
is **not** prefixed with `NEXT_PUBLIC_`, so it is never bundled into client JavaScript and the
browser has no way to discover or call the backend directly. This is a deliberate reversal of an
earlier `NEXT_PUBLIC_API_URL` design (`.claude/knowledge/frontend-architecture.md`, `DECIDED`):
exposing the backend URL to the browser was unnecessary once every call routes through this proxy,
and keeping it server-side lets the proxy attach the HMAC secret without any risk of leaking it.

`app/api/auth/[...all]/route.ts` handles Better Auth's own endpoints (`/api/auth/*`) — Next.js
dispatches the more specific dynamic segment first, so the catch-all proxy above never intercepts
those paths, and `proxy.ts`'s matcher also explicitly excludes `api/auth`.

## Summary of the request path

```
component
  → createWasteRepository(locationId)
  → BackendWasteRepository.request() — fetch("/api/locations/{id}/...")
  → app/api/[...path]/route.ts — verifies session, injects signed identity, forwards
  → FastAPI (BACKEND_API_URL) — trusts the signed X-User-Id, never a client-supplied one
```

See [Data model]({{ site.baseurl }}/architecture/data-model/) for the `WasteRegistration`/`Report`
shapes shared (informally — there's no code generation) between the frontend TypeScript types in
`lib/types.ts` and the backend Pydantic models in `models.py`.
