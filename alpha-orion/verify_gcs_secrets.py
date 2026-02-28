import os
import sys

def verify_secrets():
    print("🔐 Verifying GCS Backup Configuration...")
    print("---------------------------------------")

    required_vars = [
        'GCP_WORKLOAD_IDENTITY_PROVIDER',
        'GCP_SERVICE_ACCOUNT',
        'GCS_BACKUP_BUCKET_NAME',
        'DATABASE_URL'
    ]

    missing = []
    present = []

    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing.append(var)
        else:
            # Mask the value for security in logs
            masked = value[:4] + "..." + value[-4:] if len(value) > 8 else "****"
            present.append(f"{var}: {masked}")

    if present:
        print("✅ Found the following variables:")
        for p in present:
            print(f"   - {p}")

    if missing:
        print("\n❌ MISSING VARIABLES:")
        for m in missing:
            print(f"   - {m}")
        print("\n⚠️  Action Required: Please set these secrets in your GitHub Repository settings.")
        print("   (Settings > Secrets and variables > Actions)")
        sys.exit(1)
    else:
        print("\n✅ All GCS backup configuration secrets are present.")

if __name__ == "__main__":
    verify_secrets()