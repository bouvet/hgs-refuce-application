---
layout: default
parent: Getting Started
title: Installation
nav_order: 1
---

# Installation

Steps to get the two sub-projects installed on your machine. This page only covers installing
dependencies — see [Running locally]({{ site.baseurl }}/getting-started/running-locally/) or
[Running with Docker]({{ site.baseurl }}/getting-started/with-docker/) for actually starting the
app.

## Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Python | 3.11+ | Backend (`backend_fast_api/`) |
| Node.js | 20+ (24 is what Docker images and CI use) | Frontend (`frontend/`) |
| Docker Desktop | any recent version | Only the Compose workflow |
| PostgreSQL | any recent version | Only if you run Better Auth natively without Docker |

## 1. Clone the repository

```bash
git clone https://github.com/bouvet/hgs-refuce-application.git
cd hgs-refuce-application
```

## 2. Backend: create a virtual environment and install dependencies

All backend commands run from `backend_fast_api/`.

```bash
python -m venv backend_fast_api/.venv

# Windows
backend_fast_api\.venv\Scripts\activate

# bash / WSL / macOS / Linux
source backend_fast_api/.venv/bin/activate

pip install -r backend_fast_api/requirements.txt
```

This installs FastAPI, SQLAlchemy, Uvicorn, `psycopg2-binary` (for PostgreSQL), `PyJWT`, and the
rest of the pinned versions in `backend_fast_api/requirements.txt`. No database migration step is
needed for SQLite — tables are created automatically from `models.py` on first run.

## 3. Frontend: install npm dependencies

```bash
cd frontend
npm install
```

## 4. Frontend: create your local env file

Copy the example file and fill in values (see
[Environment variables]({{ site.baseurl }}/getting-started/environment-variables/) for what each
one means):

```bash
cp frontend/example.env.local.example frontend/.env.local
```

At minimum, for the app to boot, `frontend/.env.local` needs `BETTER_AUTH_SECRET` and an
`AUTH_DATABASE_URL` pointing at a reachable PostgreSQL database — Better Auth uses the `pg` driver
directly and does not support SQLite, so **Postgres is required even for native (non-Docker) frontend
development**. The example file includes a one-line `docker run` command to start a throwaway
Postgres container for this purpose.

## 5. One-time Better Auth migration

Once `AUTH_DATABASE_URL` points at a running Postgres instance, create Better Auth's tables:

```bash
cd frontend
npx @better-auth/cli@latest migrate
```

Re-run this command whenever `lib/auth.ts` adds new `additionalFields` or a plugin with its own
schema (the PIN plugin's `backendUserId` field, for example, already requires it).

## Next steps

- [Running locally]({{ site.baseurl }}/getting-started/running-locally/) — start backend and frontend natively.
- [Running with Docker]({{ site.baseurl }}/getting-started/with-docker/) — start the full stack, including both Postgres databases, in containers.
