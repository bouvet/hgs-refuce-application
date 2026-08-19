---
name: update-api-reference
description: Regenerate the backend API reference (docs/backend/api-reference.md, openapi.json, api-explorer.html) from the live FastAPI schema. Use when routes in backend_fast_api/src/hgs_refuce_app/main.py were added, removed, or changed, or before a release.
---

# Update API Reference

The API reference is generated, never hand-maintained (per `.claude/knowledge/build-deploy.md`
DECIDED entry) — this skill is the only supported way to update it.

## Steps

1. **Activate the backend virtualenv.**

   ```bash
   # Windows
   backend_fast_api\.venv\Scripts\activate
   # bash/WSL
   source backend_fast_api/.venv/bin/activate
   ```

2. **Run the generator** from the repo root:

   ```bash
   python scripts/gen_openapi_docs.py
   ```

   It imports `hgs_refuce_app.main.app` with `DATABASE_URL=sqlite:///:memory:` so it never touches
   a developer's real `backend_fast_api/data.db`, then writes `docs/backend/openapi.json`,
   `docs/backend/api-reference.md`, and `docs/backend/api-explorer.html`. Safe to re-run — it's
   idempotent and only ever overwrites those three files.

3. **Diff the generated files** (`git diff docs/backend/`) against the previous committed version.

4. **Summarize the change**: which routes were added, removed, or had a summary/path/method change.
   Compare route counts and the per-group tables in `api-reference.md`.

5. **Flag prose pages that reference a changed endpoint** — grep `docs/**/*.md` (excluding the
   generated files themselves) for the old path or method. Common places: `docs/architecture/*.md`,
   `docs/backend/project-structure.md`, `docs/frontend/data-layer.md`, `docs/frontend/auth.md`,
   root `CLAUDE.md`. Hand those off to the `write-docs` skill rather than editing them here — this
   skill only regenerates the derived files.

6. **Run `pytest`** in `backend_fast_api/` to confirm the route change didn't break anything the
   generator's import silently depends on.
