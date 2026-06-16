# Deployment Guide: FastAPI Backend to Azure App Service

Your project structure:
```
hgs-refuce-application/              (repo root)
└── backend_fast_api/
    ├── requirements.txt              ← Azure needs this path
    └── src/
        └── hgs_refuce_app/
            └── main.py               ← FastAPI app here
```

**CRITICAL:** The backend is in a subfolder, not the repo root. This requires special handling in Azure.

---

## **PHASE 1: Create Azure Resources**

### **Step 1: Create Resource Group**
**Explanation:** A container for all your Azure resources (App Service, database, etc.)

**Action — Azure Portal or CLI:**
```bash
az group create \
  --name hgs-refuce-rg \
  --location northeurope
```

**Expected result:** Resource group created in north Europe.

---

### **Step 2: Create App Service Plan (Linux)**
**Explanation:** Defines the server that will run your app (Linux OS, specific SKU for pricing/power).

**Action:**
```bash
az appservice plan create \
  --name hgs-refuce-plan \
  --resource-group hgs-refuce-rg \
  --sku B1 \
  --is-linux
```

**Expected result:** App Service Plan created. (SKU `B1` = Basic, single instance. Adjust to `B2` or higher for production.)

---

### **Step 3: Create Web App**
**Explanation:** The actual application instance that will run FastAPI.

**Action:**
```bash
az webapp create \
  --name hgs-refuce-backend \
  --resource-group hgs-refuce-rg \
  --plan hgs-refuce-plan \
  --runtime "PYTHON:3.11"
```

**Expected result:** Web App created with Python 3.11 runtime.

---

## **PHASE 2: Configure Deployment from GitHub (The Critical Part)**

Azure's default build process assumes your Python app is at the **repo root**. Yours is in `backend_fast_api/`. You need to override this.

### **Step 4: Create GitHub Actions Workflow**
**Explanation:** This automates the build and deploy process, and **crucially sets the working directory** to `backend_fast_api/`.

**Action:**
1. In your GitHub repo, create `.github/workflows/deploy-backend.yml`:

```bash
mkdir -p .github/workflows
```

2. Create the file with this content:

```yaml
name: Deploy Backend to Azure

on:
  push:
    branches:
      - main
    paths:
      - 'backend_fast_api/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies (from backend folder)
        working-directory: ./backend_fast_api
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: python-app
          path: |
            backend_fast_api/

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: hgs-refuce-backend
          package: backend_fast_api/
          startup-file: 'startup.sh'
```

**Expected result:** Workflow file created. This workflow will:
- Trigger on pushes to `main` that touch `backend_fast_api/`
- Install dependencies from the correct folder
- Deploy only the `backend_fast_api/` folder to Azure
- Run a startup script (created next)

---

### **Step 5: Create Startup Script**
**Explanation:** Azure needs a shell script that starts your FastAPI app **from the correct directory** using gunicorn.

**Action:**
Create `backend_fast_api/startup.sh`:

