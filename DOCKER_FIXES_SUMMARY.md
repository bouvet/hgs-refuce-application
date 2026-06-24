# Docker Setup - Fixes Applied

This document summarizes the fixes applied to resolve Docker container startup issues.

## Issue #1: Frontend Build Failure

**Problem**: Frontend Docker build failing with missing environment variables
```
Error: Missing required environment variable: BETTER_AUTH_SECRET
Error: Missing required environment variable: MICROSOFT_CLIENT_ID
```

**Root Cause**: Next.js server-side code requires environment variables during the build phase.

**Solution**:
1. Updated `frontend/Dockerfile` to accept build-time arguments
2. Updated `docker-compose.yml` to pass build arguments with defaults
3. Used values from `frontend/.env.local` for Microsoft credentials

**Files Modified**:
- `frontend/Dockerfile` — Added ARG statements and ENV setup
- `docker-compose.yml` — Added build.args section to frontend service

**Status**: ✅ Fixed

---

## Issue #2: Backend Database Schema Migration Error

**Problem**: Backend crash on startup with PostgreSQL transaction error
```
ERROR: column "preferred_location_id" of relation "users" already exists
ERROR: current transaction is aborted, commands ignored until end of transaction block
```

**Root Cause**: 
1. The SQL init script was creating the `users` table WITH `preferred_location_id` column
2. The backend code was also trying to add the same column via migration
3. PostgreSQL transaction state becomes "aborted" after an error, preventing subsequent statements

**Solution**:
1. **Updated `scripts/init-data-db.sql`**: Removed `preferred_location_id` from initial CREATE TABLE
2. **Updated `backend_fast_api/src/hgs_refuce_app/storage.py`**: 
   - Split schema initialization into separate transactions (one per statement)
   - Used separate database connections for migration and index creation
   - Proper error handling to avoid "transaction aborted" state

**Schema Migration Logic**:
- Initial CREATE TABLE creates basic schema without `preferred_location_id`
- Migration step adds the column in a separate transaction
- This works for both fresh databases and existing databases (graceful failure if column exists)

**Files Modified**:
- `scripts/init-data-db.sql` — Removed duplicate column from CREATE TABLE
- `backend_fast_api/src/hgs_refuce_app/storage.py` — Fixed transaction handling

**Status**: ✅ Fixed

---

## Verification

After applying these fixes, all services start successfully:

```bash
docker-compose up -d
docker-compose ps
```

Expected output:
```
NAME                 SERVICE    STATUS           PORTS
hgs-refuce-auth-db   auth-db    Up (healthy)    0.0.0.0:5432->5432/tcp
hgs-refuce-data-db   data-db    Up (healthy)    0.0.0.0:5433->5432/tcp
hgs-refuce-backend   backend    Up (healthy)    0.0.0.0:8000->8000/tcp
hgs-refuce-frontend  frontend   Up              0.0.0.0:3000->3000/tcp
```

---

## How to Use

### Fresh Start
```bash
# Clean up old containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait 15-20 seconds for services to be healthy
docker-compose ps
```

### Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Demo Login
- **Username**: sadmin
- **PIN**: sadmin

---

## Technical Details

### PostgreSQL Transaction Handling
PostgreSQL requires explicit transaction management. When an error occurs within a transaction:
1. The transaction state becomes "aborted"
2. All subsequent statements fail with "current transaction is aborted"
3. Must either commit/rollback or use a new connection

**Solution**: Use a fresh connection for each CREATE/ALTER statement to avoid transaction state pollution.

### Database Schema Migration Pattern
```python
# Old pattern (broken with PostgreSQL):
with engine.connect() as conn:
    conn.execute("CREATE TABLE users ...")
    try:
        conn.execute("ALTER TABLE users ADD COLUMN ...")  # Fails if column exists
    except Exception:
        pass  # Transaction is now aborted, subsequent statements fail

# New pattern (works with PostgreSQL):
with engine.connect() as conn:
    conn.execute("CREATE TABLE users ...")
    conn.commit()  # Commit before next statement

try:
    with engine.connect() as migration_conn:  # Fresh connection
        migration_conn.execute("ALTER TABLE users ADD COLUMN ...")
        migration_conn.commit()
except Exception:
    pass  # Clean failure, no transaction state pollution
```

---

## Files Changed

| File | Changes |
|------|---------|
| `docker-compose.yml` | Added build.args section for frontend |
| `frontend/Dockerfile` | Added build-time arguments |
| `scripts/init-data-db.sql` | Removed duplicate preferred_location_id column |
| `backend_fast_api/src/hgs_refuce_app/storage.py` | Fixed transaction handling |

---

## Testing Checklist

- ✅ Frontend builds successfully
- ✅ Backend starts without errors
- ✅ Database migrations run successfully
- ✅ Demo data is seeded
- ✅ API is accessible (http://localhost:8000)
- ✅ Frontend is accessible (http://localhost:3000)
- ✅ Health checks pass for all services

---

## Production Notes

These fixes maintain backward compatibility and work with both SQLite (dev) and PostgreSQL (prod).

The transaction handling improvements make the code more robust for concurrent operations in production.

---

**Status**: All fixes applied and tested ✅  
**Date**: 2026-06-24  
**Ready for deployment**: Yes
