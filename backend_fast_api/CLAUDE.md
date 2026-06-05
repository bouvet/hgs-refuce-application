# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend for **hgs-refuce-application** — a FastAPI service that tracks refuse/waste data from a local Bouvet office. Built with Python + FastAPI + SQLAlchemy (supports SQLite and PostgreSQL).

## Commands

All commands run from `backend_fast_api/`.

```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server
uvicorn hgs_refuce_app.main:app --reload --port 8010

# Run all tests
pytest

# Run a single test
pytest tests/test_endpoints.py::test_add_and_get_datapoint
```

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

### Environment Variables

Set these on the Azure App Service via **Settings → Configuration → Application settings**:

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://sktxengsxj:PASSWORD@wasteflow-backend-server.postgres.database.azure.com:5432/wasteflow` | PostgreSQL connection string |
| `BACKEND_CORS_ORIGINS` | `https://frontend.azurewebsites.net` | Frontend URL for CORS |
| `ADMIN_SECRET` | (generate a secure random string) | Used for admin endpoints |

### Database Setup

1. Create the database in PostgreSQL (replace `PASSWORD` with the actual password):
   ```bash
   psql -h wasteflow-backend-server.postgres.database.azure.com -U sktxengsxj -d postgres
   CREATE DATABASE wasteflow;
   ```

2. Set `DATABASE_URL` on the App Service to point to this database.

3. Tables are created automatically on first app startup.

## Planned but not yet implemented

- Admin vs. regular user roles and authentication/authorization
- The data ingestion format is intentionally unspecified — design the adapter/parser layer to be pluggable when adding it
- Data pre-processing/aggregation on the backend before serving to frontend
