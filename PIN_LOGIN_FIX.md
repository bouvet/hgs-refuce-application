# PIN Login - Issue Fixed

## Problem

PIN login was failing with error: "Invalid username or PIN" even though demo users existed in the backend database.

## Root Cause

Better Auth requires its own PostgreSQL tables to function. The PIN login flow works like this:

1. User enters username + PIN on login form
2. Frontend calls `/api/auth/sign-in/pin` (Better Auth endpoint)
3. Better Auth calls backend `/auth/login` with the credentials
4. Backend authenticates and returns user data
5. Better Auth creates a session in the `auth-db` (user, session tables)

**The issue**: The `auth-db` had no tables! Better Auth couldn't create users or sessions.

## Solution Applied

Created Better Auth database schema in `auth-db` with the required tables:
- `user` — Stores authenticated users
- `session` — Stores session tokens
- `account` — Stores OAuth/credential accounts
- `verification` — Stores verification codes

### Files Created

1. **scripts/init-better-auth-schema.sql**
   - Complete Better Auth schema definition
   - Automatically run on `auth-db` container startup

2. **scripts/init-better-auth.js**
   - Node.js script to initialize the database (reference)

### Files Modified

1. **docker-compose.yml**
   - Updated `auth-db` volume to use the new schema script
   - Now automatically initializes tables on first run

## How It Works Now

### Fresh Start
```bash
docker-compose down -v
docker-compose up -d
```

The containers automatically:
1. Create application data in `data-db`
2. Create Better Auth tables in `auth-db`
3. Seed demo users in backend

### PIN Login Flow
```
User enters:  sadmin / sadmin

Frontend → /api/auth/sign-in/pin
  ├─ Better Auth verifies HMAC signature
  ├─ Calls Backend → /auth/login { username, password }
  ├─ Backend returns: { id: "sadmin", isAdmin: true, ... }
  ├─ Better Auth creates user in auth-db
  └─ Creates session with token
  
Response: {
  "token": "...",
  "user": {
    "id": "...",
    "email": "sadmin@pin.local",
    "name": "sadmin"
  }
}
```

## Demo Users

All these credentials now work:

| Username | PIN | Role |
|----------|-----|------|
| sadmin | sadmin | Super Admin |
| admin | admin | Admin |
| common | common | User |
| user1 | 234 | User |

## Verification

Test PIN login:
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/pin \
  -H "Content-Type: application/json" \
  -d '{"username": "sadmin", "pin": "sadmin"}'
```

Expected response:
```json
{
  "token": "...",
  "user": {
    "id": "...",
    "email": "sadmin@pin.local",
    "name": "sadmin"
  }
}
```

## Technical Details

### Better Auth Tables

**user table**
- Stores unique users
- `backendUserId` links to backend user (sadmin)
- `emailVerified = true` for PIN-logged-in users

**session table**
- Stores active sessions
- `token` is the session identifier
- `userId` references the user

**account table**
- Stores provider credentials (future use)
- Empty for PIN authentication

**verification table**
- Stores verification codes
- Empty unless email verification is enabled

### How PIN Login Authenticates

1. **PIN Plugin** (frontend/lib/auth-plugins/pin-credentials.ts)
   - Receives { username, pin } from login form
   - Calls backend /auth/login with HMAC signature
   - Backend validates plaintext password match
   - Returns backend user { id, isAdmin, isSuperAdmin }

2. **Better Auth Session Creation**
   - Finds or creates user in Better Auth
   - Links `backendUserId` for future authorization
   - Creates session with token
   - Sets session cookie

3. **Session Validation**
   - Future requests use session token
   - Backend authorization happens separately (via /currentUser)
   - Backend fetches live role/location data on each request

## Production Notes

For production:
1. Use real password hashing (not plaintext)
2. Remove demo users
3. Migrate to real SSO (Microsoft/Google)
4. Use strong database credentials
5. Enable SSL/TLS for database connections

See `DOCKER_SETUP.md` → Production section for migration guide.

---

**Status**: ✅ PIN Login Working  
**Date**: 2026-06-24  
**Tested**: All demo credentials verified
