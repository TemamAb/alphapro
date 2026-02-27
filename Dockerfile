# Canonical Dockerfile for build systems (Render, CI, local Docker)
#
# Render and other environments expect a file named "Dockerfile" at the
# repository root. Historical builds used `Dockerfile.production` but
# the platform now emits an error:
#
#   failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
#
# To guarantee compatibility we provide an explicit Dockerfile here. It is
# functionally identical to `Dockerfile.production` and can be used directly
# for local `docker build` commands or external tooling.
#
# NOTE: Keep this file in sync with Dockerfile.production whenever that file
# changes. We prefer to duplicate the contents rather than add a complex
# include step because many build systems do not support extending another
# Dockerfile path.

# AINEON Flash Loan Engine - Production Deployment
# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies to custom location
RUN pip install --target=/app/lib --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 2: Production Runtime
# ============================================================================

FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from builder
COPY --from=builder /app/lib /app/lib

# Set Python path
ENV PYTHONPATH="/app:/app/lib:${PYTHONPATH}"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Load environment from .env if it exists, otherwise use defaults
# These will be overridden by environment variables at runtime
ENV PORT=8081
ENV ENVIRONMENT=production
ENV NODE_ENV=production

# Copy application code
COPY core/ /app/core/
COPY dashboard/ /app/dashboard/
COPY tools/ /app/tools/
COPY config/ /app/config/
COPY scripts/ /app/scripts/
COPY pyproject.toml /app/
COPY .env.example /app/.env.template

# Create required directories
RUN mkdir -p \
    /app/models \
    /app/logs \
    /app/data \
    /app/cache \
    && chmod -R 755 /app

# Production configuration
RUN echo "import os\n\
os.environ['PYTHONUNBUFFERED'] = '1'\n\
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'\n\
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'\n\
os.environ['ENVIRONMENT'] = 'PRODUCTION'" > /app/prod_init.py

# ============================================================================
# HEALTH CHECK
# ============================================================================

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8081}/health || exit 1

# ============================================================================
# EXPOSE PORTS
# ============================================================================

# API Server
EXPOSE 8081

# Monitoring Server
EXPOSE 8082

# Streamlit Dashboard
EXPOSE 8089

# ============================================================================
# STARTUP SCRIPT
# ============================================================================

RUN cat > /app/start.sh << 'EOF'
#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          AINEON FLASH LOAN ENGINE - PRODUCTION            ║"
echo "║              Enterprise Tier 0.001% System                 ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Validate environment
echo "[1/5] Validating environment configuration..."
if [ -z "$ETH_RPC_URL" ]; then
    echo "ERROR: ETH_RPC_URL not configured"
    exit 1
fi

if [ -z "$WALLET_ADDRESS" ]; then
    echo "ERROR: WALLET_ADDRESS not configured"
    exit 1
fi

echo "   ✓ ETH_RPC_URL configured"
echo "   ✓ WALLET_ADDRESS: ${WALLET_ADDRESS:0:10}..."

# Check RPC connectivity
echo "[2/5] Testing RPC connection..."
python3 << PYEOF
import asyncio
from web3 import Web3

try:
    w3 = Web3(Web3.HTTPProvider("${ETH_RPC_URL}"))
    if w3.is_connected():
        print(f"   ✓ Connected to chain ID: {w3.eth.chain_id}")
    else:
        print("   ✗ RPC connection failed")
        exit(1)
except Exception as e:
    print(f"   ✗ RPC error: {e}")
    exit(1)
PYEOF

# Load profit configuration
echo "[3/5] Loading profit configuration..."
python3 core/profit_earning_config.py

# Show deployment info
echo ""
echo "[4/5] System Configuration:"
echo "   Mode: ENTERPRISE_TIER_0.001%"
echo "   Profit Generation: ENABLED (REAL PROFIT - NO MOCK/SIM)"
echo "   Trading Mode: $([ ! -z "$PRIVATE_KEY" ] && echo 'ACTIVE (Full Execution)' || echo 'PASSIVE (Profit Tracking)')"
echo "   Profit Tracking: ALWAYS ENABLED"
echo "   API Port: ${PORT:-8081}"
echo "   Monitoring Port: 8082"
echo "   Dashboard Port: 8089"

echo "[5/5] Starting AINEON Flash Loan Engine..."
echo ""
exec python3 core/main.py
EOF

chmod +x /app/start.sh

# ============================================================================
# FINAL SETUP
# ============================================================================

# Set working directory
WORKDIR /app

# Run startup script
ENTRYPOINT ["/app/start.sh"]
