---
layout: default
parent: Getting Started
title: Running locally
nav_order: 2
---

# Running locally (native)

This is the fast day-to-day workflow: SQLite for the backend, no containers, Turbopack hot reload
on the frontend. Complete [Installation]({{ site.baseurl }}/getting-started/installation/) first.

{: .important }
> The project's own `CLAUDE.md` documents three convenience scripts — `start.sh`, `start.ps1`, and
> `start.bat` at the repo root — that are supposed to check for `backend_fast_api/.venv`, then start
> both the backend (port 8000) and frontend (port 3000) with one command. **As of this writing those
> files do not exist in the repository** (verified: no `start.sh`/`start.ps1`/`start.bat` at the repo
> root, and no commit in the repo's history ever added them). Until they're added back, start each
> service manually using the steps below — the two `uvicorn`/`npm run dev` commands are exactly what
> those scripts would have run.

## Ports

| Service | Port | URL |
| --- | --- | --- |
| Frontend (Next.js, Turbopack) | 3000 | `http://localhost:3000` |
| Backend (FastAPI, Uvicorn) | 8000 | `http://localhost:8000` |

## Start the backend

```bash
cd backend_fast_api
# activate the venv first if it isn't already active
uvicorn hgs_refuce_app.main:app --reload --port 8000
```

`--reload` watches for file changes. The backend does **not** call `load_dotenv()` — it only reads
`os.environ`, so when running `uvicorn` directly (as opposed to via Docker Compose, which sets
these in `docker-compose.yml`) you must export at least:

```bash
export BACKEND_SHARED_SECRET=some-shared-value   # must match frontend/.env.local
export JWT_SECRET=any-non-empty-string
```

If these are unset, the backend still boots (it falls back to an insecure development default and
logs a warning), but if `BACKEND_SHARED_SECRET` doesn't match the value the frontend is signing
requests with, every proxied call and every login attempt returns `401` — indistinguishable from a
wrong username/PIN. See [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/).

With no `DATABASE_URL` set and `APP_ENV` unset (or `development`), the backend uses a local SQLite
file (`data.db`) and creates tables automatically on first run — no migration step required.

## Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

This starts Next.js 16 with Turbopack on `http://localhost:3000`. The frontend needs `frontend/.env.local`
populated (see [Installation]({{ site.baseurl }}/getting-started/installation/)) and a reachable
Postgres instance for Better Auth's session tables — SQLite is not an option for Better Auth.

By default `BACKEND_API_URL` in `frontend/.env.local` should point at `http://localhost:8000` for
this native workflow.

## Running tests

```bash
cd backend_fast_api
pytest                                                        # all tests
pytest tests/test_endpoints.py::test_create_and_get_registration    # single test
```

```bash
cd frontend
npm run lint
```

Tests use FastAPI's `TestClient` against the live app instance and reset the database between tests
via `setup_function()`.

## Next steps

- [Running with Docker]({{ site.baseurl }}/getting-started/with-docker/) — closer to production topology (two Postgres databases instead of SQLite).
- [Architecture overview]({{ site.baseurl }}/architecture/overview/) — how these two processes talk to each other.