```bash
#!/bin/bash

# Set working directory to the backend folder
cd /home/site/wwwroot

# Run gunicorn with the correct module path
gunicorn hgs_refuce_app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

**Make it executable:**
```bash
chmod +x backend_fast_api/startup.sh
```

**Expected result:** Script created and executable. When Azure starts the app, it runs this script.

**Why this works:**
- `cd /home/site/wwwroot` — Azure deploys your code to this directory on the Linux server
- `gunicorn hgs_refuce_app.main:app` — Starts the FastAPI app (module path matches your `src/hgs_refuce_app/main.py` structure)
- `--worker-class uvicorn.workers.UvicornWorker` — Uses Uvicorn workers (required for async FastAPI)
- `--bind 0.0.0.0:8000` — Listens on port 8000 (Azure maps this to the app)

---

## **PHASE 3: Configure App Settings (Environment Variables)**

### **Step 6: Set Environment Variables on Azure**

**Explanation:** Azure reads env vars from **Application settings** and injects them into your running app.

**Action — Azure Portal:**
1. Go to: **Azure Portal → hgs-refuce-backend → Settings → Configuration**
2. Click **New application setting** and add these:

| Name | Value | Notes |
|------|-------|-------|
| `APP_ENV` | `production` | Tells your backend to use PostgreSQL (not SQLite) and adjust logging |
| `DATABASE_URL` | `postgresql://username:PASSWORD@wasteflow-backend-server.postgres.database.azure.com:5432/wasteflow` | Your existing PostgreSQL connection string. Replace `username` and `PASSWORD`. |
| `BACKEND_CORS_ORIGINS` | `https://hgs-refuce-frontend.azurewebsites.net` | Your frontend URL (add later once frontend is deployed) |
| `ADMIN_SECRET` | (generate a random string, e.g., `openssl rand -hex 32`) | Used for admin endpoints |
| `PYTHONPATH` | `/home/site/wwwroot` | Ensures Python can find your modules |

**For DATABASE_URL format:**
```
postgresql://username:password@hostname:5432/database_name
```

Example:
```
postgresql://sktxengsxj:MySecurePassword123@wasteflow-backend-server.postgres.database.azure.com:5432/wasteflow
```

**Expected result:** All variables visible in the Configuration tab.

---

### **Step 7: Create PostgreSQL Database**
**Explanation:** Your app needs the database to exist. Tables are created automatically on first startup, but you must create the database itself.

**Action — Run locally or from any psql client:**
```bash
psql -h wasteflow-backend-server.postgres.database.azure.com \
  -U sktxengsxj \
  -d postgres \
  -c "CREATE DATABASE wasteflow;"
```

When prompted, enter the PostgreSQL password.

**Expected result:** Database `wasteflow` created on your Azure PostgreSQL server.

---

## **PHASE 4: Deploy**

### **Step 8: Commit and Push to GitHub**

**Explanation:** Push your workflow file and startup script. GitHub Actions will automatically build and deploy to Azure.

**Action:**
```bash
cd /mnt/c/Users/inge.halvorsen/development/Internal/hgs-refuce-application

git add .github/workflows/deploy-backend.yml backend_fast_api/startup.sh
git commit -m "Add GitHub Actions deployment workflow for FastAPI backend"
git push origin main
```

**Expected result:**
- Files committed and pushed
- GitHub Actions workflow automatically triggered
- You see progress in **GitHub → your repo → Actions tab**

---

### **Step 9: Monitor Deployment**

**Action — GitHub Actions:**
1. Go to **GitHub → hgs-refuce-application → Actions**
2. Watch the **Deploy Backend to Azure** workflow
3. Once it says ✅ **Passed**, deployment is complete

**Action — Azure Portal (Check Logs):**
1. Go to **Azure Portal → hgs-refuce-backend → Monitoring → Log stream**
2. You should see app startup logs in real-time
3. Look for `Application startup complete` — this means FastAPI started successfully

---

## **PHASE 5: Verify Deployment**

### **Step 10: Check if FastAPI is Running**

**Action:**
Get your app URL and test it:

```bash
# Get the URL (or find in Azure Portal)
APP_URL="https://hgs-refuce-backend.azurewebsites.net"

# Test the FastAPI health endpoint
curl -v https://hgs-refuce-backend.azurewebsites.net/docs

# Or test a real endpoint (adjust to your endpoints)
curl -v https://hgs-refuce-backend.azurewebsites.net/registrations
```

**Expected result:**
- **Status 200** → FastAPI is running
- **Status 404** → App is up but endpoint doesn't exist (check your endpoint names)
- **Status 502/503** → App failed to start (check logs in Step 9)

---

### **Step 11: Check Logs for Errors**

**If the app fails to start:**

