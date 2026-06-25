# Docker Compose Setup for hgs-refuce-application

This document describes the complete Docker-based local development setup using Docker Compose.

## Architecture

The setup consists of 4 services in a shared Docker network:

```
┌─────────────────────────────────────────────────────────────────┐
│                    hgs-refuce-network (bridge)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │  auth-db     │      │   data-db    │      │  frontend    │   │
│  │ PostgreSQL   │      │  PostgreSQL  │      │   Next.js    │   │
│  │   :5432      │      │    :5432     │      │   :3000      │   │
│  └──────────────┘      └──────────────┘      └──────────────┘   │
│         ▲                       ▲                      │          │
│         │                       │                      │          │
│         │ AUTH_DATABASE_URL     │ DATABASE_URL        │          │
│         │                       │              BACKEND_API_URL   │
│         │                       │              (http://backend)  │
│         │                       │                      │          │
│         └───────────────────────┴──────────────────────┘          │
│                                                                   │
│                     ┌──────────────┐                            │
│                     │   backend    │                            │
│                     │   FastAPI    │                            │
│                     │    :8000     │                            │
│                     └──────────────┘                            │
│                           ▲                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                     Port forwarding (localhost:8000)
```

## Services

### auth-db
- **Image**: postgres:16-alpine
- **Port**: 5432 (mapped to localhost:5432)
- **Database**: `refuce_auth`
- **Credentials**: postgres / dev
- **Purpose**: Stores Better Auth tables (users, sessions, accounts, verification codes)
- **Initialization**: Runs `scripts/init-auth-db.sql` on container startup
- **Volumes**: `auth_db_data` (persistent data storage)
- **Network name**: `auth-db`

### data-db
- **Image**: postgres:16-alpine
- **Port**: 5432 (mapped to localhost:5433)
- **Database**: `refuce_data`
- **Credentials**: postgres / dev
- **Purpose**: Stores FastAPI application data (locations, registrations, reports, backend users)
- **Initialization**: Runs `scripts/init-data-db.sql` on container startup
- **Volumes**: `data_db_data` (persistent data storage)
- **Network name**: `data-db`

### backend
- **Image**: Built from `backend_fast_api/Dockerfile`
- **Port**: 8000 (mapped to localhost:8000)
- **Environment Variables**:
  - `APP_ENV`: development
  - `DATABASE_URL`: postgresql://postgres:dev@data-db:5432/refuce_data
  - `BACKEND_CORS_ORIGINS`: http://localhost:3000,http://frontend:3000
  - `SECRET_KEY`: dev-secret-key-change-in-production (or from .env)
  - `ADMIN_SECRET`: dev-admin-secret (or from .env)
  - `LOG_LEVEL`: INFO (or from .env)
- **Depends On**: data-db (waits for healthcheck to pass)
- **Healthcheck**: Checks FastAPI /docs endpoint
- **Network name**: `backend`

### frontend
- **Image**: Built from `frontend/Dockerfile`
- **Port**: 3000 (mapped to localhost:3000)
- **Environment Variables**:
  - `BETTER_AUTH_URL`: http://localhost:3000
  - `BETTER_AUTH_SECRET`: dev-better-auth-secret-change-in-production (or from .env)
  - `AUTH_DATABASE_URL`: postgresql://postgres:dev@auth-db:5432/refuce_auth
  - `BACKEND_API_URL`: http://backend:8000
  - `BACKEND_SHARED_SECRET`: dev-shared-secret (or from .env)
  - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`: Optional for SSO
  - `NODE_ENV`: development
- **Depends On**: backend (waits for healthcheck), auth-db (waits for healthcheck)
- **Network name**: `frontend`

## Service Communication

All services communicate via service names within the Docker network:

| From | To | Connection String |
|------|-----|-------------------|
| frontend | backend | `http://backend:8000` |
| frontend | auth-db | `postgresql://postgres:dev@auth-db:5432/refuce_auth` |
| backend | data-db | `postgresql://postgres:dev@data-db:5432/refuce_data` |

**Important**: Service-to-service connections use internal Docker DNS (service names). Localhost connections only work from the host machine.

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- `.env` file in the repository root (optional, for overriding defaults)

### 1. Prepare Environment Variables (Optional)

Create a `.env` file in the repository root to override defaults:

```bash
# .env (optional)
SECRET_KEY=your-secure-key-here
ADMIN_SECRET=your-admin-secret-here
BETTER_AUTH_SECRET=your-better-auth-secret-here
BACKEND_SHARED_SECRET=your-shared-secret-here
LOG_LEVEL=INFO

# Optional: Microsoft SSO configuration
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
```

**Note**: If not provided, sensible development defaults are used.

### 2. Start All Services

```bash
docker-compose up -d
```

This will:
1. Build the backend and frontend images (if not already built)
2. Start auth-db with initialization script
3. Start data-db with initialization script
4. Start backend (after data-db is healthy)
5. Start frontend (after backend and auth-db are healthy)

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f auth-db
docker-compose logs -f data-db
```

### 5. Stop Services

```bash
# Stop without removing containers
docker-compose stop

