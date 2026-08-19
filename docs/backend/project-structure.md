---
layout: default
parent: Backend
title: Project structure
nav_order: 1
---

# Project structure

`backend_fast_api/` is a single Python package, `hgs_refuce_app`, laid out under `src/`:

```
backend_fast_api/
  src/hgs_refuce_app/
    main.py            # FastAPI app instance + every route
    storage.py          # DatabaseConnection, UserStorage, DataStorage
    models.py           # Pydantic request/response models
    auth.py              # JWT + HMAC helpers (service-to-service and identity signing)
    logging_config.py   # stdlib logging setup (dev vs prod behavior)
    report/              # Jinja2 template(s) used to render quarterly report HTML
  tests/
    test_endpoints.py    # TestClient-based endpoint tests
```

## `main.py` — one file, no `APIRouter` split

There is **no `APIRouter` modularization** in this codebase. Every route is a decorator directly
on the single module-level `app = FastAPI(...)` instance in
[`main.py`](https://github.com/bouvet/hgs-refuce-application/blob/main/backend_fast_api/src/hgs_refuce_app/main.py).
This was a deliberate choice (see `.claude/knowledge/backend-api.md`, `DECIDED`): keep routes
simple and co-located with their logic rather than split into blueprints/routers.

Reading through the file top to bottom, the route groups are:

1. **root / health** — `GET /`, `GET /db-test`, `GET /favicon.ico`
2. **admin endpoints (developer-only)** — `POST/GET /admin/locations`, `POST /admin/users`,
   `POST /admin/locations/{location_id}/users/{user_id}`, guarded by the `ADMIN_SECRET` header
   (`get_admin_secret` dependency)
3. **pending access requests (super-admin)** — `GET /admin/access-requests`,
   `DELETE /admin/access-requests/{email}`
4. **auth endpoints** — `POST /auth/login`, `GET /auth/validate`, `POST /auth/sso-resolve`
5. **current user** — `GET /currentUser`, `PATCH /currentUser/location`
6. **user endpoints** — `GET/POST /locations`, `DELETE /locations/{location_id}`,
   `GET/POST /users`, `DELETE/PUT /users/{user_id}`, `GET/POST/DELETE /locations/{location_id}/users/{user_id}`
7. **registrations** — full CRUD under `GET/POST /locations/{location_id}/registrations` and
   `GET/PUT/DELETE /locations/{location_id}/registrations/{id}`
8. **reports** — `GET/POST /locations/{location_id}/reports`,
   `GET/DELETE /locations/{location_id}/reports/{period}`, plus two HTML-rendering endpoints:
   `GET /locations/{location_id}/reports/{period}/html` and `.../preview-html`

Cross-cutting pieces also live in `main.py`:

- A `log_requests` HTTP middleware logs every request's method, path, status, and duration.
- A global `unhandled_exception_handler` catches any uncaught exception, logs it, and returns a
  generic `500` — this is also what triggers a production log-buffer flush (see
  `logging_config.py`).
- Authorization dependencies are plain functions used via `Depends(...)`: `get_user_id` (reads the
  `X-User-Id` header), `require_admin`, `require_super_admin`, `require_location_access`, and
  `verify_service_auth` (HMAC-checks service-to-service calls signed by the frontend, e.g.
  `POST /auth/login` and `POST /auth/sso-resolve`).
- The `lifespan` context manager seeds demo data (a "Bouvet Office" location, a `sadmin`
  super-admin user, Haugesund/Stavanger demo locations, an SSO test user) on startup if the
  database is empty — this is why a fresh `data.db` already has usable accounts.

For request/response signing details (the `X-User-Sig*` headers and `verify_service_hmac`), see
[Authentication]({{ site.baseurl }}/architecture/authentication/).

## Where to add a new endpoint

Given the one-file structure, adding an endpoint is:

1. Add any new Pydantic request/response shapes to `models.py`.
2. Add the storage method(s) it needs to `UserStorage` or `DataStorage` in `storage.py` (see
   [Database]({{ site.baseurl }}/backend/database/)).
3. Add the `@app.get/post/put/delete(...)` decorator directly in `main.py`, in the route group it
   belongs to (there's no registration step beyond the decorator — FastAPI picks it up from the
   `app` instance).
4. Reuse one of the existing `Depends(...)` authorization helpers rather than writing a new
   auth check inline, unless the endpoint genuinely needs new rules.
5. Add a test in `tests/test_endpoints.py` — see [Testing]({{ site.baseurl }}/backend/testing/).

## Models vs storage vs routes

- `models.py` — Pydantic-only, no ORM. These are the request bodies and response shapes FastAPI
  validates/serializes against (`WasteRegistration`, `Report`, `Location`, `User`, `CurrentUser`,
  and the various `*Request`/`*Response` DTOs like `SsoResolveRequest`, `LoginRequest`, etc).
- `storage.py` — all persistence. `DatabaseConnection` owns the SQLAlchemy engine and raw-SQL
  schema creation; `UserStorage` and `DataStorage` wrap hand-written `text()` SQL (no ORM models,
  no query builder) for users/locations and registrations/reports respectively. See
  [Database]({{ site.baseurl }}/backend/database/) for details.
- `main.py` — wires HTTP verbs/paths to storage calls and enforces authorization/business rules
  (e.g. rejecting writes to a locked quarter) inline in the route function.

For the full data model and how it relates to the frontend's types, see
[Data model]({{ site.baseurl }}/architecture/data-model/).

## API reference

For the full list of routes, request/response shapes, and status codes, see the generated
[API reference]({{ site.baseurl }}/backend/api-reference/).
