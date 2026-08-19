---
title: Docker
layout: default
parent: Deployment
nav_order: 1
---

# Docker

A `docker-compose.yml` at the repo root runs the full stack — frontend, backend, and two
PostgreSQL databases — in containers. It's an alternative to native local dev (see
{{ site.baseurl }}/getting-started/ for that path), useful for testing the app the way it
runs in production (Postgres instead of SQLite) or for onboarding without a local Python/Node
setup.

## What's in the stack

Four services on a shared bridge network (`hgs-refuce-network`):

| Service    | Purpose                          | Host port | Container port | Technology       |
| ---------- | --------------------------------- | --------- | --------------- | ---------------- |
| `frontend` | Next.js UI                        | 3000      | 3000             | Next.js 16       |
| `backend`  | FastAPI REST API                  | 8000      | 8000             | Python + FastAPI |
| `auth-db`  | Better Auth tables (sessions etc.)| 5432      | 5432             | PostgreSQL 16    |
| `data-db`  | Application data (locations, registrations, reports, backend users) | 5433 | 5432 | PostgreSQL 16 |

### The two Postgres databases

The stack deliberately runs **two separate Postgres databases**, matching the production
architecture:

- **`auth-db`** (database `refuce_auth`) is owned by Better Auth, inside the Next.js frontend.
  It stores the `user`, `session`, `account`, and `verification` tables. On container startup it
  runs `scripts/init-better-auth-schema.sql`, which creates that schema — without it, Better
  Auth has nowhere to create sessions.
- **`data-db`** (database `refuce_data`) is owned by the FastAPI backend. It stores locations,
  waste registrations, reports, and backend users. On startup it runs `scripts/init-data-db.sql`,
  which creates the schema and seeds demo data.

Both use `postgres`/`dev` credentials and are only meant for local development — see
Security below.

Service-to-service traffic uses Docker DNS (`http://backend:8000`,
`postgresql://postgres:dev@auth-db:5432/refuce_auth`, etc.), not `localhost`. `localhost` only
works for connections made from the host machine (e.g. `psql` from your terminal, or a browser
hitting the frontend).

## Build, run, stop

```bash
# Build and start all services in the background
docker-compose up -d

# Wait ~15-20 seconds on first run, then check health
docker-compose ps

# Open the app
# http://localhost:3000
```

Other common commands:

```bash
# View logs (all services, or one)
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a single service
docker-compose restart frontend

# Stop containers, keep data
docker-compose stop
docker-compose down

# Stop and wipe all data (fresh start)
docker-compose down -v

# Rebuild images after a Dockerfile or dependency change
docker-compose build
docker-compose up -d --build
```

### Demo accounts (PIN login)

The `data-db` init script seeds these users for the frontend's PIN login form:

| Username        | PIN     | Role        | Location      |
| ---------------- | ------- | ----------- | -------------- |
| sadmin            | sadmin  | Super Admin | Bouvet Office  |
| admin             | admin   | Admin       | Bouvet Office  |
| common            | common  | User        | Bouvet Office  |
| user1             | 234     | User        | Bouvet Office  |
| haugesundUser     | 123     | User        | Haugesund      |
| stavangerUser     | 123     | User        | Stavanger      |

Better Auth itself has no pre-seeded users — a Better Auth `user` row is created the first time
each demo account signs in (see `.claude/knowledge/auth-rbac.md` for the PIN sign-in flow).

### Database access from the host

```bash
# Application data
psql -h localhost -p 5433 -U postgres -d refuce_data
# Password: dev

# Better Auth
psql -h localhost -p 5432 -U postgres -d refuce_auth
# Password: dev
```

### Environment variables

The compose file provides development defaults for every secret (`SECRET_KEY`,
`ADMIN_SECRET`, `BETTER_AUTH_SECRET`, `BACKEND_SHARED_SECRET`, Microsoft SSO credentials, etc.).
To override them, copy the committed template and fill in real values, then rebuild:

```bash
cp .env.example .env
docker-compose up -d --build
```

For the full list of variables and what each one does, see
{{ site.baseurl }}/getting-started/environment-variables/.

## How this differs from native local dev

- **Database engine**: native dev uses SQLite for the backend; Docker uses PostgreSQL for both
  the backend (`data-db`) and Better Auth (`auth-db`), matching production.
- **Two databases, not one**: native dev only runs the backend's SQLite file; Better Auth's
  Postgres database only exists in Docker (or a manually provisioned Postgres instance).
- **Build-time configuration**: the frontend image bakes several environment variables in at
  *build* time (see Troubleshooting below) because `next build` needs them to prerender/collect
  page data. Native `npm run dev` reads `.env.local` at runtime instead.
- **Networking**: containers reach each other by service name (`backend`, `auth-db`, `data-db`)
  over Docker DNS; native dev uses `localhost` for everything.
- **Rebuilds required for code changes**: native dev hot-reloads; in Docker, backend/frontend
  code changes require `docker-compose build <service>` and a restart to take effect (there's no
  bind-mount of source into the containers).

## Troubleshooting

**Services won't start** — check logs first: `docker-compose logs -f`.

**Port already in use** — edit the `ports:` mapping for the affected service in
`docker-compose.yml` (e.g. `"3001:3000"`).

**Database issues / connection errors** — confirm both databases are healthy with
`docker-compose ps`, then `docker-compose restart data-db auth-db`.

**Start completely fresh** — `docker-compose down -v && docker-compose up -d` (this deletes all
volume data, including demo users).

**Frontend build fails with `Missing required environment variable: BETTER_AUTH_SECRET` (or
`MICROSOFT_CLIENT_ID`)** — `next build` collects page data from server routes that read these
variables, so they must exist at *build* time, not just at container runtime. The frontend
`Dockerfile` declares them as `ARG`s with dev defaults, and `docker-compose.yml`'s
`frontend.build.args` passes them through. If you build the frontend image directly with
`docker build` (bypassing compose), pass the same `--build-arg` values, or the build will fail
the same way.

**Backend crashes on startup with `column "preferred_location_id" of relation "users" already
exists` followed by `current transaction is aborted, commands ignored until end of transaction
block`** — this is a PostgreSQL-specific transaction-handling gotcha, not a SQLite one: once a
statement fails inside a transaction, Postgres aborts the *whole* transaction, and every
subsequent statement in that same transaction/connection fails too, even unrelated ones. The
fix is structural — schema migrations that might already be applied (like an `ALTER TABLE ...
ADD COLUMN`) must run in their own transaction/connection, separate from the initial `CREATE
TABLE`, so a "column already exists" failure doesn't poison later statements. If you add new
migration logic to `backend_fast_api/src/hgs_refuce_app/storage.py`, keep each `ALTER TABLE` in
its own connection/transaction for this reason.

**PIN login fails with "Invalid username or PIN" even though the backend has the demo users** —
Better Auth needs its own schema in `auth-db` to create sessions; if that database is empty (no
`user`/`session`/`account`/`verification` tables), sign-in fails even with correct credentials.
`docker-compose.yml` mounts `scripts/init-better-auth-schema.sql` into `auth-db`'s init
directory so this runs automatically on first startup — if you previously created the `auth-db`
volume without it, run `docker-compose down -v && docker-compose up -d` to reinitialize.
