# Knowledge Base Index

This index provides an overview of the project's externalized mental model. Read the specific knowledge files before editing code in their domains.

## Domains & Files

### 1. Backend API (`backend-api.md`)
- FastAPI application structure and endpoints
- Auth, locations, registrations, reports, admin endpoints
- Route definitions and request/response flows
- 11 entries (OWNS, READS FROM, WRITES TO, INVARIANT, FLOW, TENSION, DECIDED)

### 2. Database Layer (`database-layer.md`)
- SQLAlchemy models and storage classes
- DatabaseConnection, UserStorage, DataStorage
- Schema definitions (User, Location, WasteRegistration, Report)
- Database queries and test setup
- 12 entries

### 3. Frontend Architecture (`frontend-architecture.md`)
- Next.js 16 App Router routing structure
- Page organization (server page.tsx + client *-content.tsx)
- Layouts, environment variables, build setup
- 9 entries

### 4. Component Structure (`component-structure.md`)
- React component organization and patterns
- UI components, providers, admin/waste/stats/layout components
- Server/client component separation
- Tailwind CSS and shadcn/UI usage
- 10 entries

### 5. Data Repository Pattern (`data-repository.md`)
- WasteRepository interface and implementation
- BackendWasteRepository HTTP client
- Singleton pattern and data types
- Error handling and caching considerations
- 8 entries

### 6. Auth & RBAC (`auth-rbac.md`)
- Two-tier role system (admin, common)
- Frontend login flow and backend validation
- UserProvider and localStorage persistence
- RoleGuard component and access control
- 9 entries

### 7. Build & Deployment (`build-deploy.md`)
- Monorepo structure and startup scripts
- Backend dev (uvicorn, pytest) and frontend dev (Turbopack)
- Docker and CI/CD setup
- Environment variables and configuration
- 8 entries

**Total: 67 entries across 7 domains**

## Instruction Files

### TypeScript & React Components (`instructions/typescript-components.md`)
- Applies to: `frontend/app/**/*.tsx`, `frontend/components/**/*.tsx`, `frontend/lib/**/*.ts`
- Guidelines for client/server components, imports, state management, styling

### Python & FastAPI (`instructions/python-fastapi.md`)
- Applies to: `backend_fast_api/src/**/*.py`, `backend_fast_api/tests/**/*.py`
- Guidelines for endpoints, models, database, testing, environment

## Skills

### Retrospective (`skills/retrospective/SKILL.md`)
- Post-task review process
- Classify lessons learned (fix vs. document)
- Decide where to record: knowledge / instructions / skills / code comments
- Apply changes and reference in commits

## How to Use

1. **Before editing code:** Check the Knowledge Base Reference table in CLAUDE.md
2. **Read relevant files:** Open `.claude/knowledge/<domain>.md` for the area you're changing
3. **After the task:** Run `/retrospective` to review and update the knowledge base
4. **Link related knowledge:** Use `related:` frontmatter to cross-reference domains

## Quick Lookup

- **Changing an endpoint?** → Read `backend-api.md`, then check `auth-rbac.md` and `database-layer.md`
- **Adding a React component?** → Read `component-structure.md` and `frontend-architecture.md`
- **Modifying database schema?** → Read `database-layer.md` and `backend-api.md`
- **Adding a new page?** → Read `frontend-architecture.md` and `auth-rbac.md`
- **Changing authentication?** → Read `auth-rbac.md` and `backend-api.md`
- **Deploying or configuring?** → Read `build-deploy.md`
- **Uncertain about a design decision?** → Search knowledge files for `DECIDED:` entries
