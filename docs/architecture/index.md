---
title: Architecture
layout: default
nav_order: 3
has_children: true
---

# Architecture

## Overall data flow

```
user → frontend → backend → SQLite (dev) / PostgreSQL (prod)
```

The backend is the authority on data shape and on roles/location membership. The frontend calls
the backend for all waste registration and report data via `lib/data/backend-waste-repository.ts`.

**Authentication and sessions** live in **Better Auth** inside Next.js (Postgres-backed) — either
Microsoft Entra ID SSO or a username/PIN form that delegates credential verification to FastAPI.
The Next.js proxy at `/api/[...path]` injects an HMAC-signed identity header on every backend call;
the backend never trusts client-supplied identity.

See [Backend](../backend/) and [Frontend](../frontend/) for details on each side.
