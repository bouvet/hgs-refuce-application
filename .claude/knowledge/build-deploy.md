---
domain: build-deploy
related: [backend-api, frontend-architecture]
---

# Build & Deployment — Mental Model

## project structure

- OWNS: monorepo with backend_fast_api/ and frontend/ as independent subprojects
- OWNS: root-level start scripts (start.sh, start.ps1, start.bat)
- INVARIANT: each subproject has its own CLAUDE.md, requirements/package.json, Dockerfile
- DECIDED: monorepo layout allows parallel development; each sub-project can be deployed independently

## startup scripts

- OWNS: start.sh (bash/WSL), start.ps1 (PowerShell), start.bat (cmd)
- OWNS: venv check, pip install, uvicorn + npm dev server startup
- READS FROM: backend_fast_api/.venv
- WRITES TO: spawns two processes (backend on 8000, frontend on 3000)
- INVARIANT: all scripts check for .venv and print setup instructions if missing
- INVARIANT: requires one-time: `python -m venv backend_fast_api/.venv && pip install -r backend_fast_api/requirements.txt`
- FLOW[startup]: user runs start.sh → check .venv → pip install → spawn uvicorn (8000) + next dev (3000) → ready for http://localhost:3000
- DECIDED: shell scripts for convenience; developer can also run components separately

## backend dev

- OWNS: uvicorn reload mode, pytest test runner
- OWNS: SQLite database (db.sqlite created on first run)
- READS FROM: backend_fast_api/requirements.txt
- INVARIANT: `uvicorn hgs_refuce_app.main:app --reload` for hot reload
- INVARIANT: `pytest` runs all tests; `pytest tests/test_endpoints.py::test_name` for specific test
- INVARIANT: tests use TestClient and reset DB with setup_function()
- DECIDED: no migrations; schema from models.py applied directly to SQLite

## frontend dev

- OWNS: Turbopack dev server, production build
- READS FROM: frontend/.env.local for NEXT_PUBLIC_API_URL
- INVARIANT: `npm run dev` → Turbopack on localhost:3000
- INVARIANT: `npm run build` → production bundle
- INVARIANT: `npm run lint` → ESLint check
- DECIDED: Turbopack for faster rebuilds (experimental but stable in Next.js 16)

## Docker

- OWNS: Dockerfile in backend_fast_api/ and frontend/
- OWNS: docker-compose.yml at repo root
- INVARIANT: multi-stage builds (not verified; check actual files)
- INVARIANT: PostgreSQL database for production (not SQLite)
- TENSION: docker-compose.yml exists but unclear how it integrates with CI/CD

## CI/CD

- OWNS: .github/workflows/ (GitHub Actions)
- OWNS: build, test, deploy steps
- READS FROM: commits to main, PR branches
- INVARIANT: main branch protected (PRs required, checks must pass)
- INVARIANT: BACKEND_CORS_ORIGINS, DATABASE_URL, other secrets managed via GitHub Secrets
- TENSION: workflow file modified but not reviewed; check for CI integration details in main_wasteflow.yml

## environment variables

- OWNS: backend configuration via env vars
- OWNS: BACKEND_CORS_ORIGINS, DATABASE_URL, ADMIN_SECRET, NEXT_PUBLIC_API_URL
- INVARIANT: defaults provided (CORS → localhost:3000, DATABASE_URL → sqlite:///db.sqlite)
- INVARIANT: no .env.local in git; developers create locally
- DECIDED: env vars for flexibility across dev/staging/prod

## frontend env vars (updated for Better Auth)

- OWNS: server-side env in `frontend/.env.local` — see `.env.local.example` for the full list
- INVARIANT: `BETTER_AUTH_URL` — public origin (e.g. `https://refuse.example.com`); used for OIDC callback URLs and `trustedOrigins`
- INVARIANT: `BETTER_AUTH_SECRET` — generate via `openssl rand -base64 32`; must be stable across deploys (rotation invalidates all sessions)
- INVARIANT: `DATABASE_URL` — Postgres connection string for Better Auth tables (NOT the FastAPI database; can share the same Postgres server)
- INVARIANT: `BACKEND_API_URL` — internal URL to FastAPI; server-side only (was `NEXT_PUBLIC_API_URL`)
- INVARIANT: `BACKEND_SHARED_SECRET` — HMAC key shared with FastAPI; rotate by bumping `X-User-Sig-Version` and accepting both during rollover
- INVARIANT: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` — Entra ID app registration credentials
- DECIDED: **Reverses prior `NEXT_PUBLIC_API_URL`.** Backend URL is server-only; browser only ever calls `/api/*`.

## one-time Postgres + migration setup

- OWNS: Better Auth migration command `npx @better-auth/cli@latest migrate` (run from `frontend/`)
- READS FROM: `DATABASE_URL` and `lib/auth.ts` schema definition (additional fields, plugins)
- WRITES TO: Postgres tables `user`, `session`, `account`, `verification`
- INVARIANT: Postgres must be running before `npm run dev` will accept any login
- INVARIANT: re-run the migration whenever `additionalFields` or plugins with their own schema are added
- FLOW[local_setup]: `docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=auth postgres:16` → set `DATABASE_URL=postgres://postgres:dev@localhost:5432/auth` → `npx @better-auth/cli@latest migrate` → `npm run dev`
- DECIDED: SQLite is not supported by the current Better Auth setup (it uses the `pg` driver directly); local dev requires Postgres.

## Entra ID app registration

- OWNS: Microsoft Entra ID (Azure AD) tenant configuration
- INVARIANT: redirect URI must be `${BETTER_AUTH_URL}/api/auth/callback/microsoft`
- INVARIANT: client secret has an expiry — add to renewal calendar and rotate by replacing `MICROSOFT_CLIENT_SECRET` (no code change)
- INVARIANT: `MICROSOFT_TENANT_ID` scopes the sign-in to a specific Entra tenant; use `common` if multi-tenant
- DECIDED: Microsoft is the SSO provider (per requirements). Other providers can be added by extending `socialProviders` in `lib/auth.ts`.
