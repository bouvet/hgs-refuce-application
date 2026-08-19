---
layout: default
parent: Getting Started
title: Running with Docker
nav_order: 3
---

# Running with Docker Compose

`docker-compose.yml` at the repo root brings up the full stack: two PostgreSQL databases, the
FastAPI backend, and the Next.js frontend. This is closer to the production topology than the
native SQLite workflow and is the easiest way to exercise Microsoft SSO and PIN sign-in end to end
locally.

## Services

| Service | Image / build | Container name | Host port | Purpose |
| --- | --- | --- | --- | --- |
| `auth-db` | `postgres:16-alpine` | `hgs-refuce-auth-db` | **5432** | Better Auth's own database (`refuce_auth`) — sessions, OAuth accounts, verification tokens |
| `data-db` | `postgres:16-alpine` | `hgs-refuce-data-db` | **5433** | Backend application data (`refuce_data`) — locations, registrations, reports, users |
| `backend` | build from `backend_fast_api/Dockerfile` | `hgs-refuce-backend` | 8000 | FastAPI app |
| `frontend` | build from `frontend/Dockerfile` | `hgs-refuce-frontend` | 3000 | Next.js app |

`data-db` publishes on host port **5433**, not 5432, specifically so it can run side-by-side with
`auth-db` on the same machine without a port clash — inside the Docker network both containers
listen on their default `5432`.

Both Postgres containers run an init script on first boot (`docker-entrypoint-initdb.d`):
`scripts/init-better-auth-schema.sql` for `auth-db` and `scripts/init-data-db.sql` for `data-db`.

## Running it

```bash
docker compose up --build
```

The repo's root `.env` file supplies the secrets that `docker-compose.yml` interpolates with
`${VAR:-default}` syntax — see
[Environment variables]({{ site.baseurl }}/getting-started/environment-variables/). It ships with
placeholder values (`replace-me`, empty Microsoft credentials); replace them with real values
before using the stack for anything beyond a quick smoke test. If `.env` is missing entirely,
Compose falls back to the hardcoded dev defaults baked into `docker-compose.yml` (fine for a
throwaway local stack, **not** safe for anything shared or persistent).

`frontend` depends on `backend` and `auth-db` being healthy; `backend` depends on `data-db` being
healthy. Compose's healthchecks (`pg_isready` for Postgres, an HTTP request to `/docs` for the
backend) gate startup order, so `docker compose up` handles the ordering for you.

{: .warning }
> **Known issue in the current `docker-compose.yml`:** the `frontend` service is given
> `BACKEND_SHARED_SECRET` (from root `.env`, defaulting to `dev-shared-secret`), but the `backend`
> service's `environment:` block does **not** set `BACKEND_SHARED_SECRET` (or `JWT_SECRET`) at all.
> The backend falls back to its own insecure default (`dev-secret-change-in-production`) rather than
> the value the frontend is signing with. Since the two values differ, every HMAC-signed
> request from the frontend to the backend — logins, `/auth/sso-resolve`, and the identity header on
> every proxied call — will fail signature verification. Until `docker-compose.yml` is fixed to pass
> `BACKEND_SHARED_SECRET` (and a `JWT_SECRET`) into the `backend` service's environment, add them
> there yourself if you use Compose for anything beyond booting the containers.

## How this differs from native dev

| | Native (`npm run dev` + `uvicorn`) | Docker Compose |
| --- | --- | --- |
| Backend database | SQLite file (`data.db`), created automatically | PostgreSQL (`data-db`, database `refuce_data`) |
| Better Auth database | Postgres you provide yourself (e.g. a throwaway container) | PostgreSQL (`auth-db`, database `refuce_auth`) — provisioned automatically |
| Backend URL seen by frontend | `http://localhost:8000` | `http://backend:8000` (Docker network DNS) |
| Hot reload | Yes (Turbopack, `uvicorn --reload`) | No — image rebuild required for code changes |
| CORS origins | `http://localhost:3000` (default) | `http://localhost:3000,http://frontend:3000` |

Because the backend runs against real PostgreSQL under Compose (same engine as production, unlike
the SQLite file used in native dev), this workflow is the best local approximation of production
behavior — useful for testing anything sensitive to Postgres-specific SQL or connection handling.

## Next steps

- [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/) — every var referenced above, explained.
- [Architecture overview]({{ site.baseurl }}/architecture/overview/) — the request flow these containers implement.
