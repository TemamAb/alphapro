import os

# --- 1. Router Content ---
ROUTER_CONTENT = r'''import requests
import logging
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MultiDexRouter:
    """
    Multi-DEX Router to find the best price across Uniswap, Curve, Balancer, and ParaSwap.
    Ported from enterprise templates.
    """
    def __init__(self):
        self.dexes = {
            'uniswap': {'url': 'https://api.uniswap.org/v2/', 'method': 'uniswapV4'},
            'curve': {'url': 'https://api.curve.fi/', 'method': 'curveStable'},
            'balancer': {'url': 'https://api.balancer.fi/', 'method': 'balancerWeighted'},
            'paraswap': {'url': 'https://apiv5.paraswap.io/', 'method': 'paraswap'},
        }

    def get_best_price(self, token_in: str, token_out: str, amount: int):
        """
        Aggregates quotes from multiple sources and returns the best execution path.
        """
        quotes = []
        
        # 1. Uniswap
        try:
            q = self.get_uniswap_quote(token_in, token_out, amount)
            if q: quotes.append(q)
        except Exception as e:
            logging.warning(f"Uniswap quote error: {e}")

        # 2. Curve
        try:
            q = self.get_curve_quote(token_in, token_out, amount)
            if q: quotes.append(q)
        except Exception as e:
            logging.warning(f"Curve quote error: {e}")

        # 3. Balancer
        try:
            q = self.get_balancer_quote(token_in, token_out, amount)
            if q: quotes.append(q)
        except Exception as e:
            logging.warning(f"Balancer quote error: {e}")

        # 4. ParaSwap (Aggregator)
        try:
            q = self.get_paraswap_quote(token_in, token_out, amount)
            if q: quotes.append(q)
        except Exception as e:
            logging.warning(f"ParaSwap quote error: {e}")

        if not quotes:
            logging.error("No valid quotes received.")
            return None

        # Sort by output amount (descending)
        quotes.sort(key=lambda x: float(x['output_amount']), reverse=True)
        best = quotes[0]

        logging.info(f"Best price found: {best['dex']} -> {best['output_amount']}")

        return {
            'best_quote': best,
            'alternatives': quotes[1:],
            'savings': self.calculate_slippage_savings(quotes)
        }

    def get_uniswap_quote(self, token_in, token_out, amount):
        url = 'https://api.uniswap.org/v2/quote'
        params = {'tokenIn': token_in, 'tokenOut': token_out, 'amount': amount, 'slippageTolerance': '0.5'}
        try:
            resp = requests.get(url, params=params, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                return {'dex': 'uniswap', 'output_amount': data.get('quote', 0)}
        except Exception: pass
        return None

    def get_curve_quote(self, token_in, token_out, amount):
        url = 'https://api.curve.fi/v1/markets/swap'
        params = {'from': token_in, 'to': token_out, 'amount': amount}
        try:
            resp = requests.get(url, params=params, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                return {'dex': 'curve', 'output_amount': data.get('outputAmount', 0)}
        except Exception: pass
        return None

    def get_balancer_quote(self, token_in, token_out, amount):
        url = 'https://api.balancer.fi/v1/swap'
        payload = {'tokenIn': token_in, 'tokenOut': token_out, 'amount': amount}
        try:
            resp = requests.post(url, json=payload, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                return {'dex': 'balancer', 'output_amount': data.get('quotedAmount', 0)}
        except Exception: pass
        return None

    def get_paraswap_quote(self, token_in, token_out, amount):
        url = 'https://apiv5.paraswap.io/prices'
        params = {'srcToken': token_in, 'destToken': token_out, 'amount': amount, 'side': 'SELL', 'network': 1}
        try:
            resp = requests.get(url, params=params, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                return {'dex': 'paraswap', 'output_amount': data.get('priceRoute', {}).get('destAmount', 0)}
        except Exception: pass
        return None

    def calculate_slippage_savings(self, quotes):
        if len(quotes) < 2: return 0
        best = float(quotes[0]['output_amount'])
        worst = float(quotes[-1]['output_amount'])
        return best - worst
'''

# --- 2. Strategy Loader Code ---
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

def fix_all():
    print("🔧 Starting Emergency Fix...")
    
    # 1. Create router.py
    with open("router.py", "w", encoding="utf-8") as f:
        f.write(ROUTER_CONTENT)
    print("✅ router.py created.")

    # 2. Patch main.py
    main_py_path = os.path.join("backend-services", "services", "brain-orchestrator", "src", "main.py")
    if os.path.exists(main_py_path):
        with open(main_py_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "def load_strategies():" not in content:
            with open(main_py_path, "a", encoding="utf-8") as f:
                f.write("\n" + STRATEGY_LOADER_CODE)
            print("✅ main.py patched.")
        else:
            print("ℹ️  main.py already patched.")
    else:
        print(f"❌ {main_py_path} not found!")

if __name__ == "__main__":
    fix_all()