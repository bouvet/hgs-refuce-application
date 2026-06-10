# Azure Deployment Guide: Next.js Frontend to Azure App Service

Complete step-by-step guide to deploy the `hgs-refuce-application` frontend (Next.js 16) from GitHub to Azure Web App.

**Estimated time:** 20–30 minutes  
**Assumes:** Azure CLI installed (`az --version`), GitHub account with repo access, Node.js 18.17+, backend already deployed  
**Prerequisites:** Backend deployed to `refuce-backend-app.azurewebsites.net`

---

## Phase 1: Azure Resource Setup

### Step 1: Create Azure App Service Plan for Frontend

```bash
az appservice plan create \
  --name refuce-frontend-plan \
  --resource-group hgs-refuce-rg \
  --sku B1 \
  --is-linux
```

**What it does:** Defines the compute tier for the frontend (B1 = free-tier eligible; use B2+ for production load)

---

### Step 2: Create Azure App Service for Frontend

```bash
az webapp create \
  --resource-group hgs-refuce-rg \
  --plan refuce-frontend-plan \
  --name refuce-frontend-app \
  --runtime "node|24-lts"
```

**What it does:** Creates the web app that will run your Next.js production server  
**Note:** Use `node|20-lts` if you prefer Node.js 20 (both stable and compatible)

**Verify:**
```bash
az webapp show \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app \
  --query defaultHostName -o tsv
```

Expected output: `refuce-frontend-app.azurewebsites.net`

---

## Phase 2: Configure App Service

### Step 3: Set Environment Variables

In Azure Portal:
1. Navigate to **App Service → refuce-frontend-app**
2. Go to **Settings → Configuration**
3. Click **+ New application setting** and add:

| Setting Name | Value |
|--------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://refuce-backend-app.azurewebsites.net` |
| `NODE_ENV` | `production` |
| `WEBSITES_PORT` | `3000` |
| `SCM_REPOSITORY_PATH` | `frontend` |

**Critical notes:**
- `NEXT_PUBLIC_API_URL` **must** match your backend URL exactly (include `https://`)
- `WEBSITES_PORT` tells Azure to listen on port 3000 (where Next.js runs by default)
- `SCM_REPOSITORY_PATH` tells Azure to deploy from the `frontend/` subdirectory only
- `NODE_ENV=production` ensures Next.js optimizations are enabled

**Save after adding all settings.** The app will auto-restart.

---

### Step 4: Configure Startup Command

In Azure Portal:
1. Go to **App Service → refuce-frontend-app → Settings → General**
2. Scroll to **Startup Command** and enter:
   ```
   npm run build && npm start
   ```

**Why `npm run build && npm start`?**
- `npm run build` compiles Next.js code, optimizes for production, generates `.next/` folder
- `npm start` runs the built app in production mode (faster than `npm run dev`)
- Azure runs this on every app start (including after deployments)

---

## Phase 3: Prepare Your Code for Deployment

### Step 5: Verify Next.js Build Configuration

Ensure `frontend/next.config.ts` is compatible with Azure:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress assets
  compress: true,
  // Use built-in Image Optimization (no external service needed)
  images: {
    unoptimized: false, // false = use Next.js Image Optimization (recommended)
  },
  // Output: standalone (smaller, faster, doesn't need .next folder in production)
  output: undefined, // default is fine; only set to 'standalone' if you have size constraints
};

export default nextConfig;
```

**Verify existing config is correct:**
```bash
cd frontend
cat next.config.ts
```

If the file doesn't exist or is missing, the default config is fine.

---

### Step 6: Commit Production-Ready Code

Ensure your frontend is ready:

```bash
cd frontend

# Install dependencies
npm install

# Lint check
npm run lint

# Build locally to verify no errors
npm run build

# If build succeeds, commit and push
git add .
git commit -m "Frontend: prepare for Azure deployment"
git push origin main
```

**Expected:**
- `npm run build` completes without errors
- A `.next/` folder appears (this is the compiled app)
- No TypeScript or ESLint errors

---

### Step 7: Create `.azure/config` for Frontend (Optional but Recommended)

In the repo root (alongside the existing backend `.azure/config`):

```bash
cat >> .azure/config << 'EOF'
{
  "deploymentSlots": false,
  "skipAppServiceCreation": false,
  "resourceGroupName": "hgs-refuce-rg",
  "appServicePlanName": "refuce-frontend-plan",
  "appServiceName": "refuce-frontend-app",
  "appServiceRuntimeString": "node|18-lts",
  "appServiceRuntimeVersion": "18"
}
EOF
```

---

## Phase 4: Deploy from GitHub

### Step 8: Option A – GitHub Actions (Recommended for CI/CD)

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Azure

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: frontend
        run: npm install

      - name: Lint
        working-directory: frontend
        run: npm run lint

      - name: Build
        working-directory: frontend
        run: npm run build

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: refuce-frontend-app
          package: frontend
          publish-profile: ${{ secrets.AZURE_PUBLISHPROFILE_FRONTEND }}
```

