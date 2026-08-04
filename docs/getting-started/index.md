---
title: Getting Started
layout: default
nav_order: 2
has_children: true
---

# Getting Started

## Prerequisites

- Python 3.11+ (backend)
- Node.js 20+ (frontend)

## One-time setup

```bash
python -m venv backend_fast_api/.venv

# Windows
backend_fast_api\.venv\Scripts\activate

# bash / WSL
source backend_fast_api/.venv/bin/activate

pip install -r backend_fast_api/requirements.txt
```

## Running both services

Three scripts at the repo root start the backend and frontend together. All require the `.venv` above.

| Script      | Platform             |
| ----------- | --------------------- |
| `start.bat` | Windows (cmd)          |
| `start.ps1` | Windows (PowerShell)  |
| `start.sh`  | bash / WSL             |

## Running services individually

### Backend

```bash
cd backend_fast_api
pip install -r requirements.txt
uvicorn hgs_refuce_app.main:app --reload   # dev server, http://localhost:8000
pytest                                      # all tests
```

### Frontend

```bash
cd frontend
npm run dev     # dev server, http://localhost:3000 (Turbopack)
npm run build   # production build
npm run lint    # ESLint
```
