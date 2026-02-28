import requests
import logging
import os
# API Keys from environment variables
PARASWAP_API_KEY = os.getenv("PARASWAP_API_KEY", "")
UNISWAP_API_KEY = os.getenv("UNISWAP_API_KEY", "")
CURVE_API_KEY = os.getenv("CURVE_API_KEY", "")
BALANCER_API_KEY = os.getenv("BALANCER_API_KEY", "")

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