# Stop and remove containers (volumes are preserved)
docker-compose down

# Stop and remove everything (including volumes)
docker-compose down -v
```

## Database Seeding

### Demo Users (in data-db)

The `scripts/init-data-db.sql` script seeds the following demo users on container startup:

| Username | Password | Role | Location |
|----------|----------|------|----------|
| sadmin | sadmin | Super Admin | Bouvet Office |
| admin | admin | Admin | Bouvet Office |
| common | common | User | Bouvet Office |
| user1 | 234 | User | Bouvet Office |
| haugesundUser | 123 | User | Haugesund |
| stavangerUser | 123 | User | Stavanger |

These users are created in the `refuce_data` database for the backend API.

### Better Auth Users (in auth-db)

Better Auth manages its own user tables and does not have pre-seeded users. Users are created via:
1. **Microsoft SSO**: Sign in with Microsoft Entra ID (if configured)
2. **PIN Login**: Use the frontend's custom PIN login (username + PIN from the backend)

To test without SSO, use the PIN login with credentials from the demo users above.

## Troubleshooting

### Services won't start
Check logs: `docker-compose logs -f`

Common issues:
- **Port already in use**: Change port mappings in docker-compose.yml
- **Database won't initialize**: Check init script syntax in `scripts/`
- **Backend health check fails**: Ensure data-db is running and healthy

### Can't connect to database from host
Use localhost with the mapped port:
- auth-db: `psql -h localhost -p 5432 -U postgres -d refuce_auth`
- data-db: `psql -h localhost -p 5433 -U postgres -d refuce_data`

Password: `dev`

### Frontend can't reach backend
Check that `BACKEND_API_URL` in frontend environment is set to `http://backend:8000`.

If testing from outside Docker, use `http://localhost:8000` instead.

### Database migrations not applied
The backend's `DatabaseConnection._init_schema()` runs automatically on startup. If tables are missing:
1. Check backend logs: `docker-compose logs backend`
2. Ensure data-db is healthy: `docker-compose ps`
3. Manually run schema creation: Connect to data-db and execute the SQL from `scripts/init-data-db.sql`

## Environment Variables Reference

### For development (defaults in docker-compose.yml)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_KEY` | `dev-secret-key-change-in-production` | FastAPI secret key (override in .env) |
| `ADMIN_SECRET` | `dev-admin-secret` | FastAPI admin endpoint secret (override in .env) |
| `BETTER_AUTH_SECRET` | `dev-better-auth-secret-change-in-production` | Better Auth session secret (override in .env) |
| `BACKEND_SHARED_SECRET` | `dev-shared-secret` | HMAC secret between frontend and backend (override in .env) |
| `LOG_LEVEL` | `INFO` | Backend logging level (override in .env) |
| `MICROSOFT_CLIENT_ID` | Empty | Microsoft SSO client ID (optional) |
| `MICROSOFT_CLIENT_SECRET` | Empty | Microsoft SSO client secret (optional) |
| `MICROSOFT_TENANT_ID` | `common` | Microsoft SSO tenant (optional) |

## Assumptions Made

1. **Development-only setup**: Passwords are plaintext (dev/dev) and secrets are hardcoded. Change these for production.

2. **SQLite not used**: The backend uses PostgreSQL (data-db) instead of SQLite for consistency with production.

3. **Separate databases**: auth-db and data-db are completely separate for security and architectural clarity.

4. **Service names**: All services resolve each other by name (auth-db, data-db, backend, frontend) within the Docker network.

5. **Healthchecks**: Databases have healthchecks; backend and frontend wait for dependencies before starting.

6. **Persistent volumes**: Database data persists between container restarts (in named volumes `auth_db_data` and `data_db_data`).

7. **No external services**: SSO (Microsoft Entra ID) is optional and external to the Docker setup.

8. **PostgreSQL version**: Both databases use postgres:16-alpine (lightweight, security-patched).

## Files Added/Modified

### New Files
- `docker-compose.yml` — Complete multi-container setup
- `scripts/init-auth-db.sql` — Database initialization for auth-db
- `scripts/init-data-db.sql` — Database initialization and seeding for data-db
- `DOCKER_SETUP.md` — This documentation

### Modified Files
None. The existing Dockerfiles work without modification.

## Next Steps for Production

1. **Change secrets**: Generate strong, unique values for all `*_SECRET` variables.
2. **Use Azure Database for PostgreSQL**: Replace local Postgres containers with Azure-managed instances.
3. **Enable SSL**: Use `sslmode=require` in connection strings.
4. **Add authentication**: Implement proper database user roles (don't use postgres:postgres).
5. **Set up CI/CD**: Use GitHub Actions to build and push images to a registry.
6. **Configure DNS**: Use actual domain names instead of localhost.
7. **Enable monitoring**: Add logging, tracing, and alerting.

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Docker](https://nextjs.org/docs/app/building-your-application/deploying/docker)
