import os
import secrets
import requests
import sys

# Configuration
# These should be set in the environment where this script runs (e.g., CI/CD or local admin shell)
RENDER_API_KEY = os.getenv('RENDER_API_KEY')
SERVICE_ID = os.getenv('RENDER_SERVICE_ID') # The ID of the user-api-service on Render
RENDER_API_URL = f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars"

def generate_secret():
    # Generate a URL-safe text string, containing 64 random bytes.
    return secrets.token_urlsafe(64)

def rotate_secret():
    print("🔐 Starting JWT Secret Rotation Sequence...")

    if not RENDER_API_KEY or not SERVICE_ID:
        print("❌ Error: RENDER_API_KEY and RENDER_SERVICE_ID environment variables must be set.")
        sys.exit(1)

    new_secret = generate_secret()
    print(f"🔑 Generated new secure secret (length: {len(new_secret)})")

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {RENDER_API_KEY}"
    }

    # We use PATCH to update specific env vars without overwriting others
    payload = [
        {
            "key": "JWT_SECRET",
            "value": new_secret
        }
    ]

    try:
        print(f"🚀 Sending update request to Render Service ({SERVICE_ID})...")
        response = requests.patch(RENDER_API_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ JWT_SECRET rotated successfully.")
            print("🔄 Render is now deploying the service with the new secret.")
        else:
            print(f"❌ Failed to update secret. Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)

    except Exception as e:
        print(f"❌ An error occurred during rotation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    rotate_secret()