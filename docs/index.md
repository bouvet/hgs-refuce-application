---
title: Home
layout: home
nav_order: 1
---

# HGS Refuce Application

Documentation for the HGS Refuce Application — a waste/refuse tracking system for a local Bouvet office. Users register waste by type and weight against a location; each quarter is closed off by submitting a report, which locks that quarter against further edits.

The project is a monorepo with two independently deployable parts:

| Part | Stack | Directory |
| --- | --- | --- |
| Backend | Python 3.11, FastAPI, SQLAlchemy (SQLite dev / PostgreSQL prod) | `backend_fast_api/` |
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/UI, Better Auth | `frontend/` |

## Where to start

- **New to the project?** → [Getting Started]({{ site.baseurl }}/getting-started/) — install, run, and sign in locally.
- **Want the big picture?** → [Architecture]({{ site.baseurl }}/architecture/) — how the pieces fit and who is authoritative for what.
- **Working on the API?** → [Backend]({{ site.baseurl }}/backend/) — structure, database, and the generated API reference.
- **Working on the UI?** → [Frontend]({{ site.baseurl }}/frontend/) — routing, auth guards, data layer, styling.
- **Shipping it?** → [Deployment]({{ site.baseurl }}/deployment/) — Docker, Azure, CI/CD.
- **Editing these docs?** → [Contributing]({{ site.baseurl }}/contributing/).

{: .important }
> The backend is the source of truth for data, roles, and location membership. Sessions live in Better Auth inside Next.js. The browser never talks to the backend directly — every call goes through the Next.js proxy at `/api/[...path]`, which injects an HMAC-signed identity header. See [Authentication]({{ site.baseurl }}/architecture/authentication/).
