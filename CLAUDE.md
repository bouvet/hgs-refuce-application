# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**hgs-refuce-application** — tracks refuse/waste from a local Bouvet office. Two sub-projects:

- `backend_fast_api/` — Python + FastAPI + SQLAlchemy (SQLite locally, PostgreSQL in production)
- `frontend/` — Next.js 16, TypeScript, Tailwind CSS v4, shadcn/UI

Each sub-project has its own `CLAUDE.md` with detailed guidance. Read those before working in the respective sub-project.

## Starting both services

Three scripts at the repo root start the backend and frontend together. All require a `.venv` in `backend_fast_api/` — if it's missing they will print setup instructions and exit.

| Script      | Platform             |
| ----------- | -------------------- |
| `start.bat` | Windows (cmd)        |
| `start.ps1` | Windows (PowerShell) |
| `start.sh`  | bash / WSL           |

One-time setup before first run:

```bash
python -m venv backend_fast_api/.venv
# Windows:
backend_fast_api\.venv\Scripts\activate
# bash/WSL:
source backend_fast_api/.venv/bin/activate

pip install -r backend_fast_api/requirements.txt
```

## Commands

### Backend (`backend_fast_api/`)

```bash
pip install -r requirements.txt
uvicorn hgs_refuce_app.main:app --reload   # dev server
pytest                                      # all tests
pytest tests/test_endpoints.py::test_add_and_get_datapoint  # single test
```

### Frontend (`frontend/`)

```bash
npm run dev     # dev server on localhost:3000 (Turbopack)
npm run build   # production build
npm run lint    # ESLint
```

## Architecture

### Overall data flow

```
user → frontend → backend → SQLite (dev) / PostgreSQL (prod)
```

The backend is the authority on data shape and on roles/location membership. The frontend calls the backend for all waste registration and report data via `lib/data/backend-waste-repository.ts`. **Authentication and sessions** live in **Better Auth** inside Next.js (Postgres-backed) — either Microsoft Entra ID SSO or a username/PIN form that delegates credential verification to FastAPI. The Next.js proxy at `/api/[...path]` injects an HMAC-signed identity header on every backend call; the backend never trusts client-supplied identity.

### Backend

- `src/hgs_refuce_app/main.py` — FastAPI app; default port 8000, CORS origins controlled by `BACKEND_CORS_ORIGINS` env var (defaults to `http://localhost:3000`)
  - `POST /auth/login` — authenticate a user
  - `GET/POST /locations` — list user's locations or create one (super-admin)
  - `GET/POST /locations/{id}/registrations` — list/create waste registrations for a location
  - `GET/PUT/DELETE /locations/{id}/registrations/{id}` — get, update, delete a registration
  - `GET/POST /locations/{id}/reports` — list/submit a quarterly report (locks that quarter)
  - `GET/DELETE /locations/{id}/reports/{period}` — get or delete (unlock) a report
  - `GET/POST/DELETE /users`, `/locations/{id}/users` — user management (admin)
  - `GET/POST /admin/locations`, `/admin/users` — developer-only endpoints (require `ADMIN_SECRET` header)
- `src/hgs_refuce_app/storage.py` — `DatabaseConnection`, `UserStorage`, `DataStorage` classes using SQLAlchemy (SQLite dev / PostgreSQL prod)
- `src/hgs_refuce_app/models.py` — Pydantic models: `WasteRegistration`, `Report`, `Location`, `User`, etc.

Tests use FastAPI's `TestClient` against the live app instance and clear the DB with `setup_function()` between tests.

### Frontend

- **Auth**: **Better Auth 1.6** (`frontend/lib/auth.ts`) in Next.js with its own Postgres tables. Two sign-in paths:
  - **Microsoft SSO** via the built-in `microsoft` social provider (Entra ID); on first sign-in, a `databaseHooks.user.create.before` hook calls `POST /auth/sso-resolve` on FastAPI to mirror role + preferred location onto the BA user.
  - **Username + PIN** via a custom plugin (`lib/auth-plugins/pin-credentials.ts`) that proxies credentials to FastAPI `POST /auth/login` and creates a BA session on success.
  - Three roles: `user` | `admin` | `superadmin`. Server-side authorisation via `requireSession()` / `requireRole()` in `lib/server-session.ts`. No client-side guards.
  - The `/api/[...path]` proxy and `proxy.ts` (Next 16 name for middleware) enforce the session; `proxy.ts` is **optimistic only** — real checks happen in the route handler and RSCs.
