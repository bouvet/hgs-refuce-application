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
