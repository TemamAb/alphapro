# Alpha-Orion Render Deployment Guide

## Current Status

**Frontend is LIVE**: https://alpha-orion.onrender.com ✅

**Backend Services**: Require manual deployment via Render Dashboard

---

## Deployment Options

### Option 1: Render Dashboard (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Create Blueprint**:
   - Click "New" → "Blueprint"
   - Select this repository
   - Select the `render.yaml` file
   - Click "Create Blueprint"

3. **Configure Secrets** (Required for production):
   
   Navigate to each service's Environment tab and add:
   
   | Service | Required Secrets |
   |---------|------------------|
   | user-api-service | OPENAI_API_KEY, JWT_SECRET, ETHEREUM_RPC_URL |
   | brain-orchestrator | INFURA_API_KEY, ETHERSCAN_API_KEY, PIMLICO_API_KEY, DEPLOYER_PRIVATE_KEY, PROFIT_WALLET_ADDRESS, ETHEREUM_RPC_URL |
   | copilot-agent | OPENAI_API_KEY |
   | brain-ai-optimizer | OPENAI_API_KEY, ETHEREUM_RPC_URL, ARBITRUM_RPC_URL, OPTIMISM_RPC_URL, ONEINCH_API_KEY |
   | strategies-orchestrator | ETHEREUM_RPC_URL, ARBITRUM_RPC_URL, ONEINCH_API_KEY |
   | blockchain-monitor | ETHEREUM_RPC_URL, ARBITRUM_RPC_URL |

4. **Deploy**: Click "Deploy" for each service

---

### Option 2: GitHub Integration

1. **Connect Repository**:
   - Go to https://dashboard.render.com/
   - Click "New" → "Web Service"
   - Select your GitHub repository
   - Select the appropriate branch (main)

2. **Configure Build**:
   - Build Command: See render.yaml for each service
   - Start Command: See render.yaml for each service

3. **Set Environment Variables**:
   - Add all required secrets (marked as `sync: false` in render.yaml)

---

## Required API Keys

Before activating profit mode, ensure these are configured:

### Blockchain RPC Endpoints
- `ETHEREUM_RPC_URL` - Ethereum mainnet RPC (e.g., Infura, Alchemy)
- `ARBITRUM_RPC_URL` - Arbitrum RPC
- `OPTIMISM_RPC_URL` - Optimism RPC

### API Keys
- `OPENAI_API_KEY` - For AI-powered strategy optimization
- `PIMLICO_API_KEY` - For gasless transactions
- `ONEINCH_API_KEY` - For DEX aggregation

### Wallet Configuration
- `DEPLOYER_PRIVATE_KEY` - Wallet private key for executing trades
- `PROFIT_WALLET_ADDRESS` - Destination wallet for profits

---

## Activate Profit Mode

### Step 1: Verify Services

Check that all services are healthy:
```
https://alpha-orion-api.onrender.com/health
https://alpha-orion-brain.onrender.com/health
https://alpha-orion-ai.onrender.com/health
```

### Step 2: Activate via Dashboard

1. Open https://alpha-orion.onrender.com
2. Navigate to Settings → Profit Mode
3. Click "Activate Profit Engine"
4. Configure withdrawal threshold (default: $1,000)

### Step 3: Activate via API

```bash
curl -X POST https://alpha-orion-brain.onrender.com/api/profit/start
```

---

## Service Endpoints

| Service | URL | Status |
|---------|-----|--------|
| Frontend Dashboard | https://alpha-orion.onrender.com | ✅ Live |
| User API | https://alpha-orion-api.onrender.com | ⏳ Deploy |
| Brain Orchestrator | https://alpha-orion-brain.onrender.com | ⏳ Deploy |
| Copilot Agent | https://alpha-orion-copilot.onrender.com | ⏳ Deploy |
| AI Optimizer | https://alpha-orion-ai.onrender.com | ⏳ Deploy |
| Strategies | https://alpha-orion-strategies.onrender.com | ⏳ Deploy |
| Blockchain Monitor | https://alpha-orion-monitor.onrender.com | ⏳ Deploy |
| Compliance | https://alpha-orion-compliance.onrender.com | ⏳ Deploy |

---

## Cost Estimate (Monthly)

| Resource | Plan | Cost |
|----------|------|------|
| PostgreSQL | Pro | $7/month |
| Redis | Pro | $7/month |
| Web Services | Free | $0 |
| **Total** | | **$14/month** |

---

## Troubleshooting

### Services Not Starting

1. Check logs in Render Dashboard
2. Verify environment variables are set
3. Ensure DATABASE_URL and REDIS_URL are connected

### Profit Mode Not Activating

1. Verify all required secrets are set
2. Check brain-orchestrator logs for errors
3. Ensure wallet address is valid

### API Errors

1. Check health endpoint: `/health`
2. Review service logs
3. Verify network connectivity

---

## Monitoring Profit

After activation, monitor profits at:
- Dashboard: https://alpha-orion.onrender.com
- Live Dashboard: Check port 8888 locally

---

## Next Steps

1. ✅ Code is ready in repository
2. ⏳ Deploy services using render.yaml
3. ⏳ Configure environment variables
4. ⏳ Activate profit mode
5. ⏳ Monitor profit generation
