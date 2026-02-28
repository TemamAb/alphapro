# Alpha-Orion Production Deployment Instructions

## Overview

This guide details the exact steps to deploy the Alpha-Orion Unified Service Architecture to the Render Cloud platform using the Infrastructure-as-Code (IaC) Blueprint defined in `render.yaml`.

## Prerequisites

1.  **Render Account**: A valid account on render.com.
2.  **GitHub Repository**: This codebase must be pushed to a GitHub repository connected to your Render account.
3.  **API Keys**: You will need the following keys ready:
    *   `OPENAI_API_KEY` (for AI features)
    *   `PIMLICO_API_KEY` (for gasless transactions)
    *   `WALLET_ADDRESS` (public address for monitoring)

## Deployment Steps

### 1. Push Code to GitHub

Ensure your latest changes, especially `render.yaml` and the `backend-services` directory, are committed and pushed to your `main` branch.

```bash
git add .
git commit -m "Final production configuration"
git push origin main
```

### 2. Create Blueprint on Render

1.  Log in to the Render Dashboard.
2.  Click the **"New +"** button in the top right.
3.  Select **"Blueprint"**.
4.  Connect your GitHub account if not already connected.
5.  Select the **alpha-orion** repository from the list.

### 3. Configure Service

Render will automatically detect the `render.yaml` file and propose the services to be created:

*   **alpha-orion-api**: The Node.js Gateway & Frontend.
*   **alpha-orion-brain**: The Python AI Service.

Click **"Apply"** or **"Create Blueprint"**.

### 4. Set Production Secrets

Once the Blueprint is created, Render might ask for environment variables, or you may need to add them manually if they were marked as `sync: false` in `render.yaml`.

Go to the **Environment** tab for **each service** (or the shared Environment Group if you created one) and set the following:

**For `alpha-orion-api`:**
*   `OPENAI_API_KEY`: `sk-...`
*   `PIMLICO_API_KEY`: `pim_...`
*   `WALLET_ADDRESS`: `0x...`
*   `FLASH_LOAN_EXECUTOR_ADDRESS`: `0x...` (Optional, if deployed)

**For `alpha-orion-brain`:**
*   `OPENAI_API_KEY`: `sk-...`

### 5. Verify Deployment

1.  Wait for the build to complete. Render will install dependencies for both the frontend and backend.
2.  Once the status is **Live**, click the URL provided for `alpha-orion-api` (e.g., `https://alpha-orion-api.onrender.com`).
3.  **Dashboard Check**: You should see the Alpha-Orion Dashboard.
4.  **Health Check**: Visit `/health` to verify backend status.
5.  **Optimization Check**: Visit the "Optimization" tab in the dashboard to verify it can fetch data from the Python AI service.

## Troubleshooting

*   **Build Fails**: Check the logs. Ensure `npm install` succeeded and the `dashboard/dist` folder was created.
*   **502 Bad Gateway**: The service might still be starting. Wait a minute and refresh.
*   **"AI Service Unavailable"**: Ensure the `alpha-orion-brain` service is deployed and healthy. The `AI_SERVICE_URL` is automatically managed by Render Blueprints.
*   **Git Push Rejected**: If `git push` fails with `! [rejected]`, run `git pull origin main` to sync remote changes, resolve any conflicts, and then push again.
*   **"failed to read dockerfile"**: This means the service is set to "Docker" environment. Ensure the root `Dockerfile` is present in the repository (added in v1.0.1).

## Post-Deployment

*   **Activate Profit Mode**: Use the dashboard settings or API to switch from "Signal Mode" to "Execution Mode" if keys are configured.
*   **Monitor Logs**: Use the Render dashboard to view real-time logs for both services.