**Set up the publish profile:**

1. In Azure Portal: **App Service → refuce-frontend-app → Deployment center**
2. Click **Manage publish profile**
3. Download the `.PublishSettings` file
4. In GitHub: **Settings → Secrets and variables → Actions**
5. Click **New repository secret**, name it `AZURE_PUBLISHPROFILE_FRONTEND`
6. Paste the entire contents of the `.PublishSettings` file

**Trigger deployment:**
```bash
git add .github/workflows/deploy-frontend.yml
git commit -m "Add GitHub Actions deployment workflow for frontend"
git push origin main
```

The workflow will run automatically. Monitor in GitHub **Actions** tab.

---

### Step 8: Option B – Manual Deployment (If CI/CD Setup Fails)

**Using Azure CLI directly:**

```bash
cd frontend

# Install and build
npm install
npm run build

# Create a deployment package
mkdir -p deploy
cp -r .next/ node_modules/ package*.json public/ deploy/ 2>/dev/null || true
cp -r .next/ package*.json deploy/ 2>/dev/null

# Navigate to deploy and create zip
cd deploy
zip -r ../frontend.zip .
cd ..

# Upload to App Service
az webapp deployment source config-zip \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app \
  --src frontend.zip
```

**Using VS Code Azure Tools:**
1. Install **Azure App Service** extension in VS Code
2. Sign in to Azure
3. Right-click the app service → **Deploy to Web App**
4. Select `frontend/` folder when prompted

---

## Phase 5: Verify Deployment

### Step 9: Check App Service Logs

**In Azure Portal:**
1. Go to **App Service → refuce-frontend-app → Monitoring → Log stream**
2. You should see startup logs like:
   ```
   2025-06-09T10:35:20.123Z   INFO  Running npm install
   2025-06-09T10:35:45.456Z   INFO  Building Next.js...
   2025-06-09T10:36:10.789Z   INFO  Next.js server running on 0.0.0.0:3000
   ```

**Via Azure CLI:**
```bash
az webapp log tail \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app \
  --follow
```

---

### Step 10: Test the Frontend

**Get your frontend URL:**
```bash
FRONTEND_URL=$(az webapp show \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app \
  --query defaultHostName -o tsv)

echo "Visit: https://$FRONTEND_URL"
```

**Open in browser:**
Navigate to `https://refuce-frontend-app.azurewebsites.net`

**Expected:**
- Page loads without errors
- You see the login/role selector
- No 500 errors in logs

**If stuck on loading or 502 Bad Gateway:**
- Check logs (Step 9)
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Verify backend is reachable: `curl https://refuce-backend-app.azurewebsites.net/registrations`

---

### Step 11: Test Frontend → Backend Communication

**In the browser console** (`F12`):
1. Open the frontend
2. Select a role and navigate to any data page (Oversikt, Historikk, etc.)
3. Open DevTools **Network** tab
4. Look for API calls to your backend URL
5. Verify they return 200 (not 403, 404, or 500)

**If you see CORS errors in Console:**
- The backend's `BACKEND_CORS_ORIGINS` is not set correctly
- See backend deployment guide Step 6 / Step 13

---

## Phase 6: Post-Deployment Configuration

### Step 12: Update Backend CORS for Frontend

The backend needs to allow requests from the frontend. 

**In Azure Portal (backend app service):**
1. **App Service → refuce-backend-app → Settings → Configuration**
2. Find `BACKEND_CORS_ORIGINS` setting
3. Update to include both frontend URL and localhost:
   ```
   https://refuce-frontend-app.azurewebsites.net,http://localhost:3000
   ```
4. Save and restart the app:
   ```bash
   az webapp restart \
     --resource-group hgs-refuce-rg \
     --name refuce-backend-app
   ```

---

### Step 13: Enable Application Insights (Optional but Recommended)

