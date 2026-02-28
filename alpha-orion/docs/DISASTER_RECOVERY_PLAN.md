# Alpha-Orion Disaster Recovery (DR) Plan

**Version:** 1.0
**Last Updated:** 2024-05-20
**Status:** Active

---

## 1. Overview

This document outlines the procedures for recovering the Alpha-Orion platform in the event of a catastrophic failure. It covers database data loss, service outages on Render, and security breaches.

### 1.1 Recovery Objectives

-   **Recovery Time Objective (RTO):** 4 Hours (Maximum time to restore service)
-   **Recovery Point Objective (RPO):** 1 Hour (Maximum acceptable data loss)

## 2. Infrastructure Redundancy

| Component | Primary Provider | Backup / Failover Strategy |
| :--- | :--- | :--- |
| **Compute** | Render (Oregon) | Render (Frankfurt) or Google Cloud Run |
| **Database** | Neon (PostgreSQL) | Point-in-Time Recovery (PITR) via Neon Console |
| **Cache** | Upstash (Redis) | Re-hydration from DB; Non-critical data flushed |
| **Codebase** | GitHub | Local Developer Clones |

## 3. Database Recovery Procedures

### 3.1 Point-in-Time Recovery (Neon)

Neon provides built-in PITR. In the event of data corruption or accidental deletion:

1.  **Stop Services:** Scale down `user-api-service` and `blockchain-monitor` to 0 instances on Render to prevent new writes.
2.  **Access Neon Console:** Navigate to the Alpha-Orion project.
3.  **Initiate Restore:** Select "Restore" and choose a timestamp *before* the incident occurred.
4.  **Verify Data:** Connect via local SQL client to verify integrity.
5.  **Update Connection Strings:** If the restore created a new branch/endpoint, update `DATABASE_URL` in Render Environment Groups.
6.  **Restart Services:** Scale services back up.

### 3.2 Manual Dump & Restore (Catastrophic Provider Failure)

If Neon is completely unavailable, restore from the nightly `pg_dump` stored in Google Cloud Storage (GCS).

1.  **Provision New DB:** Spin up a PostgreSQL instance on AWS RDS or GCP Cloud SQL.
2.  **Download Backup:** Retrieve the latest `.sql` dump from GCS bucket `alpha-orion-backups`.
3.  **Restore:**
    ```bash
    psql -h [NEW_HOST] -U [USER] -d [DB_NAME] < backup_latest.sql
    ```
4.  **Reconfigure:** Update `DATABASE_URL` in Render.

## 4. Service Recovery Procedures

### 4.1 Render Region Outage

If Render's Oregon region goes down:

1.  **Update Terraform Config:**
    Modify `terraform/main.tf` to change the region:
    ```hcl
    variable "region" {
      default = "frankfurt" # Change from oregon
    }
    ```
2.  **Apply Infrastructure:**
    ```bash
    terraform apply
    ```
3.  **Verify DNS:** Ensure `api.alpha-orion.com` points to the new Render endpoints.

## 5. Security Incident Response

### 5.1 Compromised JWT Secret

If `JWT_SECRET` is leaked:

1.  **Rotate Secret Immediately:**
    Run the rotation script locally:
    ```bash
    python scripts/rotate_jwt_secret.py
    ```
    *Note: This will invalidate all active user sessions.*

2.  **Force Re-login:** Notify users to log in again.

### 5.2 Smart Contract Emergency

If a vulnerability is found in the `FlashLoanArbitrage` contract:

1.  **Pause Contract:** Call the `pause()` function on the contract (if `Pausable` is implemented) via Etherscan or Hardhat console.
2.  **Withdraw Funds:** Call `withdraw()` to move all assets to the cold wallet (Multi-Sig).
3.  **Deploy Fix:** Patch the vulnerability, test in Hardhat, and deploy a new contract.
4.  **Migrate:** Update the backend `FLASH_LOAN_CONTRACT_ADDRESS` environment variable.

## 6. Contact List

| Role | Name | Contact |
| :--- | :--- | :--- |
| **Chief Architect** | [Name] | +1-555-0101 |
| **DevOps Lead** | [Name] | +1-555-0102 |
| **Security Officer** | [Name] | +1-555-0103 |

---

*Drills should be conducted quarterly to ensure team familiarity with these procedures.*