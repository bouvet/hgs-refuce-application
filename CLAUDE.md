# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**hgs-refuce-application** — tracks refuse/waste from a local Bouvet office. Two sub-projects:

- `backend_fast_api/` — Python + FastAPI + SQLAlchemy (SQLite locally, PostgreSQL in production)
- `frontend/` — Next.js 16, TypeScript, Tailwind CSS v4, shadcn/UI

Each sub-project has its own `CLAUDE.md` with detailed guidance. Read those before working in the respective sub-project.

## Starting both services

Three scripts at the repo root start the backend and frontend together. All require a `.venv` in `backend_fast_api/` — if it's missing they will print setup instructions and exit.

| Script | Platform |
|--------|----------|
| `start.bat` | Windows (cmd) |
| `start.ps1` | Windows (PowerShell) |
| `start.sh` | bash / WSL |

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

The backend is the authority on data shape. The frontend calls the backend for all waste registration and report data via `lib/data/backend-waste-repository.ts`. The only remaining `localStorage` use is role/user selection (`boss-app:current-user` in `UserProvider`).

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

- **Auth**: Role-based (`common` | `admin`). The landing page (`app/page.tsx`) shows a `RoleSelector`; the chosen role is persisted in `localStorage` via `UserProvider` (`components/providers/user-provider.tsx`). `RoleGuard` redirects users who lack the required role.
- **Routing**: All authenticated pages live under `app/(app)/` (oversikt, statistikk, historikk, registrer, registreringer, rapportering). Admin-only pages use `RoleGuard`.
- **Data layer**: `lib/data/waste-repository.ts` exports the `WasteRepository` interface and a `wasteRepository` singleton backed by `BackendWasteRepository` (`lib/data/backend-waste-repository.ts`). All reads/writes go through this singleton. The backend URL defaults to `http://localhost:8000` and can be overridden via `NEXT_PUBLIC_API_URL` in `frontend/.env.local`. Periods are tracked as `YYYY-Qn` quarter strings; a submitted report locks its quarter.
- **Pages → Components pattern**: `page.tsx` files are server components that import a single `*-content.tsx` client component for interactivity.
- **Styling**: Tailwind CSS v4 — config is in `app/globals.css`, not a config file. Uses oklch colors.
- **UI components**: shadcn/UI `base-vega` style (uses `@base-ui/react`, not Radix UI). Add with `npx shadcn@latest add <name>`.

## Planned / not yet implemented

- Authentication and authorization (admin vs. regular user, currently client-side only)
- Pluggable data ingestion adapter/parser layer on the backend
