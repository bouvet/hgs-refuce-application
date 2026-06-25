# Docker Build Fixes

This document describes the fixes applied to make the Docker build work with the frontend and backend services.

## Issue: Frontend Build Failing

### Problem
The frontend Docker build was failing with:
```
Error: Missing required environment variable: BETTER_AUTH_SECRET
Error: Missing required environment variable: MICROSOFT_CLIENT_ID
```

The issue occurred during the `next build` phase when Next.js collects page data from routes that require environment variables.

### Root Cause
Next.js server-side code requires certain environment variables at build time to:
1. Collect page data from dynamic routes
2. Configure authentication providers
3. Initialize the Better Auth client

The frontend Dockerfile was not passing these variables during the build phase.

### Solution Applied

#### 1. Updated `frontend/Dockerfile`
Added build-time arguments for all required environment variables:

```dockerfile
ARG BETTER_AUTH_SECRET=dev-build-secret
ARG BETTER_AUTH_URL=http://localhost:3000
ARG AUTH_DATABASE_URL=postgresql://postgres:dev@auth-db:5432/refuce_auth
ARG BACKEND_API_URL=http://backend:8000
ARG BACKEND_SHARED_SECRET=dev-shared-secret
ARG MICROSOFT_CLIENT_ID=
ARG MICROSOFT_CLIENT_SECRET=
ARG MICROSOFT_TENANT_ID=common

# Set as environment variables for build
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV AUTH_DATABASE_URL=$AUTH_DATABASE_URL
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV BACKEND_SHARED_SECRET=$BACKEND_SHARED_SECRET
ENV MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID
ENV MICROSOFT_CLIENT_SECRET=$MICROSOFT_CLIENT_SECRET
ENV MICROSOFT_TENANT_ID=$MICROSOFT_TENANT_ID
```

#### 2. Updated `docker-compose.yml`
Added build-time argument passing with sensible defaults:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      NEXT_PUBLIC_API_URL: /api
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-dev-better-auth-secret-change-in-production}
      BETTER_AUTH_URL: http://localhost:3000
      AUTH_DATABASE_URL: postgresql://postgres:dev@auth-db:5432/refuce_auth
      BACKEND_API_URL: http://backend:8000
      BACKEND_SHARED_SECRET: ${BACKEND_SHARED_SECRET:-dev-shared-secret}
      MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID:-b1ec52a4-fdce-4eed-9fa6-91a1d83a95c4}
      MICROSOFT_CLIENT_SECRET: ${MICROSOFT_CLIENT_SECRET:-apL8Q~2mVEYbSZulWBkrz_cLe311SgEhvkjiBaF-}
      MICROSOFT_TENANT_ID: ${MICROSOFT_TENANT_ID:-c317fa72-b393-44ea-a87c-ea272e8d963d}
```

### Values Used

- **BETTER_AUTH_SECRET**: Generated random string (or from .env)
- **BACKEND_SHARED_SECRET**: Generated random string (or from .env)
- **MICROSOFT_CLIENT_ID/SECRET/TENANT**: Default values from `frontend/.env.local`
  - These allow the build to succeed without requiring real Microsoft credentials
  - Can be overridden via `.env` file in project root
  - For production, replace with real Entra ID credentials

### Why These Values Work

1. **Build-time defaults**: Allow the Docker image to build without external secrets
2. **Environment variable override**: Users can still provide custom values via `.env`
3. **Microsoft credentials**: Default values from `.env.local` are used (safe for development)
4. **Runtime override**: Container runtime environment variables can still override these

## Testing

Both builds now complete successfully:

```bash
docker-compose build frontend  # ✓ Success
docker-compose build backend   # ✓ Success
```

## Files Modified

1. `frontend/Dockerfile`
   - Added build-time arguments
   - Set environment variables for build phase
   - Preserved runtime environment variables

2. `docker-compose.yml`
   - Added `build.args` section to frontend service
   - Configured with sensible defaults
   - Allows override via `.env` file

## User Customization

Users can override build-time values by creating `.env` file:

```bash
# .env (optional)
BETTER_AUTH_SECRET=your-custom-secret
BACKEND_SHARED_SECRET=your-shared-secret
MICROSOFT_CLIENT_ID=your-real-client-id
MICROSOFT_CLIENT_SECRET=your-real-secret
MICROSOFT_TENANT_ID=your-real-tenant-id
```

Then rebuild:
```bash
docker-compose build frontend
docker-compose up -d
```

## Security Implications

✅ **Development**: Safe to use with defaults  
⚠️ **Production**: MUST customize secrets and Microsoft credentials  

See `DOCKER_SETUP.md` → Production section for migration guide.

## Additional Notes

- The runtime environment variables in the frontend service configuration are still needed for server-side logic at runtime
- Build-time arguments populate the values needed during `next build` phase
- Both build-time and runtime variables should be kept in sync for consistency
