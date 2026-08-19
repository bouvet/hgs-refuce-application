---
layout: default
parent: Getting Started
title: Environment variables
nav_order: 4
---

# Environment variables

The single most common cause of a broken local setup is `BACKEND_SHARED_SECRET` not matching
between the frontend and the backend — read that section below before debugging anything else.

## Root `.env` (consumed by `docker-compose.yml`)

`.env` itself is gitignored (`.gitignore`'s `.env*` pattern), but `.env.example` at the repo root
is committed and explicitly un-ignored (`!.env.example`) as the template — copy it before running
`docker compose up` (see [Running with Docker]({{ site.baseurl }}/getting-started/with-docker/)):

```bash
cp .env.example .env
# then edit .env and fill in real values
```

`docker-compose.yml` interpolates these with `${VAR:-default}` syntax, so an unset variable falls
back to a (usually insecure, dev-only) default baked into the compose file rather than failing.

| Variable | Example / default | Used by |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | generate with `openssl rand -base64 32` | `frontend` container — Better Auth session signing |
| `SECRET_KEY` | `replace-me` | Passed to the `backend` container, but **not read by any backend code** — see note below |
| `ADMIN_SECRET` | `replace-me` | Backend `/admin/*` endpoints |
| `BACKEND_SHARED_SECRET` | `replace-me-with-strong-secret` | Passed to the `frontend` container only (see the Docker known-issue below) |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID` | empty by default | Entra ID app registration, frontend SSO |

{: .note }
> `SECRET_KEY` is set in the root `.env` and passed into the `backend` container's environment, but
> grepping `backend_fast_api/` turns up no code that reads `os.environ.get("SECRET_KEY")` anywhere.
> The backend's actual JWT signing key env var is `JWT_SECRET` (see `backend_fast_api/src/hgs_refuce_app/auth.py`),
> which isn't set anywhere in `docker-compose.yml`. `SECRET_KEY` currently appears to be dead
> configuration left over from an earlier auth design.

## Frontend (`frontend/.env.local`, template in `frontend/example.env.local.example`)

| Variable | Notes |
| --- | --- |
| `BETTER_AUTH_URL` | Public origin of the Next.js app (e.g. `http://localhost:3000`). Used for OIDC callback URLs and `trustedOrigins`. |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32`. Rotating it invalidates all sessions. |
| `AUTH_DATABASE_URL` | PostgreSQL connection string for Better Auth's own tables (`user`, `session`, `account`, `verification`). **Deliberately a separate env var name from the backend's `DATABASE_URL`** — the two databases must never share a connection pool, even though in Docker Compose and in some deployments they happen to live in the same Postgres instance. |
| `BACKEND_API_URL` | Internal URL to FastAPI — `http://localhost:8000` natively, `http://backend:8000` in Docker. **Server-side only.** |
| `BACKEND_SHARED_SECRET` | HMAC key shared with the backend's `BACKEND_SHARED_SECRET`. Must be byte-for-byte identical on both sides or every signed request returns `401`. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID` | Entra ID app registration. **`MICROSOFT_TENANT_ID` must not be `"common"` in any deployed environment** — `"common"` allows any Microsoft account, not just Bouvet's tenant. The example file and current `.env.local` use `"common"`/the Bouvet tenant id for local dev convenience only. |

None of these carry a `NEXT_PUBLIC_` prefix. See "Why `BACKEND_API_URL` has no `NEXT_PUBLIC_` prefix" below.

## Backend (`backend_fast_api/`, exported manually or set in Docker/Azure)

The backend does **not** call `load_dotenv()` — it reads `os.environ` directly, so a `.env` file in
`backend_fast_api/` has no effect unless something else loads it into the process environment first.

| Variable | Default if unset | Notes |
| --- | --- | --- |
| `BACKEND_SHARED_SECRET` | insecure dev default (warns, refuses to start in production) | Must match the frontend's value exactly |
| `JWT_SECRET` | insecure dev default (warns, refuses to start in production) | Signs the JWT issued by `POST /auth/login`; **not currently set in `docker-compose.yml`'s `backend` service** |
| `ADMIN_SECRET` | none — required for `/admin/*` | Compared with plain string equality, no hashing |
| `APP_ENV` | `development` | `production` requires `DATABASE_URL` and enables buffered file logging instead of stderr |
| `DATABASE_URL` | `sqlite:///db.sqlite` (dev only) | Required in production; PostgreSQL connection string |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000` | Comma-separated list, split naively on `,` |
| `LOG_LEVEL` | `INFO` | Only affects development stderr logging |

## Why `BACKEND_API_URL` has no `NEXT_PUBLIC_` prefix

This is deliberate, not an oversight. Next.js only exposes environment variables prefixed
`NEXT_PUBLIC_` to browser JavaScript; everything else stays server-side. An earlier version of this
project used `NEXT_PUBLIC_API_URL` so the browser could call the backend directly. That design was
reversed: today the browser only ever calls same-origin `/api/*` routes, and the Next.js server-side
route handler (`app/api/[...path]/route.ts`) is the only code that knows `BACKEND_API_URL` and
forwards the request to FastAPI.

Keeping the backend URL — and, more importantly, `BACKEND_SHARED_SECRET` — off the `NEXT_PUBLIC_`
allowlist means:

- The browser can never be pointed at the backend directly, bypassing the proxy's session check.
- The HMAC shared secret used to sign the `X-User-Id`/`X-User-Sig` identity headers never ships in
  a client bundle. If it were exposed, anyone could forge a signed request claiming to be any user.

See [Architecture: Overview]({{ site.baseurl }}/architecture/overview/) for the full request flow
and [Architecture: Authentication]({{ site.baseurl }}/architecture/authentication/) for how the
signature is constructed and (partially) verified.
