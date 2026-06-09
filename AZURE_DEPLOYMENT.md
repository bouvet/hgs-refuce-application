# Azure Deployment Guide: FastAPI + Web App + PostgreSQL

Complete step-by-step guide to deploy `hgs-refuce-application` backend from GitHub to Azure Web App with PostgreSQL.

**Estimated time:** 30–45 minutes  
**Assumes:** Azure CLI installed (`az --version`), GitHub account with repo access, local Python 3.12+

---

## Phase 1: Azure Resource Setup

### Step 1: Create a Resource Group

```bash
az group create \
  --name refuce-rg \
  --location westeurope
```

**What it does:** Organizes all your resources in one place (easier to delete/manage later)

---

### Step 2: Create Azure PostgreSQL Flexible Server

```bash
az postgres flexible-server create \
  --resource-group hgs-refuce-rg \
  --name hgs-refuce-db-server \
  --location westeurope \
  --admin-user dbadmin \
  --admin-password 'YourSecurePassword123!@#' \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --tier Burstable \
  --public-access "0.0.0.0"
```

**Important:**
- Replace `'YourSecurePassword123!@#'` with a strong password (save it — you'll need it)
- `Standard_B1ms` is free-tier eligible; upgrade if needed for production
- `--public-access "0.0.0.0"` allows connections from anywhere (firewall rules will restrict)

**Verify:**
```bash
az postgres flexible-server show \
  --resource-group hgs-refuce-rg \
  --name hgs-refuce-db-server
```

Expected output includes `fqdn: refuce-db-server.postgres.database.azure.com`

---

### Step 3: Create the Database

```bash
# Get the server's hostname
SERVER_FQDN=$(az postgres flexible-server show \
  --resource-group hgs-refuce-rg \
  --name hgs-refuce-db-server \
  --query fullyQualifiedDomainName -o tsv)

echo "Connecting to: $SERVER_FQDN"

# Connect and create database
PGPASSWORD='passw0rd!' psql -h $SERVER_FQDN \
  -U dbadmin -d postgres -c "CREATE DATABASE wasteflow;"
```

**Troubleshooting:**
- **Error: `psql: command not found`** → Install PostgreSQL client:
  ```bash
  # macOS
  brew install postgresql
  # Ubuntu/WSL
  sudo apt-get install postgresql-client
  # Windows: Download from https://www.postgresql.org/download/windows/
  ```
- **Error: `role "dbadmin" does not exist`** → Use the password from Step 2; PostgreSQL may require SSL:
  ```bash
  PGPASSWORD='...' psql -h $SERVER_FQDN -U dbadmin@refuce-db-server -d postgres -c "CREATE DATABASE wasteflow;"
  ```
  (Add `@refuce-db-server` to username for Azure)
- **Timeout/connection refused** → Check firewall in portal: **PostgreSQL server → Networking → Firewall rules** → Add your IP

---

### Step 4: Create Azure App Service Plan

```bash
az appservice plan create \
  --name refuce-plan \
  --resource-group refuce-rg \
  --sku B1 \
  --is-linux
```

**What it does:** Defines the compute tier for your web app (B1 = free-tier eligible; use B2 for production load)

---

### Step 5: Create Azure App Service (Web App)

```bash
az webapp create \
  --resource-group refuce-rg \
  --plan refuce-plan \
  --name refuce-backend-app \
  --runtime "python|3.12"
```

**What it does:** Creates the web app that will run your FastAPI service  
**Verify:**
```bash
az webapp show \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --query defaultHostName -o tsv
```

Expected output: `refuce-backend-app.azurewebsites.net`

---

## Phase 2: Configure App Service

### Step 6: Set Environment Variables

In Azure Portal:
1. Navigate to **App Service → refuce-backend-app**
2. Go to **Settings → Configuration**
3. Click **+ New application setting** and add:

| Setting Name | Value |
|--------------|-------|
| `WEBSITES_PORT` | `8000` |
| `DATABASE_URL` | `postgresql://dbadmin:YourSecurePassword123!@#@refuce-db-server.postgres.database.azure.com:5432/wasteflow` |
| `APP_ENV` | `production` |
| `LOG_LEVEL` | `INFO` |
| `LOG_DIR` | `/home/LogFiles` |
| `BACKEND_CORS_ORIGINS` | `https://your-frontend.azurewebsites.net` |
| `ADMIN_SECRET` | (generate a random string, e.g., `openssl rand -hex 32`) |

**DATABASE_URL format breakdown:**
```
postgresql://username:password@host:port/database
```

**Critical:** Save after adding all settings. The app will auto-restart.

---

### Step 7: Configure Startup Command

In Azure Portal:
1. Go to **App Service → refuce-backend-app → Settings → General**
2. Scroll to **Startup Command** and enter:
   ```
   gunicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 hgs_refuce_app.main:app
   ```

**Why gunicorn, not uvicorn?** 
- Azure App Service runs a single process; uvicorn is single-threaded by default
- Gunicorn spawns multiple workers to handle concurrent requests
- Install gunicorn in Step 10

---

## Phase 3: Prepare Your Code for Deployment

### Step 8: Update Dependencies

Add production-needed packages to `backend_fast_api/requirements.txt`:

```bash
cd backend_fast_api

# Add these lines to requirements.txt (if not already present):
echo "gunicorn==21.2.0" >> requirements.txt
echo "psycopg[binary]==3.1.13" >> requirements.txt
echo "python-dotenv==1.0.0" >> requirements.txt

# Verify the file
cat requirements.txt
```

**Expected contents:**
```
fastapi
uvicorn[standard]
gunicorn==21.2.0
psycopg[binary]==3.1.13
python-dotenv==1.0.0
```

**Commit this change:**
```bash
git add requirements.txt
git commit -m "Add gunicorn and psycopg for production deployment"
git push origin main
```

---

### Step 9: Create `.azure/config` (Optional but Recommended)

In the repo root:

```bash
mkdir -p .azure

cat > .azure/config << 'EOF'
{
  "deploymentSlots": false,
  "skipAppServiceCreation": false,
  "resourceGroupName": "refuce-rg",
  "appServicePlanName": "refuce-plan",
  "appServiceName": "refuce-backend-app",
  "appServiceRuntimeString": "python|3.12",
  "appServiceRuntimeVersion": "3.12"
}
EOF
```

---

## Phase 4: Deploy from GitHub

### Step 10: Option A – GitHub Actions (Recommended for CI/CD)

Create `.github/workflows/deploy-backend.yml`:

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
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        working-directory: backend_fast_api
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run tests
        working-directory: backend_fast_api
        run: pytest

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: refuce-backend-app
          package: backend_fast_api
          publish-profile: ${{ secrets.AZURE_PUBLISHPROFILE }}
```

**Set up the publish profile:**

1. In Azure Portal: **App Service → refuce-backend-app → Deployment center**
2. Click **Manage publish profile**
3. Download the `.PublishSettings` file
4. In GitHub: **Settings → Secrets and variables → Actions**
5. Click **New repository secret**, name it `AZURE_PUBLISHPROFILE`
6. Paste the entire contents of the `.PublishSettings` file

**Trigger deployment:**
```bash
git add .github/workflows/deploy-backend.yml
git commit -m "Add GitHub Actions deployment workflow"
git push origin main
```

The workflow will run automatically. Monitor in GitHub **Actions** tab.

---

### Step 10: Option B – Manual Deployment (If CI/CD Setup Fails)

**Using Azure CLI directly:**

```bash
cd backend_fast_api

# Build a deployment package
mkdir -p deploy
cp -r src/ requirements.txt deploy/

# Deploy using zip
cd deploy
zip -r ../backend.zip .
cd ..

# Upload to App Service
az webapp deployment source config-zip \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --src backend.zip
```

**Using VS Code Azure Tools:**
1. Install **Azure App Service** extension in VS Code
2. Sign in to Azure
3. Right-click the app service → **Deploy to Web App**
4. Select `backend_fast_api/` folder

---

## Phase 5: Verify Deployment

### Step 11: Check App Service Logs

**In Azure Portal:**
1. Go to **App Service → refuce-backend-app → Monitoring → Log stream**
2. You should see startup logs like:
   ```
   2025-06-09T10:30:45.123Z   INFO  Starting Gunicorn with 4 workers
   2025-06-09T10:30:46.456Z   INFO  Uvicorn running on 0.0.0.0:8000
   ```

**Via Azure CLI:**
```bash
az webapp log tail \
  --resource-group refuce-rg \
  --name refuce-backend-app
```

---

### Step 12: Test the API

```bash
# Get your app's URL
APP_URL=$(az webapp show \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --query defaultHostName -o tsv)

echo "Testing: https://$APP_URL"

# Test a health endpoint (adjust to your actual endpoints)
curl -X GET "https://$APP_URL/registrations" \
  -H "Content-Type: application/json"
```

**Expected:** 
- Status `200` with JSON response (empty array initially)
- If you see a 500 error, check logs in Step 11

---

## Phase 6: Post-Deployment Configuration

### Step 13: Set Up CORS for Frontend

Update the environment variable `BACKEND_CORS_ORIGINS` in **App Service → Configuration**:

```
https://your-frontend.azurewebsites.net,http://localhost:3000
```

(Include localhost for local testing)

Then restart the app:
```bash
az webapp restart \
  --resource-group refuce-rg \
  --name refuce-backend-app
```

---

### Step 14: Enable Application Insights (Optional but Recommended)

```bash
az monitor app-insights component create \
  --app refuce-insights \
  --location westeurope \
  --resource-group refuce-rg

# Link to App Service
INSIGHTS_KEY=$(az monitor app-insights component show \
  --app refuce-insights \
  --resource-group refuce-rg \
  --query instrumentationKey -o tsv)

az webapp config appsettings set \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY"
```

---

## Common Errors & Troubleshooting

### Error 1: `ModuleNotFoundError: No module named 'hgs_refuce_app'`

**Root cause:** Python path is not set; WSGI cannot find your app.

**Fix:**
1. Check startup command uses correct module path: `hgs_refuce_app.main:app`
2. Ensure `requirements.txt` is in the root of the deployed folder
3. Verify folder structure on app:
   ```bash
   az webapp ssh --resource-group refuce-rg --name refuce-backend-app
   # Inside SSH:
   ls -la /home/site/wwwroot/
   ls -la /home/site/wwwroot/src/
   ```

---

### Error 2: `OperationalError: could not connect to server`

**Root cause:** `DATABASE_URL` is wrong or PostgreSQL firewall is blocking the connection.

**Fix:**
1. Verify `DATABASE_URL` in **Configuration → Application settings**:
   - Correct format: `postgresql://dbadmin:PASSWORD@refuce-db-server.postgres.database.azure.com:5432/wasteflow`
   - Username might need `@refuce-db-server` suffix: `dbadmin@refuce-db-server`
2. Check PostgreSQL firewall in **Portal → PostgreSQL → Networking → Firewall rules**:
   - Should have a rule allowing Azure services: **Allow public access from any Azure service**
3. Test connection locally first:
   ```bash
   PGPASSWORD='YourPassword' psql -h refuce-db-server.postgres.database.azure.com \
     -U dbadmin@refuce-db-server -d wasteflow -c "SELECT 1;"
   ```

---

### Error 3: `503 Service Unavailable` / `App crashed`

**Root cause:** Gunicorn crashed due to missing dependency or import error.

**Fix:**
1. Check logs: **App Service → Log stream**
2. Look for `ModuleNotFoundError` or `ImportError`
3. If you see an error about a missing module:
   - Add it to `requirements.txt`
   - Redeploy (push to main or use manual deploy)
4. If no error in logs but app won't start:
   ```bash
   # SSH into app and test gunicorn locally
   az webapp ssh --resource-group refuce-rg --name refuce-backend-app
   # Inside SSH:
   cd /home/site/wwwroot
   python -c "from hgs_refuce_app.main import app; print('Import OK')"
   ```

---

### Error 4: `CORS error` in frontend logs

**Root cause:** `BACKEND_CORS_ORIGINS` is not set or is wrong.

**Fix:**
1. In **App Service → Configuration**, check `BACKEND_CORS_ORIGINS`
2. Should be the full frontend URL: `https://your-frontend.azurewebsites.net`
3. If you set it, restart the app:
   ```bash
   az webapp restart --resource-group refuce-rg --name refuce-backend-app
   ```
4. Check your frontend is actually calling the right URL:
   ```bash
   # In frontend's .env.local
   NEXT_PUBLIC_API_URL=https://refuce-backend-app.azurewebsites.net
   ```

---

### Error 5: `SSL: CERTIFICATE_VERIFY_FAILED` when connecting to PostgreSQL

**Root cause:** Azure PostgreSQL requires SSL by default; psycopg isn't configured.

**Fix:**
In your `DATABASE_URL`, add SSL parameter:
```
postgresql://dbadmin:PASSWORD@refuce-db-server.postgres.database.azure.com:5432/wasteflow?sslmode=require
```

Then update in **Configuration → APPLICATION SETTINGS**.

---

### Error 6: Empty response from API / `502 Bad Gateway`

**Root cause:** Usually Gunicorn timeout or too few workers.

**Fix:**
1. Increase workers in startup command:
   ```
   gunicorn --workers 8 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 60 hgs_refuce_app.main:app
   ```
2. Check App Service plan tier — B1 has limited CPU. Monitor in **Portal → Metrics**:
   - If CPU is at 100%, upgrade to B2 or higher
   ```bash
   az appservice plan update \
     --resource-group refuce-rg \
     --name refuce-plan \
     --sku B2
   ```

---

## Monitoring & Maintenance

### View Logs

**Real-time logs:**
```bash
az webapp log tail \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --follow
```

**Historical logs (downloaded):**
```bash
az webapp log download \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --log-file backend_logs.zip
```

### Scale the App

**Vertical scaling (bigger machine):**
```bash
az appservice plan update \
  --resource-group refuce-rg \
  --name refuce-plan \
  --sku S1  # or B2, P1V2, etc.
```

**Horizontal scaling (multiple instances):**
```bash
az appservice plan update \
  --resource-group refuce-rg \
  --name refuce-plan \
  --number-of-workers 3
```

### Restart the App

```bash
az webapp restart \
  --resource-group refuce-rg \
  --name refuce-backend-app
```

---

## Cleanup (If Needed)

To delete all resources:

```bash
az group delete \
  --name refuce-rg \
  --yes --no-wait
```

⚠️ **This deletes everything** — app, database, logs. Only do this to avoid Azure charges.

---

## Rollback a Deployment

If a deployment breaks production:

**Option 1 – Via GitHub Actions (if using CI/CD):**
- Revert the commit: `git revert <commit-hash>`
- Push to main
- GitHub Actions will redeploy the previous version

**Option 2 – Manual rollback:**
```bash
# List previous deployments
az webapp deployment list \
  --resource-group refuce-rg \
  --name refuce-backend-app

# Activate a previous deployment (replace ID)
az webapp deployment slot swap \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --slot backup  # if you created a backup slot
```

For quick rollback, maintain a backup slot:
```bash
az webapp deployment slot create \
  --resource-group refuce-rg \
  --name refuce-backend-app \
  --slot backup
```

---

## Final Checklist

- [ ] PostgreSQL server created and database `wasteflow` exists
- [ ] App Service created and running
- [ ] `DATABASE_URL` set in Configuration
- [ ] `WEBSITES_PORT` set to `8000`
- [ ] `APP_ENV` set to `production`
- [ ] Startup command set with gunicorn
- [ ] `requirements.txt` includes gunicorn and psycopg
- [ ] GitHub Actions workflow is in `.github/workflows/` or manual deploy tested
- [ ] Tests pass locally before pushing to main
- [ ] API responds with 200 to a test endpoint
- [ ] Frontend can reach backend (CORS configured)
- [ ] Logs are being captured (check **Log stream**)

---

## Next Steps

1. **Local testing:** Before pushing, test locally:
   ```bash
   cd backend_fast_api
   export DATABASE_URL="postgresql://..."
   pip install -r requirements.txt
   pytest
   uvicorn hgs_refuce_app.main:app --reload
   ```

2. **Frontend connection:** Update frontend's API URL to point to Azure:
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=https://refuce-backend-app.azurewebsites.net
   ```

3. **Monitoring:** Set up Application Insights alerts for 500 errors or slow requests.

4. **Database backups:** Enable automated backups in **PostgreSQL → Backup and restore**

---

**Questions or errors?** Check the troubleshooting section above — most issues are covered. If stuck, share the error from **Log stream** and I can help diagnose.
