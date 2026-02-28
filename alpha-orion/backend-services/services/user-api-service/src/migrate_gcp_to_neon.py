import os
import psycopg2
import psycopg2.extras
from urllib.parse import urlparse
import sys

# Configuration
# Ensure these are set in your environment before running
SOURCE_DB_URL = os.getenv('GCP_DATABASE_URL')
DEST_DB_URL = os.getenv('NEON_DATABASE_URL')

def get_conn(url):
    try:
        result = urlparse(url)
        username = result.username
        password = result.password
        database = result.path[1:]
        hostname = result.hostname
        port = result.port
        
        conn = psycopg2.connect(
            database=database,
            user=username,
            password=password,
            host=hostname,
            port=port,
            sslmode='require'
        )
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to {url}: {e}")
        sys.exit(1)

def migrate():
    print("🚀 Starting Alpha-Orion Database Migration (GCP AlloyDB -> Neon)")
    
    if not SOURCE_DB_URL or not DEST_DB_URL:
        print("❌ Error: GCP_DATABASE_URL and NEON_DATABASE_URL environment variables must be set.")
        return

    source_conn = get_conn(SOURCE_DB_URL)
    dest_conn = get_conn(DEST_DB_URL)
    
    print("✅ Connected to Source and Destination databases.")

    try:
        # 1. Fetch all tables from source
        with source_conn.cursor() as src_cur:
            src_cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            tables = [row[0] for row in src_cur.fetchall()]
            
        print(f"📋 Found {len(tables)} tables to migrate: {', '.join(tables)}")

        for table in tables:
            print(f"   🔄 Migrating table: {table}...")
            
            # 2. Read data from source
            # Using server-side cursor for memory efficiency with large datasets
            with source_conn.cursor(name=f'fetch_{table}') as src_cur:
                src_cur.execute(f"SELECT * FROM {table}")
                
                # 3. Write data to destination
                with dest_conn.cursor() as dest_cur:
                    # Optional: Truncate destination table before load
                    # dest_cur.execute(f"TRUNCATE TABLE {table} CASCADE")
                    
                    while True:
                        rows = src_cur.fetchmany(1000)
                        if not rows:
                            break
                        
                        # Generate INSERT query dynamically based on columns
                        # Note: This assumes schema already exists in destination. 
                        # If not, schema migration (e.g. via Prisma/Sequelize) should run first.
                        cols = [desc[0] for desc in src_cur.description]
                        col_str = ','.join(cols)
                        val_placeholders = ','.join(['%s'] * len(cols))
                        
                        query = f"INSERT INTO {table} ({col_str}) VALUES ({val_placeholders}) ON CONFLICT DO NOTHING"
                        
                        psycopg2.extras.execute_batch(dest_cur, query, rows)
                        
                    print(f"      ✅ {table} migrated successfully.")
                    dest_conn.commit()

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        dest_conn.rollback()
    finally:
        source_conn.close()
        dest_conn.close()
        print("🏁 Migration sequence finished.")

if __name__ == "__main__":
    # Check for psycopg2 dependency
    try:
        import psycopg2
    except ImportError:
        print("⚠️  Missing dependency: psycopg2")
        print("   Run: pip install psycopg2-binary")
        sys.exit(1)
        
    migrate()