# Knowledge Base Index

This index provides an overview of the project's externalized mental model. Read the specific knowledge files before editing code in their domains.

## Domains & Files

### 1. Backend API (`backend-api.md`)

- FastAPI application structure and endpoints
- Auth, locations, registrations, reports, admin endpoints
- Route definitions and request/response flows
- 64 entries (OWNS, READS FROM, WRITES TO, INVARIANT, FLOW, TENSION, DECIDED)

### 2. Database Layer (`database-layer.md`)

- SQLAlchemy models and storage classes
- DatabaseConnection, UserStorage, DataStorage
- Schema definitions (User, Location, WasteRegistration, Report)
- Database queries and test setup
- 49 entries

### 3. Frontend Architecture (`frontend-architecture.md`)

- Next.js 16 App Router routing structure
- Page organization (server page.tsx + client \*-content.tsx)
- Layouts, environment variables, build setup
- 53 entries

### 4. Component Structure (`component-structure.md`)

- React component organization and patterns
- UI components, providers, admin/waste/stats/layout components
- Server/client component separation
- Tailwind CSS and shadcn/UI usage
- 58 entries

### 5. Data Repository Pattern (`data-repository.md`)

- WasteRepository interface and implementation
- BackendWasteRepository HTTP client
- Singleton pattern and data types
- Error handling and caching considerations
- 38 entries

### 6. Auth & RBAC (`auth-rbac.md`)

- **Better Auth 1.6** in Next.js with Postgres-backed sessions
- Microsoft Entra ID SSO + custom PIN plugin (delegates to FastAPI `/auth/login`)
- Three roles: `user` | `admin` | `superadmin`
- Server-side guards (`requireSession`, `requireRole`); no client-side `RoleGuard`
- HMAC-signed identity header on every backend call from the Next.js proxy
- Rewritten 2026-06; many `DECIDED` entries reverse the prior localStorage-era model
- 90 entries

### 7. Build & Deployment (`build-deploy.md`)

- Monorepo structure and startup scripts
- Backend dev (uvicorn, pytest) and frontend dev (Turbopack)
- Docker and CI/CD setup
- Environment variables and configuration
- The `docs/` Jekyll documentation site (Pages branch-source deploy, generated API reference)
- 61 entries

**Total: 413 entries across 7 domains** (recounted 2026-08 during the documentation overhaul —
the previous per-file counts here had drifted badly; recount periodically rather than trusting
these numbers indefinitely).

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

### Write Docs (`skills/write-docs/SKILL.md`)

- Author or update a page on the `docs/` Jekyll site
- Read gate: knowledge file + real source before writing; check for an existing page first
- Correct front matter (`parent`, `nav_order`), `{{ site.baseurl }}` links, cross-linking
- Note any newly discovered invariant in the knowledge base (write gate)

### Docs Audit (`skills/docs-audit/SKILL.md`)

- Detect drift between `docs/` and the working tree (stale paths, dead endpoints, broken links)
- Extract verifiable claims and check each against the code, `package.json`, `.env.example`, `docker-compose.yml`
- Validate `parent:`/`nav_order` structure and internal link resolution
- Report findings as a table; fix only when asked

### Update API Reference (`skills/update-api-reference/SKILL.md`)

- Regenerate `docs/backend/{openapi.json,api-reference.md,api-explorer.html}` from `app.openapi()`
- Run `scripts/gen_openapi_docs.py`, diff the output, summarize route/model changes
- Flag prose pages referencing a changed endpoint for a `write-docs` follow-up

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
- **Changing authentication?** → Read `auth-rbac.md` first — it was rewritten in 2026-06 for Better Auth. Then check `backend-api.md` (HMAC verification, sso-resolve endpoint).
- **Deploying or configuring?** → Read `build-deploy.md`
- **Uncertain about a design decision?** → Search knowledge files for `DECIDED:` entries
