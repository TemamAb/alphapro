import os
import sys
import subprocess
from datetime import datetime
from google.cloud import storage

# --- Configuration ---
# These must be set in the environment (e.g., GitHub Actions secrets)
DB_URL = os.getenv('DATABASE_URL')
GCS_BUCKET_NAME = os.getenv('GCS_BACKUP_BUCKET_NAME')

def backup_database():
    print("🚀 Starting Daily Database Backup...")

    if not DB_URL or not GCS_BUCKET_NAME:
        print("❌ Error: DATABASE_URL and GCS_BACKUP_BUCKET_NAME environment variables must be set.")
        sys.exit(1)

    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    backup_filename = f"alpha-orion-backup_{timestamp}.sql.gz"
    
    try:
        # 1. Create the database dump using pg_dump
        print(f"📦 Creating compressed dump: {backup_filename}...")
        
        # The pg_dump command will use the connection info from DB_URL
        # We pipe the output directly to gzip for compression
        pg_dump_command = f'pg_dump "{DB_URL}" | gzip > {backup_filename}'
        
        subprocess.run(pg_dump_command, shell=True, check=True, capture_output=True, text=True)
        
        print("✅ Dump created successfully.")

        # 2. Upload to Google Cloud Storage
        print(f"☁️ Uploading to GCS bucket: {GCS_BUCKET_NAME}...")
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(backup_filename)
        
        blob.upload_from_filename(backup_filename)
        
        print(f"✅ Upload successful: gs://{GCS_BUCKET_NAME}/{backup_filename}")

    except subprocess.CalledProcessError as e:
        print(f"❌ pg_dump failed! Stderr: {e.stderr}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        sys.exit(1)
    finally:
        # 3. Clean up local backup file
        if os.path.exists(backup_filename):
            print(f"🧹 Cleaning up local file: {backup_filename}")
            os.remove(backup_filename)

if __name__ == "__main__":
    backup_database()