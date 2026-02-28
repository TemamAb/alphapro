import logging
import sys
import os
from .base_strategy import BaseStrategy

# Dynamically resolve the router module path
# Check multiple possible locations for the router module
possible_paths = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '..', '..', '..'),  # From src/strategies
    '/app',  # Docker container path
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'),  # Relative to strategy file
]

router_imported = False
for path in possible_paths:
    if path not in sys.path:
        sys.path.insert(0, path)
    try:
        from router import MultiDexRouter
        router_imported = True
        break
    except ImportError:
        continue

if not router_imported:
    # Fallback - create a mock router for development
    class MultiDexRouter:
        def get_best_price(self, token_in, token_out, amount):
            return None

class TriangularArbitrage(BaseStrategy):
    def __init__(self):
        super().__init__(
            "Optimized Triangular Arbitrage",
            "Exploits inefficiencies between three different assets in a cycle",
            "Low"
        )
        self.router = MultiDexRouter()
        self.logger = logging.getLogger(__name__)

    async def analyze(self, market_data):
        """
        Analyze market data for triangular arbitrage opportunities.
        Example Path: WETH -> USDC -> DAI -> WETH
        """
        opportunities = []
        # In a real scenario, these would be dynamic based on market_data
        path = [('WETH', 'USDC'), ('USDC', 'DAI'), ('DAI', 'WETH')]
        amount_in = 1.0  # 1 ETH

        try:
            # Leg 1: WETH -> USDC
            quote1 = self.router.get_best_price(path[0][0], path[0][1], amount_in)
            if not quote1: return []
            amount_out1 = float(quote1['best_quote']['output_amount'])

            # Leg 2: USDC -> DAI
            quote2 = self.router.get_best_price(path[1][0], path[1][1], amount_out1)
            if not quote2: return []
            amount_out2 = float(quote2['best_quote']['output_amount'])

            # Leg 3: DAI -> WETH
            quote3 = self.router.get_best_price(path[2][0], path[2][1], amount_out2)
            if not quote3: return []
            amount_out3 = float(quote3['best_quote']['output_amount'])

            # Check Profitability
            if amount_out3 > amount_in:
                profit = amount_out3 - amount_in
                self.logger.info(f"Triangular Opportunity: {profit} ETH profit")
                opportunities.append({
                    "type": "triangular_arbitrage",
                    "path": "WETH->USDC->DAI->WETH",
                    "profit": profit,
                    "quotes": [quote1, quote2, quote3]
                })
        except Exception as e:
            self.logger.error(f"Error in triangular arbitrage analysis: {e}")

        return opportunities

    def execute(self, opportunity):
        self.logger.info(f"Executing Triangular Arbitrage for {opportunity}")
        return {
            "status": "executed",
            "strategy": self.name,
            "opportunity": opportunity,
            "profit": opportunity.get('profit', 0)
        }
