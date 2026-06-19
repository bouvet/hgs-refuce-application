---
applyTo: backend_fast_api/src/**/*.py,backend_fast_api/tests/**/*.py
---

# Python & FastAPI

## Guidelines

- FastAPI routing: define endpoints in main.py with clear HTTP verb + path
- Use Pydantic models for request/response validation
- SQLAlchemy ORM for database operations (no raw SQL)
- Pytest for testing; use TestClient against the live app instance
- Type hints required (no implicit Any)

## Project structure

- `src/hgs_refuce_app/main.py` — FastAPI app + routes
- `src/hgs_refuce_app/models.py` — Pydantic + SQLAlchemy models
- `src/hgs_refuce_app/storage.py` — DatabaseConnection, UserStorage, DataStorage classes
- `tests/test_endpoints.py` — endpoint tests
- `.venv/` — virtual environment (always activate before running commands)

## Database

- SQLite locally (db.sqlite), PostgreSQL in production
- No migrations; schema defined in models.py
- Tests reset DB via `Base.metadata.drop_all()` + `create_all()` in setup_function()

## Testing

- Use `from fastapi.testclient import TestClient`
- Wrap app instance: `client = TestClient(app)`
- Reset DB between tests: `setup_function()` clears all data
- Test endpoint behavior, not implementation details

## Environment variables

- BACKEND_CORS_ORIGINS (defaults to http://localhost:3000)
- DATABASE_URL (defaults to sqlite:///db.sqlite)
- ADMIN_SECRET (required for /admin/* endpoints)
