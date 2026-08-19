---
title: CI/CD
layout: default
parent: Deployment
nav_order: 4
---

# CI/CD

Two independent GitHub Actions workflows deploy the backend and frontend to Azure Web Apps.
Documentation publishing (this site) is a third, separate mechanism with no workflow file at all.

## Backend — `.github/workflows/main_hgs-refuce-backend.yml`

Triggers on push to `main` (and manual `workflow_dispatch`). Runs on `ubuntu-latest`:

1. Checkout, set up Python 3.11.
2. `pip install -r requirements.txt` from `backend_fast_api/`.
3. Upload `backend_fast_api/` as a build artifact.
4. Download the artifact and deploy it with `azure/webapps-deploy@v3` to the Azure Web App
   **`hgs-refuce-backend`**, slot `Production`.

Authentication to Azure uses the `AZUREAPPSERVICE_PUBLISHPROFILE_BACKEND` repository secret. There is
no test step in this workflow — `pytest` is not run in CI (see the {: .warning } note below).

## Frontend — `.github/workflows/main_wasteflow.yml`

Triggers on push to `main` (and manual `workflow_dispatch`). Runs on `ubuntu-latest`:

1. Checkout, set up Node.js 24.
2. `npm install && npm run build` in `frontend/`, with `NEXT_PUBLIC_API_URL` set from the
   `FRONTEND_URL` repository secret at build time.
3. Copy `public/` and `.next/static` into the Next.js standalone output (required because
   `output: "standalone"` doesn't bundle these by default).
4. Zip the standalone output and upload it as a build artifact.
5. Download the artifact and deploy it with `azure/webapps-deploy@v3` to the Azure Web App
   **`WasteFlow`**, slot `Production`.

Authentication to Azure uses the `AZUREAPPSERVICE_PUBLISHPROFILE_9D0A9F967409423A9F95E86A5CF19583`
repository secret.

{: .warning }
> Neither workflow runs the test suite or lint before deploying. `npm run lint` and `pytest` are
> manual/local gates only — see [Testing]({{ site.baseurl }}/backend/testing/) and the frontend
> `npm run lint` command.

## GitHub Pages (this site)

Pages is configured with **source: "Deploy from a branch"** (Settings → Pages → Build and
deployment), branch `main`, folder `/docs`. This is GitHub's own Jekyll build — there is
deliberately **no workflow file** for it. Every push to `main` that touches `docs/` triggers the
implicit `pages-build-deployment` run visible on the Actions tab.

{: .important }
> The site only rebuilds from `main`. Changes made on a feature branch (including this one) do not
> appear at [bouvet.github.io/hgs-refuce-application](https://bouvet.github.io/hgs-refuce-application/)
> until that branch is merged.

See [`docs/README.md`]({{ site.baseurl }}/) in the repo root for the one-time Pages setup and local
preview instructions, and [Contributing]({{ site.baseurl }}/contributing/) for how to add a page.
