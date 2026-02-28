import os
import sys
import time
import psycopg2

# Configuration
DB_URL = os.getenv('DATABASE_URL')

def simulate_outage_check():
    print("🔥 STARTING FIRE DRILL: Database Connectivity Check 🔥")
    print("---------------------------------------------------")
    
    if not DB_URL:
        print("❌ Error: DATABASE_URL environment variable must be set.")
        sys.exit(1)

    print(f"Attempting to connect to primary database...")
    start_time = time.time()

    try:
        # Set a short timeout to simulate strict SLA
        conn = psycopg2.connect(DB_URL, connect_timeout=3)
        
        # Run a simple query
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        
        duration = (time.time() - start_time) * 1000
        print(f"✅ Connection Successful. Latency: {duration:.2f}ms")
        print("ℹ️  Drill Result: SYSTEM NOMINAL. No action required.")
        
        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ CONNECTION FAILED: {e}")
        print("\n🚨 DRILL ALERT: PRIMARY DATABASE UNREACHABLE 🚨")
        print("---------------------------------------------------")
        print("1. Check Neon Console status.")
        print("2. Verify Render environment variables.")
        print("3. If confirmed down, initiate DR Plan Section 3.1 (PITR).")
        sys.exit(1)

if __name__ == "__main__":
    simulate_outage_check()