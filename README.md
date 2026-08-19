# HGS Refuce Application

A waste/refuse tracking system for a local Bouvet office. Users register waste by type and weight
against a location; each quarter is closed off by submitting a report, which locks that quarter
against further edits.

**📖 Full documentation: https://bouvet.github.io/hgs-refuce-application/**

## Sub-projects

| Part | Stack | Directory |
| --- | --- | --- |
| Backend | Python 3.11, FastAPI, SQLAlchemy (SQLite dev / PostgreSQL prod) | `backend_fast_api/` |
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/UI, Better Auth | `frontend/` |

## Quickstart

One-time setup:

```bash
python -m venv backend_fast_api/.venv
# Windows:
backend_fast_api\.venv\Scripts\activate
# bash/WSL:
source backend_fast_api/.venv/bin/activate

pip install -r backend_fast_api/requirements.txt
cd frontend && npm install && cd ..
```

There is no combined start script — run each service in its own terminal:

```bash
cd backend_fast_api && uvicorn hgs_refuce_app.main:app --reload --port 8000
cd frontend && npm run dev
```

See [Running locally](https://bouvet.github.io/hgs-refuce-application/getting-started/running-locally/)
for required environment variables and more detail.

For the full walkthrough — installation, running locally, Docker Compose, environment variables,
architecture, deployment — see **[the documentation site](https://bouvet.github.io/hgs-refuce-application/)**.
