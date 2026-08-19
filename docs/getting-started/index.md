---
title: Getting Started
layout: default
nav_order: 2
has_children: true
---

# Getting Started

Everything you need to get the application running on your own machine.

There are two ways to run it locally:

| Approach | Best for | Page |
| --- | --- | --- |
| **Native** — venv + npm, SQLite | Day-to-day development, fast reloads | [Installation]({{ site.baseurl }}/getting-started/installation/) → [Running locally]({{ site.baseurl }}/getting-started/running-locally/) |
| **Docker Compose** — full stack, two Postgres databases | Reproducing production-like behaviour, testing SSO | [Running with Docker]({{ site.baseurl }}/getting-started/with-docker/) |

Whichever you choose, read [Environment variables]({{ site.baseurl }}/getting-started/environment-variables/) first — the single most common cause of a broken local setup is `BACKEND_SHARED_SECRET` not matching between the backend and the frontend.

## Prerequisites

- **Python 3.11+** — backend
- **Node.js 20+** (24 is what the Docker images and CI use) — frontend
- **Docker Desktop** — only for the Compose workflow
- **PostgreSQL** — only if running Better Auth natively without Docker

## Ports

| Service | Port |
| --- | --- |
| Frontend (Next.js) | 3000 |
| Backend (FastAPI) | 8000 |
| Better Auth Postgres (`auth-db`, Docker) | 5432 |
| Backend Postgres (`data-db`, Docker) | 5433 |
