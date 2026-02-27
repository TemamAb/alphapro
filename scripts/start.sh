#!/bin/bash
# ╔════════════════════════════════════════════════════════════════════════════════╗
# ║                                                                                ║
# ║                   AINEON UNIFIED SYSTEM - STARTUP SCRIPT                       ║
# ║              Enterprise Flash Loan Engine (Top 0.001% Tier)                    ║
# ║                                                                                ║
# ╚════════════════════════════════════════════════════════════════════════════════╝

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════════╗"
echo "║                    AINEON UNIFIED SYSTEM - STARTING                           ║"
echo "║                   Top 0.001% Tier Enterprise Engine                          ║"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Python 3 not found. Please install Python 3.10+"
    echo "Visit: https://www.python.org/downloads/"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Python found: $(python3 --version)"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[WARNING]${NC} .env file not found"
    echo "Please copy .env.example to .env and configure your settings:"
    echo "  - ETH_RPC_URL"
    echo "  - CONTRACT_ADDRESS"
    echo "  - WALLET_ADDRESS"
    echo "  - PRIVATE_KEY"
    echo "  - PAYMASTER_URL (for gasless mode)"
    echo "  - BUNDLER_URL (for gasless mode)"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Environment file found: .env"
echo -e "${GREEN}[INFO]${NC} Installing dependencies..."

# Install/Update requirements
python3 -m pip install --upgrade pip --quiet || true
python3 -m pip install -r requirements.txt --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install dependencies"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Dependencies installed successfully"
echo ""
echo -e "${GREEN}[INFO]${NC} Starting AINEON Unified System..."
echo ""

# Launch the main system
cd core
python3 main.py

# If execution stops, show error
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR]${NC} System stopped with error"
    exit 1
fi
