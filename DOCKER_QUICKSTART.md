# Docker Quick Start Guide

Get the complete hgs-refuce-application stack running in minutes.

## One-liner: Start Everything

```bash
docker-compose up -d
```

That's it! All 4 services will start automatically with proper dependency ordering.

**Note**: On first run, Docker will build the frontend and backend images. This takes ~30-60 seconds depending on your system. Subsequent runs are faster.

## Wait for services to be healthy

```bash
docker-compose ps
```

All services should show `healthy` status. May take 15-20 seconds on first run.

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Backend API Docs**: http://localhost:8000/docs

## Login

Use the PIN login with demo credentials:

| Username | PIN |
|----------|-----|
| sadmin | sadmin |
| admin | admin |
| common | common |
| user1 | 234 |

Select a location after login (e.g., "Bouvet Office", "Haugesund", "Stavanger").

## Common Commands

```bash
# View all logs (follow in real-time)
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# Stop everything (data persists)
docker-compose stop

# Restart everything
docker-compose restart

# Stop and remove all containers (data persists in volumes)
docker-compose down

# Stop and remove everything INCLUDING DATA
docker-compose down -v

# Rebuild images (if Dockerfile changed)
docker-compose build

# Rebuild and restart
docker-compose up -d --build
```

## Database Access

### Connect to data-db (application data)
```bash
psql -h localhost -p 5433 -U postgres -d refuce_data
# Password: dev
```

### Connect to auth-db (Better Auth)
```bash
psql -h localhost -p 5432 -U postgres -d refuce_auth
# Password: dev
```

## Troubleshooting

### Backend or Frontend won't start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Port 3000 or 8000 already in use
Edit docker-compose.yml and change the port mappings:
```yaml
ports:
  - "3001:3000"  # frontend on 3001
  - "8001:8000"  # backend on 8001
```

### Database connection errors
```bash
# Check if databases are healthy
docker-compose ps

# Restart databases
docker-compose restart auth-db data-db
```

### Clear all data and start fresh
```bash
docker-compose down -v
docker-compose up -d
```

## Advanced: Custom Environment Variables

Create a `.env` file:

```bash
# .env
SECRET_KEY=your-custom-secret
ADMIN_SECRET=your-admin-secret
BETTER_AUTH_SECRET=your-auth-secret
BACKEND_SHARED_SECRET=your-shared-secret
LOG_LEVEL=DEBUG
```

Then restart:
```bash
docker-compose up -d
```

See `.env.example` for all available variables.

## What's Running

| Service | Purpose | Port | Tech |
|---------|---------|------|------|
| auth-db | Better Auth database | 5432 | PostgreSQL 16 |
| data-db | Application data | 5433 | PostgreSQL 16 |
| backend | FastAPI server | 8000 | Python + FastAPI |
| frontend | Next.js frontend | 3000 | Node.js + Next.js 16 |

All services communicate via internal Docker network.

## Full Documentation

See `DOCKER_SETUP.md` for comprehensive documentation including:
- Architecture diagram
- Service details
- Networking explanation
- Environment variables reference
- Production migration guide