- **Routing**: All authenticated pages live under `app/(app)/` (oversikt, statistikk, historikk, registrer, registreringer, rapportering). `app/(app)/layout.tsx` calls `requireSession()`; superadmin pages call `requireRole("superadmin")`.
- **Data layer**: `lib/data/waste-repository.ts` exports the `WasteRepository` interface and a `createWasteRepository(locationId)` factory backed by `BackendWasteRepository` (`lib/data/backend-waste-repository.ts`). The browser only ever calls `/api/*`; the backend URL is server-side (`BACKEND_API_URL`, no `NEXT_PUBLIC_` prefix). Periods are tracked as `YYYY-Qn` quarter strings; a submitted report locks its quarter.
- **Pages → Components pattern**: `page.tsx` files are server components that import a single `*-content.tsx` client component for interactivity.
- **Styling**: Tailwind CSS v4 — config is in `app/globals.css`, not a config file. Uses oklch colors.
- **UI components**: shadcn/UI `base-vega` style (uses `@base-ui/react`, not Radix UI). Add with `npx shadcn@latest add <name>`.

## Knowledge Base

This repository maintains a structured, externalized mental model across sessions. The system has **four tiers**:

| Tier | Location                | Purpose                                           |
| ---- | ----------------------- | ------------------------------------------------- |
| 1    | `CLAUDE.md` (this file) | Project overview, navigation hub, constraints     |
| 2    | `.claude/instructions/` | Conventions/rules per file type — **how to work** |
| 3    | `.claude/knowledge/`    | Living mental model — **how it works & why**      |
| 4    | `.claude/skills/`       | Multi-step workflows — **how to do X**            |

**Knowledge files by domain:**

- **backend-api.md** — FastAPI routes, endpoints, request handling
- **database-layer.md** — SQLAlchemy, models, storage, schema
- **frontend-architecture.md** — Next.js routing, layouts, pages, environment
- **component-structure.md** — React components, shadcn/UI, layout patterns
- **data-repository.md** — WasteRepository pattern, backend integration
- **auth-rbac.md** — Authentication, roles, UserProvider, authorization
- **build-deploy.md** — Docker, CI/CD, startup scripts, environment variables

### Read/Write Gates

> **Read gate:** Before editing any file in `backend_fast_api/src/` or `frontend/(app|components|lib)/`, or making a non-trivial change anywhere, you MUST first read the knowledge files that cover the affected domain. This rebuilds the mental model — state ownership, invariants, design rationale — so you can spot when a proposed change contradicts an earlier `DECIDED` entry and push back rather than silently regress it. Trivial edits (typos, comments, formatting) are exempt.

> **Write gate:** During or after any task, if you discover a new invariant, state-ownership fact, data-flow edge, design decision, or tension that is not already in a knowledge file, you MUST add it to the correct file using the structured notation (OWNS / READS FROM / WRITES TO / INVARIANT / FLOW / TENSION / DECIDED). These files are your externalized mental model — if you don't write it down, the next session will rediscover it from scratch.

> **Rule of thumb:** If a change contradicts a `DECIDED` entry in the knowledge base, cite the entry and ask the human to justify overriding it before implementing. Past decisions have context; don't silently reverse them.

**Retrospective:** After any non-trivial task, run `/retrospective` to review what was learned and update the knowledge base accordingly.

## Planned / not yet implemented

- Backend endpoints required by the new auth model: `POST /auth/sso-resolve` (called by Better Auth's user-create hook to map Entra users to backend roles/locations) and `PATCH /users/{id}/preferred-location` (called by the `/select-location` server action). Both must verify the HMAC `X-User-Sig` header using `BACKEND_SHARED_SECRET`. See `.claude/knowledge/backend-api.md`.
- Pluggable data ingestion adapter/parser layer on the backend
