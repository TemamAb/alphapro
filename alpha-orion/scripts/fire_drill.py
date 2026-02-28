#!/usr/bin/env python3
import os
import sys
import time

def fire_drill():
    print("🔥 INITIATING DATABASE FIRE DRILL...")
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ CRITICAL: DATABASE_URL is not set.")
        print("   Please export DATABASE_URL='postgres://user:pass@host/db'")
        sys.exit(1)

    # Check for placeholder
    if "hostname.oregon-postgres.render.com" in db_url:
        print("❌ CONFIG ERROR: You are using the placeholder 'hostname'.")
        print("   Please retrieve your actual External Connection String from the Render Dashboard.")
        print("   It usually looks like: dpg-cn...-a.oregon-postgres.render.com")
        sys.exit(1)

    # Ensure SSL is used for external connections
    if "sslmode" not in db_url:
        print("ℹ️  Auto-appending '?sslmode=require' for external connection...")
        db_url += "&sslmode=require" if "?" in db_url else "?sslmode=require"
        
    try:
        import psycopg2
    except ImportError:
        print("❌ CRITICAL: psycopg2 module not found. Run 'pip install psycopg2-binary'")
        sys.exit(1)

    try:
        print("   Attempting connection to Neon PostgreSQL...")
        start_time = time.time()
        conn = psycopg2.connect(db_url, connect_timeout=10)
        latency = (time.time() - start_time) * 1000
        print(f"✅ Connection established in {latency:.2f}ms")
        
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"✅ Database Version: {version}")
        
        cur.close()
        conn.close()
        print("🚀 FIRE DRILL PASSED: Database is healthy and accessible.")
        
    except Exception as e:
        print(f"❌ FIRE DRILL FAILED: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    fire_drill()