---
title: Backend
layout: default
nav_order: 4
has_children: true
---

# Backend

Python + FastAPI + SQLAlchemy (SQLite locally, PostgreSQL in production). All 34 routes live in one
file, `src/hgs_refuce_app/main.py` — there is no `APIRouter` split.

| Page | Covers |
| --- | --- |
| [Project structure]({{ site.baseurl }}/backend/project-structure/) | `main.py` / `storage.py` / `models.py` responsibilities |
| [API reference]({{ site.baseurl }}/backend/api-reference/) | Generated route table (grouped by domain) — never hand-maintained |
| [Database]({{ site.baseurl }}/backend/database/) | `DatabaseConnection`, `UserStorage`, `DataStorage`; SQLite vs PostgreSQL |
| [Testing]({{ site.baseurl }}/backend/testing/) | `TestClient`, `setup_function()` DB reset, running a single test |

CORS origins are controlled by the `BACKEND_CORS_ORIGINS` env var (defaults to
`http://localhost:3000`); see [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/).
