---
layout: default
parent: Backend
title: Testing
nav_order: 3
---

# Testing

All backend tests live in
[`backend_fast_api/tests/test_endpoints.py`](https://github.com/bouvet/hgs-refuce-application/blob/main/backend_fast_api/tests/test_endpoints.py)
(a single file). They exercise the HTTP layer directly through FastAPI's `TestClient`, against the
same `app` instance and the same `user_storage` / `data_storage` singletons the live server uses
— there is no mocking of the storage layer.

## `TestClient` against the live app instance

```python
from fastapi.testclient import TestClient
from hgs_refuce_app.main import app, user_storage, data_storage, verify_service_auth

client = TestClient(app)
```

Because `app`, `user_storage`, and `data_storage` are imported directly from `main.py`, tests hit
the exact same route functions, dependency wiring, and database connection that
`uvicorn hgs_refuce_app.main:app` would use — the only difference is the database is whatever
`DATABASE_URL`/`APP_ENV` resolve to at import time (SQLite by default, see
[Database]({{ site.baseurl }}/backend/database/)).

## `setup_function()` — the DB-reset pattern

Pytest calls a module-level `setup_function()` before **every** test function in the file. Here it
wipes all rows (not the schema) from every table so each test starts from an empty database:

```python
def setup_function():
    with user_storage.engine.connect() as conn:
        conn.execute(text("DELETE FROM location_users"))
        conn.execute(text("DELETE FROM locations"))
        conn.execute(text("DELETE FROM users"))
        conn.execute(text("DELETE FROM pending_access_requests"))
        conn.commit()
    with data_storage.engine.connect() as conn:
        conn.execute(text("DELETE FROM registrations"))
        conn.execute(text("DELETE FROM reports"))
        conn.commit()
    app.dependency_overrides[verify_service_auth] = lambda: None


def teardown_function():
    app.dependency_overrides.pop(verify_service_auth, None)
```

Two things worth calling out:

- Delete order matters for FK-referencing tables (`location_users` before `locations`,
  for example) even though SQLite doesn't enforce foreign keys by default — keep it in this order
  if you add new tables with dependencies.
- `setup_function` also overrides the `verify_service_auth` dependency to a no-op via
  `app.dependency_overrides`. This deliberately bypasses HMAC signature verification for
  service-to-service endpoints (`POST /auth/login`, `POST /auth/sso-resolve`) so tests can call
  them without constructing a real signed request. The actual signing/verification logic
  (`verify_service_hmac` in `auth.py`) is exercised separately by dedicated unit tests and manual
  integration testing against a running backend — **not** by `test_endpoints.py`. Keep this in mind
  if you're debugging an HMAC issue: the endpoint tests won't catch it.
  `teardown_function` removes the override after each test so it doesn't leak into other test
  modules.

Most tests follow the same shape: seed a location + user(s) via a `_seed_location_and_user()`
helper, build a payload with a small factory function (e.g. `_make_registration(...)`), then call
`client.get/post/put/delete(...)` with an `_headers(user_id)` helper that sets `X-User-Id` — the
same header the Next.js proxy injects in production (see
[Authentication]({{ site.baseurl }}/architecture/authentication/)).

## Running tests

From `backend_fast_api/` (with the virtualenv active and dependencies installed):

```bash
pytest                                                          # run the full suite
pytest tests/test_endpoints.py::test_create_and_get_registration  # run a single test
```

{: .note }
> Per `backend_fast_api/CLAUDE.md`, Claude Code should not run `pytest` itself — give the user the
> command and let them execute it.

There is no separate test database to provision — tests run against whatever database the app
would normally connect to (SQLite `data.db` by default), and `setup_function()` clears it before
each test. Avoid running the test suite against a production `DATABASE_URL`, since it deletes all
rows in every table on every test.
