import os

MAIN_PY_PATH = os.path.join("backend-services", "services", "brain-orchestrator", "src", "main.py")

STRATEGY_LOADER_CODE = """
# --- STRATEGY MANAGEMENT ---
from strategies.triangular_arbitrage import TriangularArbitrage

active_strategies = []

def load_strategies():
    global active_strategies
    app.logger.info("Loading Arbitrage Strategies...")
    try:
        # Initialize Strategies
        tri_arb = TriangularArbitrage()
        active_strategies.append(tri_arb)
        
        app.logger.info(f"✅ Loaded {len(active_strategies)} strategies.")
    except Exception as e:
        app.logger.error(f"❌ Failed to load strategies: {e}")

@app.route('/strategies/active', methods=['GET'])
def get_active_strategies():
    return {
        "count": len(active_strategies),
        "strategies": [s.name for s in active_strategies]
    }, 200

# Initialize strategies on startup
with app.app_context():
    load_strategies()
"""

def activate_strategies():
    print(f"🔧 Injecting Strategy Loader into {MAIN_PY_PATH}...")
    
    if not os.path.exists(MAIN_PY_PATH):
        print(f"❌ Error: {MAIN_PY_PATH} not found.")
        return

    # Use utf-8 encoding to read
    with open(MAIN_PY_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    if "def load_strategies():" in content:
        print("ℹ️  Strategies already registered. Skipping.")
        return

    # Append to the end of the file
    # Use utf-8 encoding to write (supports emojis)
    with open(MAIN_PY_PATH, 'a', encoding='utf-8') as f:
        f.write("\n" + STRATEGY_LOADER_CODE)
    
    print("✅ Strategy loader injected successfully.")

if __name__ == "__main__":
    activate_strategies()