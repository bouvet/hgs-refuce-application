---
domain: backend-api
related: [database-layer, auth-rbac, data-repository]
---

# Backend API — Mental Model

## main.py

- OWNS: FastAPI application instance, route definitions, CORS configuration
- OWNS: root endpoint `/` and health check behavior
- READS FROM: environment variables (BACKEND_CORS_ORIGINS, ADMIN_SECRET)
- WRITES TO: HTTP responses, database via storage layer
- INVARIANT: CORS origins default to `http://localhost:3000` if env var not set
- INVARIANT: ADMIN_SECRET header required for `/admin/*` endpoints
- FLOW[auth]: POST /auth/login → parse User credentials → query database → return token/user info
- FLOW[registration]: GET/POST /locations/{id}/registrations → validate location ownership → read/write WasteRegistration records
- FLOW[reporting]: POST /locations/{id}/reports → lock quarter → prevent future edits → return Report
- TENSION: CORS string parsing is simple (`split(',')`), will break on whitespace; consider URL validation
- DECIDED: Single FastAPI app rather than blueprint-based modularization to keep routes simple and co-located with logic

## auth endpoints

- OWNS: POST /auth/login endpoint
- READS FROM: request body (email, password)
- WRITES TO: returns User object with id, email, role
- INVARIANT: role is one of `admin` or `common`
- DECIDED: no token generation; frontend stores user state in localStorage (see UserProvider)

## location endpoints

- OWNS: GET/POST /locations (list/create)
- OWNS: GET/POST /locations/{id}/users (admin user management per location)
- READS FROM: user context (authenticated via login endpoint)
- WRITES TO: Location records in database
- INVARIANT: only super-admin can create locations (checked via user.role)
- INVARIANT: users can only see locations they are assigned to (verified in storage layer)

## registration endpoints

- OWNS: GET/POST/PUT/DELETE /locations/{id}/registrations/{id}
- READS FROM: WasteRegistration data (type, kg, notes, date)
- WRITES TO: WasteRegistration records, prevents edits after report locked
- INVARIANT: registration quarter must not exceed currently-locked quarter
- FLOW: GET registrations → filter by location+quarter → return sorted by date
- FLOW: POST registration → validate quarter not locked → insert into database
- FLOW: PUT registration → validate not locked → update existing record
- FLOW: DELETE registration → validate not locked → soft-delete (or hard delete, verify in models.py)
- TENSION: quarter locking checked at write time; concurrent reads of unlocked + write lock can race

## report endpoints

- OWNS: GET/POST /locations/{id}/reports (list/submit)
- OWNS: GET/DELETE /locations/{id}/reports/{period} (retrieve/unlock)
- READS FROM: Report submission body (quarter string YYYY-Qn)
- WRITES TO: Report records, locked status
- INVARIANT: POST locks the quarter; subsequent POSTs to same period fail
- INVARIANT: DELETE unlocks (soft-delete or full delete; verify in storage)
- FLOW[submit]: POST /locations/{id}/reports → validate quarter → insert Report with locked=true
- FLOW[retrieve]: GET /locations/{id}/reports/{period} → return Report details
- FLOW[unlock]: DELETE /locations/{id}/reports/{period} → set locked=false (or delete row)
- TENSION: deleting a report re-opens a quarter; no audit trail by default

## admin endpoints

- OWNS: GET/POST/DELETE /admin/locations, /admin/users (developer-only)
- READS FROM: ADMIN_SECRET header
- WRITES TO: Location and User records (developer overrides)
- INVARIANT: ADMIN_SECRET must match env var exactly; no hashing
- DECIDED: admin endpoints exist for local testing; never expose in production
