# hgs-refuce-application — backend

FastAPI service that tracks refuse from a local Bouvet office. Made primarily with LLM.

## Running locally (without Docker)

Activate the venv:

```powershell
# PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# CMD
.\.venv\Scripts\activate.bat

# Unix / WSL
source .venv/bin/activate
```

### Required environment variables

The backend reads its config from `os.environ` only — there is **no automatic `.env` loading**. You must export the variables in your shell (or pass `uvicorn --env-file path/to/file`) before starting the server.

| Variable                | Required when                            | Notes                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BACKEND_SHARED_SECRET` | Always (any login / signed call)         | **MUST match `BACKEND_SHARED_SECRET` in `frontend/.env.local`.** This is the HMAC secret used to verify service-to-service calls from Next.js. If it doesn't match, every login returns **401** from `verify_service_auth` before the username/password is even checked — so it looks identical to "wrong credentials". |
| `JWT_SECRET`            | Always                                   | Used to sign access tokens. Any non-empty string works in dev.                                                                                                                                                                                                                                                          |
| `APP_ENV`               | Optional                                 | Defaults to `development`. Set to `production` to require Postgres + real secrets.                                                                                                                                                                                                                                      |
| `DATABASE_URL`          | Optional in dev                          | Defaults to `sqlite:///data.db`. Required in production.                                                                                                                                                                                                                                                                |
| `BACKEND_CORS_ORIGINS`  | Optional                                 | Defaults to `http://localhost:3000`.                                                                                                                                                                                                                                                                                    |
| `ADMIN_SECRET`          | Only if calling `/admin/*` dev endpoints | —                                                                                                                                                                                                                                                                                                                       |

### Starting the server

```powershell
# Powershell — replace <SECRET> with the same value as frontend/.env.local
$env:BACKEND_SHARED_SECRET = "<SECRET>"
$env:JWT_SECRET = "dev-jwt-anything"
$env:APP_ENV = "development"

uvicorn hgs_refuce_app.main:app --reload --port 8000
```

```bash
# bash / WSL
export BACKEND_SHARED_SECRET="<SECRET>"
export JWT_SECRET="dev-jwt-anything"
export APP_ENV="development"

uvicorn hgs_refuce_app.main:app --reload --port 8000
```

The default port is **8000** to match what the frontend expects (`BACKEND_API_URL=http://localhost:8000`). Don't use `--port 8010` unless you also override that on the frontend.

### Demo credentials (seeded on first start)

| Username             | PIN      | Role       |
| -------------------- | -------- | ---------- |
| `sadmin`             | `sadmin` | superadmin |
| `admin@example.com`  | `admin`  | admin      |
| `common@example.com` | `common` | user       |

## Running via Docker

See the root `docker-compose.yml`. It sets all the required env vars on the service definitions, so you don't need to export anything in your shell — just put values in the root `.env` file.
