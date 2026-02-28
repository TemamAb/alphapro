# Alpha-Orion Enterprise Platform: User Manual

**Version:** 1.0
**Target Audience:** Traders, Risk Managers, System Administrators

---

## 1. Accessing the Platform

### 1.1 The Dashboard
The unified trading dashboard is the command center for Alpha-Orion.
- **URL:** `https://api.alpha-orion.com` (after DNS cutover) or your Render service URL.
- **Authentication:** Requires a valid JWT token. Use the `npm run utils:token` script to generate one for local access or configure your frontend to handle login.

### 1.2 API Access
For programmatic access (e.g., connecting external trading bots):
- **Base URL:** `https://api.alpha-orion.com/api`
- **Headers:** `Authorization: Bearer <YOUR_TOKEN>`

---

## 2. Core Features

### 2.1 Wallet Management
Navigate to the **Wallets** tab to manage your liquidity pools.
- **Add Wallet:** Click "Add Wallet", enter the address and chain (Ethereum, Polygon, Arbitrum).
- **Monitoring:** The system automatically tracks balances and "Capital Velocity" (rate of capital turnover).
- **Security:** Private keys are **never** entered here. They are stored securely in Render Environment Groups.

### 2.2 Alpha-Copilot (AI Assistant)
The AI Copilot is located in the sidebar. It uses GPT-4o to analyze market conditions.
- **Usage:** Type natural language queries like:
    - *"What is the current Sharpe Ratio?"*
    - *"Analyze the last 10 trades for slippage efficiency."*
    - *"Are there any arbitrage opportunities on Arbitrum right now?"*
- **Context:** The AI is aware of your current PnL, open positions, and system health.

### 2.3 Risk Management
The **Risk Panel** displays real-time metrics calculated by the `RiskEngine`.
- **VaR (Value at Risk):** Shows the potential loss over a specific time frame with 95% confidence.
    - *Green:* Low Risk (<1%)
    - *Red:* High Risk (>2%) - Consider reducing position sizes.
- **Sharpe Ratio:** Measures risk-adjusted return. Target > 2.0.
- **Max Drawdown:** The largest peak-to-trough decline. If this exceeds 5%, the system may trigger a circuit breaker (if configured).

---

## 3. Operational Procedures

### 3.1 Daily Routine
1.  **08:00 UTC:** Check the **Daily Backup** status in GitHub Actions to ensure data safety.
2.  **09:00 UTC:** Review the **Overnight PnL** report in the Dashboard.
3.  **Continuous:** Monitor the **Health Status** indicator (Top Right). It should be `🟢 Active`.

### 3.2 Scaling Up
If traffic or trade volume increases:
1.  Run `python scripts/scale_render_infrastructure.py --plan standard` to upgrade server capacity.
2.  Push the updated `render.yaml` to GitHub.
3.  Render will automatically redeploy with more resources.

### 3.3 Emergency Procedures
**Scenario: Suspected Hack or Critical Bug**
1.  **Pause Trading:** Immediately set `MIN_PROFIT_THRESHOLD` to a high value (e.g., $1,000,000) in Render Environment Variables to stop new trades.
2.  **Rotate Secrets:** Run `python scripts/rotate_jwt_secret.py`.
3.  **Contact Support:** Refer to `docs/DISASTER_RECOVERY_PLAN.md`.

---

## 4. Troubleshooting

| Issue | Probable Cause | Resolution |
| :--- | :--- | :--- |
| **Dashboard shows "Disconnected"** | API is down or Redis is unreachable. | Check `/health` endpoint. Restart services via Render Dashboard. |
| **Trades failing with "Out of Gas"** | Gas price spikes. | The system auto-adjusts, but you may need to increase the `GAS_LIMIT_MULTIPLIER` env var. |
| **AI Copilot not responding** | OpenAI API rate limit or key issue. | Check `OPENAI_API_KEY` in Render secrets. Check OpenAI status page. |

---
*Alpha-Orion Enterprise Documentation*