**Action — Azure Portal:**
1. Go to **hgs-refuce-backend → Monitoring → Log stream**
2. Look for errors in the startup output
3. **Common issues:**

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError: No module named 'hgs_refuce_app'` | PYTHONPATH not set or working directory wrong | Verify `PYTHONPATH=/home/site/wwwroot` is set in Application settings |
| `No such file or directory: requirements.txt` | Azure didn't deploy from `backend_fast_api/` | Verify GitHub Actions deployed the correct folder |
| `psycopg2 error / connection refused` | DATABASE_URL is wrong or PostgreSQL server is unreachable | Test DATABASE_URL locally; verify PostgreSQL firewall allows your IP |
| `Address already in use` on port 8000 | Port conflict | This shouldn't happen in App Service; restart the app |

**Action — View App Service Logs in Azure CLI:**
```bash
az webapp log tail \
  --name hgs-refuce-backend \
  --resource-group hgs-refuce-rg
```

---

## **Common Failure Fixes**

### **Fix A: "requirements.txt not found" or Module import errors**

**Symptom:** Workflow fails during `pip install` or app fails to start with `ModuleNotFoundError`.

**Cause:** Azure is looking in the wrong directory.

**Solution:**
1. Open `.github/workflows/deploy-backend.yml`
2. Verify this line is present:
   ```yaml
   package: backend_fast_api/
   ```
3. Verify in `startup.sh`:
   ```bash
   cd /home/site/wwwroot
   ```

---

### **Fix B: App starts but returns 502 Bad Gateway**

**Symptom:** Curl works (`curl https://hgs-refuce-backend.azurewebsites.net/`) but times out or returns 502.

**Cause:** Likely a database connection issue.

**Solution:**
1. Check `DATABASE_URL` in **Configuration → Application settings**
2. Test the connection locally:
   ```bash
   export DATABASE_URL="postgresql://..."
   python -c "from src.hgs_refuce_app.storage import DatabaseConnection; print('Connected!')"
   ```
3. Check PostgreSQL firewall rules allow connections from Azure App Service's IP

---

### **Fix C: FastAPI starts but endpoints return 404 or 500**

**Symptom:** `curl https://hgs-refuce-backend.azurewebsites.net/registrations` returns 404 or 500.

**Cause:** Endpoint doesn't exist or logic error in app code.

**Solution:**
1. Check logs: `az webapp log tail --name hgs-refuce-backend --resource-group hgs-refuce-rg`
2. Verify endpoints exist in `src/hgs_refuce_app/main.py`
3. Test endpoints locally before pushing:
   ```bash
   cd backend_fast_api
   uvicorn hgs_refuce_app.main:app --reload
   curl http://localhost:8000/registrations
   ```

---

## **Checklist: Before You Deploy**

- [ ] Azure PostgreSQL server and database created
- [ ] `.github/workflows/deploy-backend.yml` created and pushed
- [ ] `backend_fast_api/startup.sh` created and pushed
- [ ] `DATABASE_URL` set in App Service Configuration
- [ ] `APP_ENV=production` set in App Service Configuration
- [ ] GitHub Actions workflow passes (green checkmark on GitHub → Actions)
- [ ] `az webapp log tail` shows `Application startup complete`
- [ ] `curl https://hgs-refuce-backend.azurewebsites.net/docs` returns 200

---

## **Next Steps After Successful Deployment**

1. **Set CORS origins:** Once frontend is deployed, update `BACKEND_CORS_ORIGINS` in App Service Configuration to include the frontend URL
2. **Monitor logs:** Periodically check App Service logs for errors or warnings
3. **Auto-scale (optional):** For production, configure auto-scaling in the App Service Plan settings
4. **Custom domain (optional):** Add your own domain name instead of `azurewebsites.net`

---

**You're ready to deploy.** Start with **Step 1** and work through sequentially. If you hit an error, refer to the **Common Failure Fixes** section or the **Log stream** in Azure Portal.
