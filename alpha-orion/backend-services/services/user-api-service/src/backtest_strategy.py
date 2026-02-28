import os
import pandas as pd
import numpy as np
import psycopg2
import sys

# Configuration
DB_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    return psycopg2.connect(DB_URL)

def run_backtest():
    print("🚀 Starting Alpha-Orion Strategy Backtest...")
    print("---------------------------------------------------")
    
    if not DB_URL:
        print("❌ Error: DATABASE_URL environment variable must be set.")
        print("   Usage: set DATABASE_URL=... && python backtest_strategy.py")
        sys.exit(1)

    conn = None
    try:
        conn = get_db_connection()
        
        # Fetch historical trade data
        # We assume a 'trades' table exists with standard columns
        print("📊 Fetching historical trade data...")
        query = """
            SELECT timestamp, pair, amount_in, amount_out, profit, gas_cost 
            FROM trades 
            ORDER BY timestamp ASC
        """
        
        # Use pandas to load SQL directly into a DataFrame
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            print("⚠️  No historical data found in 'trades' table.")
            print("   Cannot run backtest without data.")
            return

        print(f"✅ Loaded {len(df)} historical trades.")

        # --- Performance Metrics ---
        df['net_profit'] = df['profit'] - df['gas_cost']
        df['cumulative_profit'] = df['net_profit'].cumsum()
        
        total_profit = df['net_profit'].sum()
        winning_trades = df[df['net_profit'] > 0]
        losing_trades = df[df['net_profit'] <= 0]
        
        win_rate = (len(winning_trades) / len(df)) * 100
        avg_profit = df['net_profit'].mean()
        
        # Profit Factor (Gross Profit / Gross Loss)
        gross_profit = winning_trades['net_profit'].sum()
        gross_loss = abs(losing_trades['net_profit'].sum())
        profit_factor = gross_profit / gross_loss if gross_loss != 0 else float('inf')

        print("\n📈 Backtest Results (Historical)")
        print(f"   Total Net Profit:      ${total_profit:,.2f}")
        print(f"   Win Rate:              {win_rate:.2f}%")
        print(f"   Profit Factor:         {profit_factor:.2f}")
        print(f"   Avg Profit/Trade:      ${avg_profit:.2f}")
        
        # --- Scenario Simulation ---
        print("\n🧪 Simulation: High Gas Scenario (+25% Gas Cost)")
        df['sim_net_profit'] = df['profit'] - (df['gas_cost'] * 1.25)
        sim_total_profit = df['sim_net_profit'].sum()
        
        print(f"   Simulated Profit:      ${sim_total_profit:,.2f}")
        delta = ((sim_total_profit - total_profit) / total_profit) * 100
        print(f"   Impact:                {delta:.2f}%")

    except Exception as e:
        print(f"❌ Backtest failed: {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    # Ensure pandas and psycopg2 are installed
    # pip install pandas numpy psycopg2-binary
    run_backtest()