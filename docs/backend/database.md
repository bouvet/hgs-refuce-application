---
layout: default
parent: Backend
title: Database
nav_order: 2
---

# Database

All persistence lives in
[`src/hgs_refuce_app/storage.py`](https://github.com/bouvet/hgs-refuce-application/blob/main/backend_fast_api/src/hgs_refuce_app/storage.py),
via three classes: `DatabaseConnection`, `UserStorage`, `DataStorage`. There is no ORM model layer
— every query is hand-written SQL passed through SQLAlchemy's `text()`, executed against a raw
`engine.connect()` connection.

## `DatabaseConnection`

Owns the SQLAlchemy `engine` and `SessionLocal` sessionmaker, and runs schema setup on
construction (`_init_schema()`), which issues `CREATE TABLE IF NOT EXISTS` for `users`,
`locations`, `location_users`, `registrations`, `reports`, and `pending_access_requests`, plus a
couple of guarded `ALTER TABLE ... ADD COLUMN` statements for `users.preferred_location_id` and
`users.name` (wrapped in `try/except` so re-running against a database that already has the
column is a no-op).

```python
# storage.py
connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
```

- `pool_pre_ping=True` and `pool_recycle=300` are set unconditionally (harmless for SQLite, useful
  for PostgreSQL connections that can go stale).
- `check_same_thread=False` is only passed for SQLite, since FastAPI can serve a single SQLite
  connection from multiple threads under `TestClient`/`uvicorn --reload`.

## SQLite (dev) vs PostgreSQL (prod) — how the switch happens

The choice of database is made once, in
[`main.py`](https://github.com/bouvet/hgs-refuce-application/blob/main/backend_fast_api/src/hgs_refuce_app/main.py),
before `DatabaseConnection` is constructed:

```python
_is_production = os.environ.get("APP_ENV", "development").lower() == "production"
_database_url = os.environ.get("DATABASE_URL")
if _is_production and not _database_url:
    raise ValueError("DATABASE_URL is required in production")
if not _database_url:
    _database_url = "sqlite:///data.db"
```

- `APP_ENV=production` (or unset/anything else defaulting to `development`) selects the mode.
- In production, `DATABASE_URL` is **required** — the app raises on import/boot if it's missing.
  In practice this is a PostgreSQL connection string, e.g.
  `postgresql://dbadmin:PASSWORD@hgs-refuce-db-server.postgres.database.azure.com:5432/wasteflow?sslmode=require`
  (see the Azure Deployment section of `backend_fast_api/CLAUDE.md`).
- In development, if `DATABASE_URL` is unset, it defaults to `sqlite:///data.db` (a file in the
  working directory). Setting `DATABASE_URL` explicitly in dev overrides this — e.g. to point a
  local run at a PostgreSQL instance.
- A single module-level `_db = DatabaseConnection(_database_url)` is created, and `user_storage =
UserStorage(_db)` / `data_storage = DataStorage(_db)` are constructed from it — these two
  singletons are what every route function in `main.py` calls into.

There is no separate migration tool (no Alembic) — schema changes are additive `CREATE TABLE IF
NOT EXISTS` / guarded `ALTER TABLE` statements run on every process start.

## `UserStorage`

Owns everything about users, locations, and location membership:

- User CRUD: `create_user`, `get_user`, `user_exists`, `check_password`, `list_users`,
  `update_user` (PATCH-style — only the snake_case fields passed as kwargs are written:
  `name`, `is_admin`, `is_super_admin`), `count_super_admins`, `delete_user`.
- Location CRUD: `create_location` (ids are just the next integer as a string — `MAX(CAST(id AS
INTEGER)) + 1`), `get_location`, `get_location_by_name`, `list_locations`, `location_exists`,
  `location_name_exists`, `delete_location`.
- Location membership (`location_users` join table): `add_user_to_location`,
  `remove_user_from_location`, `location_has_access`, `get_user_locations` (returns **all**
  locations if the user `isSuperAdmin`, otherwise only the ones joined via `location_users`),
  `list_users_in_location`.
- Preferred location: `get_preferred_location` / `set_preferred_location`, backing
  `GET /currentUser` and `PATCH /currentUser/location`.
- Pending SSO access requests: `upsert_pending_request`, `list_pending_requests`,
  `delete_pending_request` — rows created when `POST /auth/sso-resolve` sees an email with no
  matching `users` row (see [Authentication]({{ site.baseurl }}/architecture/authentication/)).

Passwords are stored and compared **in plaintext** (`check_password` does a direct string
comparison) — acceptable only because this is an internal tool with a small, trusted user base;
do not treat this as a pattern to copy elsewhere.

## `DataStorage`

Owns waste registrations and reports, both scoped by `location_id`:

- Registrations: `list_registrations` (optional `date_from`/`date_to` filtering), `get_registration`,
  `get_registration_by_date`, `insert_registration`, `update_registration`, `delete_registration`,
  plus bulk `delete_registrations_for_location` (used when a location is deleted).
  `entries` (the list of `{categoryId, weightKg}` objects) is stored as a JSON string in a single
  `TEXT` column and (de)serialized with `json.dumps`/`json.loads` in `_row_to_registration`.
- Reports: `list_reports`, `get_report`, `insert_report`, `delete_report`, bulk
  `delete_reports_for_location`. The composite primary key is `(period, location_id)` — a report
  row's mere existence for a given period **is** the lock; `is_period_locked` /
  `is_date_locked` (the latter converts a date to its quarter via the module-level
  `date_to_quarter()` helper) just check `get_report(...)  is not None`.

Locking is enforced by the route functions in `main.py` calling `is_date_locked` /
`is_period_locked` before writes — see the `registration endpoints` / `report endpoints` sections
of `.claude/knowledge/backend-api.md` and the `submit_report` / `create_registration` /
`update_registration` / `delete_registration` functions in `main.py`.

## Schema at a glance

| Table | Key columns | Notes |
| --- | --- | --- |
| `users` | `id` (PK), `is_admin`, `is_super_admin`, `password`, `name`, `preferred_location_id`, `created_at` | `id` is the username (PIN users) or email (SSO users) |
| `locations` | `id` (PK, integer-as-text), `name`, `created_at` | |
| `location_users` | `(location_id, user_id)` composite PK | membership join table |
| `registrations` | `id` (PK), `location_id`, `date`, `entries` (JSON text), `created_at`, `updated_at`, `created_by` | indexed on `(location_id, date)` |
| `reports` | `(period, location_id)` composite PK, `id`, `submitted_at`, `submitted_by` | row existence = quarter locked |
| `pending_access_requests` | `email` (PK), `name`, `requested_at`, `last_attempt_at` | queued unresolved SSO sign-ins |

For the Pydantic-level shapes exposed over HTTP (as opposed to these SQL columns), see
`src/hgs_refuce_app/models.py` and [Data model]({{ site.baseurl }}/architecture/data-model/).
