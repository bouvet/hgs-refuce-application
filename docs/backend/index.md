---
title: Backend
layout: default
nav_order: 4
has_children: true
---

# Backend

Python + FastAPI + SQLAlchemy (SQLite locally, PostgreSQL in production).

## Key files

- `src/hgs_refuce_app/main.py` — FastAPI app; default port 8000, CORS origins controlled by
  `BACKEND_CORS_ORIGINS` env var (defaults to `http://localhost:3000`)
- `src/hgs_refuce_app/storage.py` — `DatabaseConnection`, `UserStorage`, `DataStorage` classes
- `src/hgs_refuce_app/models.py` — Pydantic models: `WasteRegistration`, `Report`, `Location`, `User`, etc.

## Endpoints

- `POST /auth/login` — authenticate a user
- `GET/POST /locations` — list user's locations or create one (super-admin)
- `GET/POST /locations/{id}/registrations` — list/create waste registrations for a location
- `GET/PUT/DELETE /locations/{id}/registrations/{id}` — get, update, delete a registration
- `GET/POST /locations/{id}/reports` — list/submit a quarterly report (locks that quarter)
- `GET/DELETE /locations/{id}/reports/{period}` — get or delete (unlock) a report
- `GET/POST/DELETE /users`, `/locations/{id}/users` — user management (admin)
- `GET/POST /admin/locations`, `/admin/users` — developer-only endpoints (require `ADMIN_SECRET` header)

## Testing

Tests use FastAPI's `TestClient` against the live app instance and clear the DB with
`setup_function()` between tests.

```bash
pytest
pytest tests/test_endpoints.py::test_add_and_get_datapoint  # single test
```
