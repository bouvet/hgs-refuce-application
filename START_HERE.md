# 🚀 hgs-refuce-application Docker Setup - START HERE

## What You Have

A complete, production-ready Docker Compose setup for local development with:

- ✅ Frontend (Next.js 16)
- ✅ Backend (FastAPI)
- ✅ Two PostgreSQL databases (auth-db and data-db)
- ✅ Automatic database initialization and seeding
- ✅ All images built and ready to run

## Get Started in 30 Seconds

```bash
# 1. Start all services
docker-compose up -d

# 2. Wait 15-20 seconds for services to be healthy
docker-compose ps

# 3. Open browser
open http://localhost:3000

# 4. Login with demo credentials
# Username: sadmin
# PIN: sadmin
```

## Demo Accounts

| Username | PIN | Role |
|----------|-----|------|
| sadmin | sadmin | Super Admin |
| admin | admin | Admin |
| common | common | User |
| user1 | 234 | User |

## What's Running

| Service | URL | Tech |
|---------|-----|------|
| Frontend | http://localhost:3000 | Next.js 16 |
| Backend API | http://localhost:8000 | FastAPI |
| API Docs | http://localhost:8000/docs | Swagger UI |

## Database Access

```bash
# Application data
psql -h localhost -p 5433 -U postgres -d refuce_data
# Password: dev

# Authentication (Better Auth)
psql -h localhost -p 5432 -U postgres -d refuce_auth
# Password: dev
```

## Common Commands

```bash
# View logs (all services)
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services (data persists)
docker-compose stop

# Restart a service
docker-compose restart frontend

# Remove containers (data persists)
docker-compose down

# Remove everything including data
docker-compose down -v

# Rebuild images
docker-compose build
docker-compose up -d
```

## Files & Documentation

### Quick References
- 📄 **DOCKER_README.md** — Quick reference guide
- 📄 **DOCKER_QUICKSTART.md** — 5-minute setup guide

### Detailed Docs
- 📄 **DOCKER_SETUP.md** — Complete technical documentation
- 📄 **DOCKER_IMPLEMENTATION_SUMMARY.md** — What was created and why
- 📄 **DOCKER_BUILD_FIXES.md** — Build configuration details

### Configuration
- 📄 **.env.example** — Environment variables template
- 📄 **docker-compose.yml** — Service configuration
- 📄 **scripts/init-*.sql** — Database initialization

## Architecture

```
┌─────────────────────────────────────────┐
│     Docker Network: hgs-refuce           │
├─────────────────────────────────────────┤
│                                         │
│  auth-db (PostgreSQL)                  │
│  :5432                                  │
│     ↑                                    │
│     └─→ frontend:3000 (Next.js)        │
│                ↓                        │
│           backend:8000 (FastAPI)       │
│                ↓                        │
│     data-db (PostgreSQL) :5432         │
│                                         │
└─────────────────────────────────────────┘
```

## Customization

Create `.env` file to override defaults:

```bash
cp .env.example .env
# Edit .env with custom values
docker-compose up -d --build
```

## Troubleshooting

**Services won't start?**
```bash
docker-compose logs -f
```

**Port already in use?**
Edit `docker-compose.yml` and change port mappings (e.g., `3001:3000`).

**Database issues?**
```bash
docker-compose restart data-db auth-db
```

**Start from scratch?**
```bash
docker-compose down -v
docker-compose up -d
```

## Production Deployment

⚠️ **Important**: This setup uses development defaults. For production:

1. Generate strong secrets: `openssl rand -base64 32`
2. Use Azure Database for PostgreSQL
3. Enable SSL/TLS
4. Configure real Microsoft Entra ID credentials
5. Set up monitoring and logging

See `DOCKER_SETUP.md` → "Next Steps for Production" for details.

## Next Steps

1. ✅ Start the stack: `docker-compose up -d`
2. ✅ Access frontend: http://localhost:3000
3. ✅ Login with credentials above
4. 📖 Read `DOCKER_README.md` for quick reference
5. 📖 Read `DOCKER_SETUP.md` for complete details

## Key Features

✓ All 4 services configured and ready to run  
✓ Automatic database initialization  
✓ 6 demo users pre-seeded  
✓ Health checks and proper startup ordering  
✓ Persistent data volumes  
✓ Service-to-service communication via Docker DNS  
✓ Environment variable configuration  
✓ Complete documentation  

## Support

- 📖 Check the documentation files (DOCKER_*.md)
- 🔍 View logs: `docker-compose logs -f`
- ⚙️ Check status: `docker-compose ps`
- 🗑️ Clean up: `docker-compose down -v && docker-compose up -d`

---

**Ready?** Run: `docker-compose up -d`

**Questions?** See the documentation files above.

**Need help?** Check `DOCKER_SETUP.md` → Troubleshooting section.
