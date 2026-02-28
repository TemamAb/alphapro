# Alpha-Orion Enterprise Arbitrage Strategies

This folder contains all the enterprise-grade arbitrage strategies integrated in the Alpha-Orion application.

## Implemented Strategies

This document lists the complete set of arbitrage strategies integrated into the Alpha-Orion application.

### Game Changer Strategies (Institutional Alpha)

1.  **LVR Rebalancing (`LVR_REBALANCING`)**
    -   **Description**: A Loss-Versus-Rebalancing strategy that captures the structural rebalancing yield leaked by AMMs to the market.
    -   **Mechanism**: Exploits inefficiencies in LP rebalancing by comparing AMM prices to external CEX prices.

2.  **Oracle Latency Arbitrage (`ORACLE_LATENCY`)**
    -   **Description**: Exploits the time lag between slow on-chain oracle updates (e.g., Chainlink) and rapid, sub-second market movements on CEXs.
    -   **Mechanism**: Capitalizes on stale oracle prices before they are updated on-chain.

3.  **JIT Liquidity (`JIT_LIQUIDITY`)**
    -   **Description**: Just-In-Time Liquidity is an advanced MEV strategy to provide and remove liquidity within the same block to capture trading fees from large swaps.
    -   **Mechanism**: Monitors the mempool for large pending transactions and "sandwiches" them with liquidity provision and removal.

### Core Enterprise Strategies

4.  **Triangular Arbitrage (`TRIANGULAR_ARBITRAGE`)**
    -   **Description**: Multi-hop arbitrage with optimal path finding across three or more tokens (e.g., A -> B -> C -> A).

5.  **Cross-DEX Arbitrage (`CROSS_DEX_ARBITRAGE`)**
    -   **Description**: Exploits price differences for the same asset pair between different DEXes on the same chain (e.g., Uniswap vs. Sushiswap).

6.  **Cross-Chain Arbitrage (`CROSS_CHAIN_ARBITRAGE`)**
    -   **Description**: Capitalizes on price differences for the same asset across different blockchains (e.g., Ethereum vs. Polygon), requiring a bridge for execution.

7.  **Liquidity Pool Arbitrage (`LIQUIDITY_POOL_ARBITRAGE`)**
    -   **Description**: Exploits pricing inefficiencies within a single AMM liquidity pool by trading it against the broader market price.

8.  **MEV Extraction (`MEV_EXTRACTION`)**
    -   **Description**: General MEV strategies including front-running, back-running, and sandwich attacks on profitable opportunities identified in the mempool.

9.  **Statistical Arbitrage (`STATISTICAL_ARBITRAGE`)**
    -   **Description**: Mean-reversion and pairs trading strategies based on statistical models of historically correlated assets.

10. **Order Flow Arbitrage (`ORDER_FLOW_ARBITRAGE`)**
    -   **Description**: Exploits order book imbalances on centralized or decentralized exchanges to predict and capitalize on short-term price movements.

### Advanced & Derivative Strategies

11. **Flash Loan Yield Farming (`FLASH_LOAN_YIELD_FARMING`)**
    -   **Description**: Uses flash loans to leverage high-yield farming positions for optimized, single-transaction returns.

12. **Options Arbitrage (`OPTIONS_ARBITRAGE`)**
    -   **Description**: Exploits mispricing in options contracts, such as violations of put-call parity.

13. **Perpetuals Arbitrage (`PERPETUALS_ARBITRAGE`)**
    -   **Description**: Capitalizes on funding rate differentials and basis trading opportunities in perpetual futures markets.

14. **Gamma Scalping (`GAMMA_SCALPING`)**
    -   **Description**: A delta-neutral options strategy designed to profit from market volatility by hedging gamma exposure.

15. **Delta-Neutral Strategies (`DELTA_NEUTRAL`)**
    -   **Description**: Implements market-neutral portfolio strategies to isolate alpha and hedge against broad market movements.

16. **Batch Auction Arbitrage (`BATCH_AUCTION_ARBITRAGE`)**
    -   **Description**: Identifies and exploits price discrepancies in batch and Dutch auction mechanisms.

## Implementation Details

All 16 strategies are implemented as modular classes within:
- `strategies/enterprise/enterprise-profit-engine.js`

While the `brain-ai-optimization-orchestrator` may leverage these strategies, their core logic resides in the JavaScript engine.
- `backend-services/services/brain-ai-optimization-orchestrator/src/main.py`

## Usage

Import strategies in your application:

```
javascript
const { EnterpriseProfitEngine } = require('./enterprise-profit-engine');
const { MultiChainArbitrageEngine } = require('./multi-chain-arbitrage');
```

## Configuration

Edit `config/strategies.yaml` to enable/disable specific strategies and adjust parameters.
