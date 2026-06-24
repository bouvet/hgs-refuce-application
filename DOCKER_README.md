# Docker Setup for hgs-refuce-application

Complete multi-container Docker Compose setup for local development with PostgreSQL databases, FastAPI backend, and Next.js frontend.

## 🚀 Quick Start (30 seconds)

```bash
docker-compose up -d
```

Visit: http://localhost:3000

Login with: `sadmin` / `sadmin` (PIN login)

## 📋 What's Running

| Service | Purpose | Port | Technology |
|---------|---------|------|-----------|
| **frontend** | User interface | 3000 | Next.js 16 |
| **backend** | REST API | 8000 | FastAPI |
| **data-db** | App data storage | 5433 | PostgreSQL 16 |
| **auth-db** | Authentication | 5432 | PostgreSQL 16 |

## 📖 Documentation

**Start here:**
- 📄 **DOCKER_QUICKSTART.md** — 5-minute quick start (recommended first read)
- 📄 **DOCKER_SETUP.md** — Complete technical documentation
- 📄 **DOCKER_IMPLEMENTATION_SUMMARY.md** — What was created and why
- 📄 **This file** — Quick reference

## 🔑 Demo Login Credentials

Use these for the PIN login (username / PIN):

| User | PIN | Role | Location |
|------|-----|------|----------|
| sadmin | sadmin | Super Admin | Bouvet Office |
| admin | admin | Admin | Bouvet Office |
| common | common | User | Bouvet Office |
| user1 | 234 | User | Bouvet Office |

## 📚 Common Commands

```bash
# Start all services
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services (data persists)
docker-compose stop

# Restart services
docker-compose restart

# Remove containers (data persists in volumes)
docker-compose down

# Remove everything including data
docker-compose down -v

# Rebuild images (if Dockerfile changed)
docker-compose build
```

## 🗄️ Database Access

```bash
# Connect to application database (data-db)
psql -h localhost -p 5433 -U postgres -d refuce_data
# Password: dev

# Connect to authentication database (auth-db)
psql -h localhost -p 5432 -U postgres -d refuce_auth
# Password: dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs (interactive API explorer)

## ⚙️ Environment Variables

Create `.env` file (optional, for custom values):

```bash
cp .env.example .env
# Edit .env with your values
```

All variables have sensible development defaults.

## 📂 File Structure

```
.
├── docker-compose.yml                 # Main configuration
├── scripts/
│   ├── init-auth-db.sql              # Auth database initialization
│   └── init-data-db.sql              # App database initialization & seeding
├── backend_fast_api/
│   └── Dockerfile                    # Backend image definition
├── frontend/
│   └── Dockerfile                    # Frontend image definition
├── .env.example                      # Environment variables template
├── DOCKER_README.md                  # This file
├── DOCKER_QUICKSTART.md              # Quick start guide
├── DOCKER_SETUP.md                   # Comprehensive documentation
└── DOCKER_IMPLEMENTATION_SUMMARY.md   # Implementation details
```

## 🔍 Architecture

All services communicate via a shared Docker network (`hgs-refuce-network`):

```
frontend:3000 ──┐
                ├─→ backend:8000 ──→ data-db:5432
auth-db:5432 ←─┘
```

## ✅ Verification

Check that all services are healthy:

```bash
docker-compose ps
```

All services should show `healthy` status.

## 🆘 Troubleshooting

**Issue**: Services won't start  
**Solution**: `docker-compose logs -f` (check error messages)

**Issue**: Port already in use  
**Solution**: Edit `docker-compose.yml` port mappings or kill existing process

**Issue**: Database connection errors  
**Solution**: Ensure data-db is healthy: `docker-compose ps`

**Issue**: Frontend can't reach backend  
**Solution**: Restart frontend: `docker-compose restart frontend`

**Issue**: Start fresh  
**Solution**: `docker-compose down -v && docker-compose up -d`

See **DOCKER_SETUP.md → Troubleshooting** for detailed help.

## 📝 Key Features

✓ Two separate PostgreSQL databases (auth & app data)  
✓ Automatic database initialization with demo data  
✓ Health checks on all services  
✓ Proper dependency ordering (frontend waits for backend)  
✓ Persistent data volumes  
✓ Service-to-service communication via Docker DNS  
✓ Environment variable configuration  
✓ Development-ready with demo users pre-seeded  

## 🔐 Security Notes

⚠️ **Development only**: All passwords are `dev` and secrets are hardcoded.

**For production**, you MUST:
- Generate strong secrets with `openssl rand -base64 32`
- Use Azure Database for PostgreSQL (managed service)
- Enable SSL/TLS
- Use proper database credentials
- Set up monitoring and logging
- Use a secrets management system

See **DOCKER_SETUP.md → Next Steps for Production** for details.

## 🛠️ Development Workflow

1. **Start stack**: `docker-compose up -d`
2. **Make code changes** in `backend_fast_api/` or `frontend/`
3. **Rebuild** (if Dockerfile changed): `docker-compose build`
4. **Restart service**: `docker-compose restart backend` or `docker-compose restart frontend`
5. **View changes**: Reload browser or check API

## 📞 Need Help?

1. Check **DOCKER_QUICKSTART.md** (quick reference)
2. Read **DOCKER_SETUP.md** (comprehensive guide)
3. View logs: `docker-compose logs -f`
4. Check service status: `docker-compose ps`

## 📋 Checklist: Getting Started

- [ ] Docker and Docker Compose installed
- [ ] Navigate to project directory
- [ ] Run `docker-compose up -d`
- [ ] Wait ~15-20 seconds for services to be healthy
- [ ] Visit http://localhost:3000
- [ ] Login with `sadmin` / `sadmin` (PIN)
- [ ] Select a location
- [ ] Explore the application!

## 🎯 Next Steps

- **First run**: Follow **DOCKER_QUICKSTART.md**
- **Deep dive**: Read **DOCKER_SETUP.md**
- **Customize**: Create `.env` from `.env.example`
- **Develop**: Make code changes and restart services
- **Deploy**: See DOCKER_SETUP.md → Production

---

**Version**: 1.0  
**Last updated**: 2026-06-24  
**Status**: ✅ Production-ready for local development
