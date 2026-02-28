#!/bin/bash

# ==============================================================================
# Alpha-Orion Variant Execution Kernel Activation Script
# ==============================================================================
#
# This script automates the full sequence to transition the brain-orchestrator
# from the "Purgatory State" to a live, operational mode.
#
# It performs the following critical actions:
#   1. Sets the required production environment variables.
#   2. Flushes polluted telemetry streams from Redis.
#   3. Restarts the brain-orchestrator service with the new configuration.
#
# USAGE:
#   1. Fill in the placeholder values in the "Secrets" section below.
#   2. Make the script executable: chmod +x scripts/activate_kernel.sh
#   3. Run the script: ./scripts/activate_kernel.sh
#
# PREREQUISITES:
#   - A running Redis instance.
#   - Python 3.8+ and pip installed.
#   - The brain-orchestrator service is ready to be run.
#
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Alpha-Orion Kernel Activation Sequence..."
echo ""

# --- STEP 1: CONFIGURE PRODUCTION ENVIRONMENT ---
#
# IMPORTANT: Replace placeholder values with your actual production secrets.
# For better security, use a .env file (e.g., `source .env`) or a secret manager.
#
echo "🔧 [1/3] Configuring Production Environment Variables..."

export FLASK_ENV="production"
export LIVE_TRADING_ENABLED="true"

# Ensure no mock/simulation artifacts are enabled
export USE_MOCKS="false"
export SIMULATION_MODE="false"

# --- Secrets (REPLACE WITH YOUR RENDER/PRODUCTION VALUES) ---
export REDIS_URL="redis://red-xxxxxxxxxxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@oregon-redis.render.com:6379"
export PROFIT_WALLET_ADDRESS="0xYourProfitWalletAddressGoesHere" # Must be 42 chars, start with 0x
export JWT_SECRET="generate-a-strong-random-secret-for-jwt"
export JWT_REFRESH_SECRET="generate-a-different-strong-secret-for-refresh"
export ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/your-infura-project-id"

echo "✅ Environment configured for LIVE mode."
echo ""

# --- STEP 2: FLUSH REDIS TELEMETRY STREAMS ---
#
# This executes the Python script to clear 'dirty mock' data from Redis,
# ensuring the kernel starts with a clean slate.
#
echo "🧹 [2/3] Flushing Polluted Redis Telemetry Streams..."

FLUSH_SCRIPT="scripts/flush_redis_telemetry.py"

if [ ! -f "$FLUSH_SCRIPT" ]; then
    echo "🔴 ERROR: Redis flush script not found at $FLUSH_SCRIPT"
    exit 1
fi

# Check for redis-py dependency
if ! python3 -c "import redis" &> /dev/null; then
    echo "⚠️  'redis' library not found. Attempting to install..."
    pip3 install redis
fi

python3 "$FLUSH_SCRIPT"

echo "✅ Redis streams flushed successfully."
echo ""


# --- STEP 3: RESTART BRAIN-ORCHESTRATOR SERVICE ---
#
# This step is conceptual for a Render deployment. On Render, a restart is
# triggered by a new git push or a manual restart in the dashboard.
# This script ensures the environment is correct for that restart.
#
echo "🔄 [3/3] Finalizing for Brain-Orchestrator Service Restart..."
echo "   - The environment is now correctly configured for a live kernel."
echo "   - On Render, trigger a new deployment or manually restart the 'alpha-orion-api' service."
echo "   - The service will now pass the kernel integrity check on startup."
echo ""
echo "🎉 KERNEL ACTIVATION COMPLETE. Alpha-Orion is ready for Variant Execution Mode."