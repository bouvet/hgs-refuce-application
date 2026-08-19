---
title: Architecture
layout: default
nav_order: 3
has_children: true
---

# Architecture

How the pieces fit together, and who is authoritative for what.

| Page | Covers |
| --- | --- |
| [Overview]({{ site.baseurl }}/architecture/overview/) | The full request-flow diagram (data flow + Better Auth flow) and the system's trust boundaries |
| [Authentication]({{ site.baseurl }}/architecture/authentication/) | Microsoft Entra ID SSO, username/PIN sign-in, the HMAC identity headers, and the three roles |
| [Data model]({{ site.baseurl }}/architecture/data-model/) | The actual Pydantic models behind locations, registrations, and reports, and how quarter-locking works |
| [Decisions]({{ site.baseurl }}/architecture/decisions/) | Why it's built this way — key `DECIDED` entries and open gaps, with rationale |

In short: the backend is the authority on data shape and on roles/location membership. The frontend
calls the backend for all waste registration and report data via
`lib/data/backend-waste-repository.ts`. **Authentication and sessions** live in **Better Auth**
inside Next.js (Postgres-backed) — either Microsoft Entra ID SSO or a username/PIN form that
delegates credential verification to FastAPI. The Next.js proxy at `/api/[...path]` injects an
HMAC-signed identity header on every backend call; the backend never trusts client-supplied
identity.

See [Backend]({{ site.baseurl }}/backend/) and [Frontend]({{ site.baseurl }}/frontend/) for
implementation details on each side, or [Getting Started]({{ site.baseurl }}/getting-started/) to
run it yourself.
