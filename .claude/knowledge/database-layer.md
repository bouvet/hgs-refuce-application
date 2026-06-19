---
domain: database-layer
related: [backend-api, auth-rbac]
---

# Database Layer — Mental Model

## DatabaseConnection

- OWNS: SQLAlchemy engine initialization, session management
- OWNS: SQLite dev connection vs PostgreSQL prod connection
- READS FROM: environment variable DATABASE_URL (or defaults to `sqlite:///db.sqlite`)
- WRITES TO: creates tables via `Base.metadata.create_all()`
- INVARIANT: SQLite used locally; PostgreSQL used in production
- INVARIANT: all schema defined in models.py; apply_migrations() not called
- DECIDED: SQLite for local dev with simple db reset between tests; PostgreSQL mirrored schema in prod

## UserStorage

- OWNS: User record CRUD operations
- OWNS: user lookups by email
- READS FROM: database via SQLAlchemy ORM
- WRITES TO: creates/updates User records
- INVARIANT: email is unique (check in schema; no duplicate check in code?)
- INVARIANT: role is `admin` or `common`
- INVARIANT: password stored as plaintext (SECURITY: confirm if hashing exists, see models.py)
- FLOW[create_user]: insert User with email, password, role
- FLOW[get_by_email]: query User WHERE email == X
- TENSION: password not hashed; only safe for dev/internal use with trusted team

## DataStorage

- OWNS: WasteRegistration, Report, Location CRUD
- OWNS: query filtering by location, quarter, user permissions
- READS FROM: database via SQLAlchemy ORM
- WRITES TO: creates/updates WasteRegistration, Report, Location records
- INVARIANT: registrations tied to location; users can only see assigned locations
- INVARIANT: reports are locked per location+quarter; locked quarters reject new registrations
- FLOW[list_registrations]: filter by location → quarter (optional) → sort by date → return list
- FLOW[create_registration]: validate quarter not locked → insert WasteRegistration
- FLOW[lock_quarter]: POST report → set Report.locked=true for that quarter
- FLOW[unlock_quarter]: DELETE report → set Report.locked=false (verify deletion vs update behavior)
- TENSION: quarter locking enforced at write time only; no pre-check prevents race conditions

## Models (Pydantic + SQLAlchemy)

- OWNS: User, Location, WasteRegistration, Report, Membership (schemas + ORM)
- OWNS: field definitions (required vs optional, default values)
- OWNS: relationships (User.locations, Location.registrations, Location.reports)
- INVARIANT: WasteRegistration has type (waste category), kg (amount), date, notes
- INVARIANT: Report has period (YYYY-Qn), location_id, locked boolean
- INVARIANT: User has email, password, role; Location has name, address, users (many-to-many)
- TENSION: both Pydantic (request/response) and SQLAlchemy (ORM) models exist; duplication risk on schema changes

## Database queries

- OWNS: no query builder abstraction; SQLAlchemy ORM used directly in storage.py
- READS FROM: models.py schema definitions
- INVARIANT: test db reset via `Base.metadata.drop_all()` + `create_all()` in setup_function()
- DECIDED: no query logging or tracing; add debug output to main.py if needed
