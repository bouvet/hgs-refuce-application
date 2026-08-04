---
title: Frontend
layout: default
nav_order: 5
has_children: true
---

# Frontend

Next.js, TypeScript, Tailwind CSS v4, shadcn/UI.

## Auth

Better Auth 1.6 (`frontend/lib/auth.ts`) in Next.js with its own Postgres tables. Two sign-in paths:

- **Microsoft SSO** via the built-in `microsoft` social provider (Entra ID); on first sign-in, a
  `databaseHooks.user.create.before` hook calls `POST /auth/sso-resolve` on FastAPI to mirror role
  and preferred location onto the Better Auth user.
- **Username + PIN** via a custom plugin (`lib/auth-plugins/pin-credentials.ts`) that proxies
  credentials to FastAPI `POST /auth/login` and creates a session on success.

Three roles: `user` | `admin` | `superadmin`. Server-side authorisation via `requireSession()` /
`requireRole()` in `lib/server-session.ts`. No client-side guards.

The `/api/[...path]` proxy and `proxy.ts` enforce the session; `proxy.ts` is **optimistic only** —
real checks happen in the route handler and RSCs.

## Routing

All authenticated pages live under `app/(app)/` (oversikt, statistikk, historikk, registrer,
registreringer, rapportering). `app/(app)/layout.tsx` calls `requireSession()`; superadmin pages
call `requireRole("superadmin")`.

## Data layer

`lib/data/waste-repository.ts` exports the `WasteRepository` interface and a
`createWasteRepository(locationId)` factory backed by `BackendWasteRepository`
(`lib/data/backend-waste-repository.ts`). The browser only ever calls `/api/*`; the backend URL is
server-side (`BACKEND_API_URL`, no `NEXT_PUBLIC_` prefix). Periods are tracked as `YYYY-Qn` quarter
strings; a submitted report locks its quarter.

## Patterns

- **Pages → Components**: `page.tsx` files are server components that import a single
  `*-content.tsx` client component for interactivity.
- **Styling**: Tailwind CSS v4 — config lives in `app/globals.css`, not a config file. Uses oklch
  colors.
- **UI components**: shadcn/UI `base-vega` style (uses `@base-ui/react`, not Radix UI). Add with
  `npx shadcn@latest add <name>`.