Monitor frontend performance and errors:

```bash
# Create Application Insights instance
az monitor app-insights component create \
  --app refuce-insights-frontend \
  --location westeurope \
  --resource-group hgs-refuce-rg

# Get the instrumentation key
INSIGHTS_KEY=$(az monitor app-insights component show \
  --app refuce-insights-frontend \
  --resource-group hgs-refuce-rg \
  --query instrumentationKey -o tsv)

# Link to frontend App Service
az webapp config appsettings set \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY"
```

---

## Common Errors & Troubleshooting

### Error 1: `npm: command not found`

**Root cause:** Node.js not installed in the app container, or wrong runtime selected.

**Fix:**
1. Verify runtime in **App Service → Configuration → General**
2. Should be `node|18-lts` or `node|20-lts`
3. Change if needed:
   ```bash
   az webapp config set \
     --resource-group hgs-refuce-rg \
     --name refuce-frontend-app \
     --linux-fx-version "node|18-lts"
   ```
4. Restart the app:
   ```bash
   az webapp restart \
     --resource-group hgs-refuce-rg \
     --name refuce-frontend-app
   ```

---

### Error 2: `ERR! code ENOENT, syscall open 'package.json'`

**Root cause:** Deployment package doesn't have `package.json`, or `SCM_REPOSITORY_PATH` is wrong.

**Fix:**
1. Verify `SCM_REPOSITORY_PATH` is set to `frontend`:
   ```bash
   az webapp config appsettings list \
     --resource-group hgs-refuce-rg \
     --name refuce-frontend-app \
     | grep SCM_REPOSITORY_PATH
   ```
2. If missing, add it:
   ```bash
   az webapp config appsettings set \
     --resource-group hgs-refuce-rg \
     --name refuce-frontend-app \
     --settings SCM_REPOSITORY_PATH="frontend"
   ```
3. Redeploy (push to main or use manual deploy from Step 8)

---

### Error 3: `Failed to compile` / `SyntaxError in TypeScript`

**Root cause:** TypeScript or ESLint errors in the build.

**Fix:**
1. Check logs in **Log stream** for the exact error
2. Fix locally:
   ```bash
   cd frontend
   npm run lint --fix
   npm run build
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "Fix TypeScript/lint errors"
   git push origin main
   ```

---

### Error 4: `502 Bad Gateway` / App crashes after deployment

**Root cause:** Usually startup command failed or Node version incompatible.

**Fix:**
1. Check logs: **App Service → Log stream**
2. Look for startup errors
3. If you see `npm ERR!`:
   - Try rebuilding: `npm install` then `npm run build` locally
   - Verify `next.config.ts` is valid TypeScript
4. If logs show nothing:
   - SSH into the app and test manually:
     ```bash
     az webapp ssh --resource-group hgs-refuce-rg --name refuce-frontend-app
     # Inside SSH:
     cd /home/site/wwwroot
     npm start
     ```

---

### Error 5: `CORS error: Access denied from https://backend-url`

**Root cause:** Backend's `BACKEND_CORS_ORIGINS` doesn't include the frontend URL.

**Fix:**
1. Go to **backend app service → Settings → Configuration**
2. Find `BACKEND_CORS_ORIGINS`
3. Update to include frontend:
   ```
   https://refuce-frontend-app.azurewebsites.net,http://localhost:3000
   ```
4. Restart backend:
   ```bash
   az webapp restart \
     --resource-group hgs-refuce-rg \
     --name refuce-backend-app
   ```

---

### Error 6: `NEXT_PUBLIC_API_URL` is undefined in the browser

**Root cause:** Environment variable not set in App Service or not visible to Next.js build.

**Fix:**
1. Verify it's set:
   ```bash
   az webapp config appsettings list \
     --resource-group hgs-refuce-rg \
     --name refuce-frontend-app \
     | grep NEXT_PUBLIC_API_URL
   ```
2. If missing, add it:
   ```bash
   az webapp config appsettings set \
     --resource-group hgs-refuce-rg \
     --name refuce-frontend-app \
     --settings "NEXT_PUBLIC_API_URL=https://refuce-backend-app.azurewebsites.net"
   ```
3. Redeploy (trigger a new build/deployment):
   ```bash
   git push origin main  # or manual deploy from Step 8
   ```

---

### Error 7: `Error: connect ECONNREFUSED` when calling backend API

