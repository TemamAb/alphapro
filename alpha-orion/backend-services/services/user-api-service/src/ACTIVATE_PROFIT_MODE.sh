#!/bin/bash
set -e

echo "🚀 ALPHA-ORION: ACTIVATING PROFIT MODE..."
echo "Using Render native secrets for profit generation"

# Check if required environment variables are available (set in Render dashboard)
if [ -z "$PIMLICO_API_KEY" ]; then
    echo "⚠️  PIMLICO_API_KEY not set. Gasless execution will be disabled."
fi

if [ -z "$WALLET_ADDRESS" ]; then
    echo "⚠️  WALLET_ADDRESS not set. Profit destination wallet not configured."
    echo "Please set WALLET_ADDRESS in Render dashboard secrets."
    exit 1
fi

# Validate WALLET_ADDRESS format
if [[ ! "$WALLET_ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo "❌ Invalid WALLET_ADDRESS format. Expected Ethereum address (0x...)"
    exit 1
fi

echo "✅ Profit Mode Configuration:"
echo "   - Wallet Address: ${WALLET_ADDRESS:0:6}...${WALLET_ADDRESS: -4}"
echo "   - Pimlico: $([ -n "$PIMLICO_API_KEY" ] && echo "Enabled" || echo "Disabled")"
echo "   - OpenAI: $([ -n "$OPENAI_API_KEY" ] && echo "Enabled" || echo "Fallback mode")"

# Set profit mode configuration
export PROFIT_MODE=production
export AUTO_WITHDRAWAL_THRESHOLD_USD=1000

# Navigate to the service directory
cd backend-services/services/user-api-service

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting Alpha-Orion Profit Engine..."
npm start
