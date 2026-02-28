# Alpha-Orion "Go Live" Checklist: Render Production Cutover

**Objective:** To execute a seamless transition of live traffic from the legacy GCP infrastructure to the new Render platform.

**Scheduled Window:** [YYYY-MM-DD HH:MM UTC]
**Duration:** 1 Hour

---

## 1. Pre-Flight Checks (T-24 Hours)

-   [ ] **CI/CD Status:** All GitHub Actions workflows (`ci.yml`, `docker-publish.yml`, `load-test.yml`) are passing on the `main` branch.
-   [ ] **Secret Population:**
    -   [ ] Log into the Render Dashboard.
    -   [ ] Navigate to the `alpha-orion-secrets` Environment Group.
    -   [ ] Verify that `OPENAI_API_KEY`, `PRIVATE_KEY`, and `INFURA_API_KEY` have been populated with production values.
-   [ ] **GCS Backup Secrets:**
    -   [ ] In the GitHub repository settings (`Settings > Secrets and variables > Actions`), confirm that `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and `GCS_BACKUP_BUCKET_NAME` are set.
-   [ ] **Final Load Test:**
    -   [ ] Manually trigger the `load-test.yml` workflow one last time.
    -   [ ] Confirm it passes all thresholds.
-   [ ] **Fire Drill:**
    -   [ ] Run the database fire drill script to confirm connectivity to the Neon production database.
    -   ```bash
        # Set DATABASE_URL to the Neon production URL
        python scripts/fire_drill.py
        ```
-   [ ] **DNS TTL Reduction:**
    -   [ ] In your DNS provider (e.g., Cloudflare, GoDaddy), lower the TTL for `api.alpha-orion.com` to 60 seconds. This will speed up propagation during the cutover.

## 2. Execution Window (T-0)

-   [ ] **Announce Maintenance:** Post a status update announcing a brief maintenance window for infrastructure migration.
-   [ ] **Scale Down Legacy Services (Optional):** If applicable, scale down the old GCP Cloud Run services to 0 instances to prevent split-brain scenarios.
-   [ ] **DNS CNAME Update:**
    -   [ ] Log into your DNS provider.
    -   [ ] Find the CNAME record for `api.alpha-orion.com`.
    -   [ ] **Update the value** to the Render service URL (e.g., `user-api-service.onrender.com`).
    -   [ ] Save the changes.
-   [ ] **Monitor DNS Propagation:**
    -   [ ] Use a tool like `dnschecker.org` to monitor the CNAME propagation across the globe.
    -   [ ] Locally, use `dig` or `nslookup` to verify the change.
    -   ```bash
        nslookup api.alpha-orion.com
        ```

## 3. Post-Flight Verification (T+1 Hour)

-   [ ] **Health Check:**
    -   [ ] Access `https://api.alpha-orion.com/health` in a browser or via `curl`.
    -   [ ] Verify it returns a `200 OK` status with all services showing as `connected`.
-   [ ] **Live API Call:**
    -   [ ] Generate a fresh JWT using `npm run utils:token`.
    -   [ ] Make an authenticated request to a protected endpoint.
    -   ```bash
        curl -H "Authorization: Bearer <YOUR_NEW_TOKEN>" https://api.alpha-orion.com/api/dashboard/stats
        ```
    -   [ ] Verify a valid JSON response is returned.
-   [ ] **Log Monitoring:**
    -   [ ] Open the Render Dashboard for the `user-api-service`.
    -   [ ] Monitor the live logs for any new errors or warnings.
-   [ ] **Hourly Job Verification:**
    -   [ ] Wait for the top of the next hour.
    -   [ ] Check the logs for the `hourly-maintenance` cron job to ensure it runs successfully.
-   [ ] **DNS TTL Restoration:**
    -   [ ] Set the TTL for `api.alpha-orion.com` back to its original value (e.g., `Auto` or `3600`).
-   [ ] **Announce Completion:** Post a status update announcing the successful completion of the maintenance.

---
*This checklist ensures a structured and verifiable migration to the new production environment.*