**Root cause:** `NEXT_PUBLIC_API_URL` is pointing to localhost or backend is unreachable.

**Fix:**
1. Verify `NEXT_PUBLIC_API_URL` in **Configuration → Application settings**
2. Should be the Azure backend URL, not `http://localhost:8000`
3. Correct value:
   ```
   https://refuce-backend-app.azurewebsites.net
   ```
4. Test backend is reachable:
   ```bash
   curl https://refuce-backend-app.azurewebsites.net/registrations
   ```
   - If 403/401: check backend auth settings
   - If 502: backend is down, check its logs
   - If 200: connection works

---

### Error 8: Pages load but data doesn't appear / stuck on loading

**Root cause:** Frontend is built with old `NEXT_PUBLIC_API_URL`, or API is slow.

**Fix:**
1. Hard-refresh in browser: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Check browser console for errors (F12)
3. Check frontend logs: **Log stream**
4. Check backend is responding:
   ```bash
   curl -s https://refuce-backend-app.azurewebsites.net/registrations | jq .
   ```
   - Should return `[]` (empty array) or a list of registrations
5. If backend returns 500, check backend logs and fix the issue

---

## Monitoring & Maintenance

### View Real-Time Logs

```bash
az webapp log tail \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app \
  --follow
```

Exit with `Ctrl+C`.

---

### Download Historical Logs

```bash
az webapp log download \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app \
  --log-file frontend_logs.zip

unzip frontend_logs.zip
```

---

### Scale the Frontend

**Vertical scaling (bigger machine):**
```bash
az appservice plan update \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-plan \
  --sku B2  # or S1, P1V2, etc.
```

**Horizontal scaling (multiple instances):**
```bash
az appservice plan update \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-plan \
  --number-of-workers 3
```

---

### Restart the Frontend App

```bash
az webapp restart \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app
```

---

## Cleanup (If Needed)

To delete just the frontend resources:

```bash
az appservice plan delete \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-plan \
  --yes

az webapp delete \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app
```

⚠️ **Be careful** — this deletes the app but not the resource group.

---

## Rollback a Deployment

If a deployment breaks production:

**Option 1 – Via GitHub Actions (if using CI/CD):**
- Revert the commit: `git revert <commit-hash>`
- Push to main
- GitHub Actions will redeploy the previous version

**Option 2 – Manual rollback:**
```bash
# List recent deployments
az webapp deployment list \
  --resource-group hgs-refuce-rg \
  --name refuce-frontend-app

# Redeploy a previous version by re-pushing to GitHub
# (Git triggers the workflow, which redeploys the old code)
```

---

## Final Checklist

- [ ] Frontend App Service created and running
- [ ] Node.js runtime set to `node|18-lts` or `node|20-lts`
- [ ] `NEXT_PUBLIC_API_URL` set to backend URL (https://refuce-backend-app.azurewebsites.net)
- [ ] `NODE_ENV` set to `production`
- [ ] `WEBSITES_PORT` set to `3000`
- [ ] `SCM_REPOSITORY_PATH` set to `frontend`
- [ ] Startup command set to `npm run build && npm start`
- [ ] `npm run build` succeeds locally without errors
- [ ] GitHub Actions workflow is in `.github/workflows/` or manual deploy tested
- [ ] Frontend loads at https://refuce-frontend-app.azurewebsites.net
- [ ] Frontend can communicate with backend (test in browser or API calls in logs)
- [ ] No CORS errors in browser console
- [ ] Data pages load and display correctly
- [ ] Logs are being captured (check **Log stream**)
- [ ] Backend's `BACKEND_CORS_ORIGINS` includes frontend URL

---

## Next Steps

1. **Local testing before deployment:**
   ```bash
   cd frontend
   NEXT_PUBLIC_API_URL=https://refuce-backend-app.azurewebsites.net npm run build
   NEXT_PUBLIC_API_URL=https://refuce-backend-app.azurewebsites.net npm start
   ```
   Visit `http://localhost:3000` and test the app.

2. **Monitoring:** Set up Application Insights alerts for errors or slow page loads.

3. **Performance:** Use Azure's **Metrics** to monitor CPU, memory, and response times.

4. **Domain (Optional):** Add a custom domain in **App Service → Custom domains** instead of using `azurewebsites.net`.

---

**Questions or errors?** Check the troubleshooting section above — most issues are covered. If stuck, share the error from **Log stream** and this guide can be extended.
