# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend for **hgs-refuce-application** — a FastAPI service that tracks refuse/waste data from a local Bouvet office. Built with Python + FastAPI + SQLAlchemy (supports SQLite and PostgreSQL).

## Commands

All commands run from `backend_fast_api/`.

```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server (port 8000 — the frontend expects this)
uvicorn hgs_refuce_app.main:app --reload --port 8000

# Run all tests
pytest

# Run a single test
pytest tests/test_endpoints.py::test_add_and_get_datapoint
```

## Local dev env vars (gotcha)

The backend does NOT call `load_dotenv()` — it reads `os.environ` only. When running `uvicorn` directly (not via Docker), you MUST export at least:

- `BACKEND_SHARED_SECRET` — **must match** `BACKEND_SHARED_SECRET` in `frontend/.env.local`. Mismatch → every login returns 401 from `verify_service_auth` (in `auth.py`) before credentials are checked, indistinguishable from "wrong username/PIN".
- `JWT_SECRET` — any non-empty string in dev.

Without these the backend boots fine but every signed call from Next.js fails. See `README.md` for the full table and copy-paste startup commands.

## Architecture

**Data flow:** `user → frontend → backend → storage`

The backend is the single processing layer — all data crunching happens here before it reaches the frontend.

**Key layers:**

- `src/hgs_refuce_app/main.py` — FastAPI app with endpoints for registrations, reports, users, and locations
- `src/hgs_refuce_app/storage.py` — `DatabaseConnection`, `UserStorage`, and `DataStorage` classes. All DB access goes through these. Uses SQLAlchemy for both SQLite and PostgreSQL.
- `src/hgs_refuce_app/models.py` — Pydantic models: `WasteRegistration`, `Report`, `Location`, `User`, etc.

**Storage:** SQLAlchemy wrapping SQLite (dev) or PostgreSQL (prod). Automatically detects mode via `APP_ENV`:

- **Development** (`APP_ENV=development` or unset): Uses SQLite (`data.db`) by default
- **Production** (`APP_ENV=production`): Requires `DATABASE_URL` set to PostgreSQL connection string

To override the database in development, set `DATABASE_URL` explicitly.

**Tests:** Use FastAPI's `TestClient` against the live app instance. Tests share the same `storage` singleton and clear the DB via `setup_function()` between tests. **Do not run pytest yourself** — give the user the command to run and let them execute it.

**Logging:** `src/hgs_refuce_app/logging_config.py` configures Python's stdlib `logging`. Behavior depends on `APP_ENV`:

- **development**: writes to stderr at `LOG_LEVEL` (default `INFO`).
- **production**: never writes to stdout/stderr. Records are buffered in memory (`LOG_BUFFER_CAPACITY`, default 1000) and only flushed to `LOG_DIR/app.log` (rotating, default `./logs/app.log`) when an `ERROR`/`CRITICAL` is logged or on clean shutdown. Call `logging_config.flush_logs(reason)` from new modules (e.g. future auth) when you want to force a flush without an exception.

Change the level via the `LOG_LEVEL` env var, or edit `DEFAULT_LEVEL` in `logging_config.py` for an in-code default. A request-logging middleware in `main.py` logs every HTTP request at `INFO`; a global exception handler logs unhandled errors at `ERROR` (which triggers the prod buffer flush).

## Azure Deployment

### Resources

- **App Service**: `hgs-refuce-backend` (Linux, connected to `hgs-refuce-frontend-plan`)
- **Database**: `hgs-refuce-db-server` — Azure Database for PostgreSQL Flexible Server, database `wasteflow`
- **Frontend**: `Wasteflow` App Service at `https://wasteflow.azurewebsites.net`

### Startup command

Set in Azure Portal → App Service → Configuration → Stack settings → Startup Command:

```
python3 -m uvicorn hgs_refuce_app.main:app --app-dir src --host 0.0.0.0 --port 8000
```

`--app-dir src` adds `src/` to `sys.path` so `hgs_refuce_app` is importable. Alternatively, `gunicorn.conf.py` at the repo root configures gunicorn with uvicorn workers and `pythonpath = "src"`, usable with:

```
python3 -m gunicorn hgs_refuce_app.main:app -c gunicorn.conf.py
```

### Environment Variables

Set these on the Azure App Service via **Settings → Configuration → Application settings**:

| Variable               | Example                                                                                                         | Notes                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`              | `production`                                                                                                    | Required — enables PostgreSQL and production logging                                                                  |
| `DATABASE_URL`         | `postgresql://dbadmin:PASSWORD@hgs-refuce-db-server.postgres.database.azure.com:5432/wasteflow?sslmode=require` | PostgreSQL Flexible Server connection string — note: no `@servername` suffix in username, `?sslmode=require` required |
| `BACKEND_CORS_ORIGINS` | `https://wasteflow.azurewebsites.net`                                                                           | Frontend URL for CORS                                                                                                 |
| `ADMIN_SECRET`         | (generate a secure random string)                                                                               | Used for admin endpoints                                                                                              |

### Database Setup

The `wasteflow` database on `hgs-refuce-db-server` already exists. Tables are created automatically on first app startup.

To connect manually (e.g. to inspect data):

```bash
psql -h hgs-refuce-db-server.postgres.database.azure.com -U dbadmin -d wasteflow
```

### Firewall

The App Service outbound IPs must be allowed in the PostgreSQL server's networking rules (or enable "Allow public access from any Azure service within Azure"). Check current outbound IPs at App Service → Properties → Outbound IP addresses.

## Planned but not yet implemented

- Admin vs. regular user roles and authentication/authorization
- The data ingestion format is intentionally unspecified — design the adapter/parser layer to be pluggable when adding it
- Data pre-processing/aggregation on the backend before serving to frontend
