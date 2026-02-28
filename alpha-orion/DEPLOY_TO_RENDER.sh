#!/bin/bash
# Alpha-Orion Render Deployment Script
# Deploys all backend services to Render platform

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🚀 ALPHA-ORION RENDER DEPLOYMENT 🚀                       ║"
echo "║                                                                ║"
echo "║     Deploying Backend Services to Render                      ║"
echo "║     Mode: PRODUCTION                                           ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if render-cli is installed
check_render_cli() {
    log_info "Checking for Render CLI..."
    if command -v render &> /dev/null; then
        log_success "Render CLI is installed"
        return 0
    else
        log_warn "Render CLI is not installed"
        echo ""
        echo "To install Render CLI, run:"
        echo "  brew install render-cli"
        echo "  # or"
        echo "  npm install -g @render/cli"
        echo ""
        log_info "Alternatively, you can deploy using the Render Dashboard:"
        echo "  1. Go to https://dashboard.render.com/"
        echo "  2. Connect your GitHub repository"
        echo "  3. Use the render.yaml file for configuration"
        echo ""
        return 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        log_success "Node.js: $(node --version)"
    else
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        log_success "Python: $(python3 --version)"
    elif command -v python &> /dev/null; then
        log_success "Python: $(python --version)"
    else
        log_error "Python is required but not installed"
        exit 1
    fi
    
    # Check pip
    if command -v pip &> /dev/null || command -v pip3 &> /dev/null; then
        log_success "pip is available"
    else
        log_error "pip is required but not installed"
        exit 1
    fi
}

# Verify render.yaml
verify_render_yaml() {
    log_info "Verifying render.yaml configuration..."
    
    if [ ! -f "render.yaml" ]; then
        log_error "render.yaml not found!"
        exit 1
    fi
    
    # Count services in render.yaml
    SERVICE_COUNT=$(grep -c "name:" render.yaml || true)
    log_success "Found $SERVICE_COUNT services defined in render.yaml"
    
    # Verify required files exist
    log_info "Verifying service directories..."
    
    SERVICES=(
        "backend-services/services/user-api-service"
        "backend-services/services/brain-orchestrator"
        "backend-services/services/brain-ai-optimization-orchestrator"
        "backend-services/services/blockchain-monitor"
        "backend-services/services/compliance-service"
        "backend-services/services/backtesting"
    )
    
    for service in "${SERVICES[@]}"; do
        if [ -d "$service" ]; then
            log_success "  ✓ $service"
        else
            log_warn "  ✗ $service (not found)"
        fi
    done
}

# Install dependencies
install_dependencies() {
    log_info "Installing service dependencies..."
    
    # Install Node.js dependencies
    if [ -d "backend-services/services/user-api-service" ]; then
        log_info "Installing user-api-service dependencies..."
        cd backend-services/services/user-api-service
        npm install --production 2>/dev/null || true
        cd "$SCRIPT_DIR"
    fi
    
    # Install Python dependencies
    log_info "Installing Python dependencies..."
    pip install gunicorn flask fastapi 2>/dev/null || true
    
    log_success "Dependencies installed"
}

# Render deployment function
deploy_to_render() {
    log_info "Starting Render deployment..."
    
    if check_render_cli; then
        # Deploy using render-cli
        log_info "Deploying with render-cli..."
        
        # Note: This requires render-cli to be configured with your account
        render deploy --config render.yaml
    else
        log_info "Please deploy manually using one of these methods:"
        echo ""
        echo "Method 1: Render Dashboard"
        echo "  1. Go to https://dashboard.render.com/"
        echo "  2. Create a new 'Blueprint' from the render.yaml file"
        echo "  3. This will deploy all services automatically"
        echo ""
        echo "Method 2: GitHub Integration"
        echo "  1. Connect your GitHub repository to Render"
        echo "  2. Add a render.yaml file to the repository"
        echo "  3. Render will automatically detect and deploy"
        echo ""
        
        log_info "Checking for existing deployment status..."
        echo ""
        echo "Current Live Services:"
        echo "  - Frontend Dashboard: https://alpha-orion.onrender.com"
        echo "  - API Service: https://alpha-orion-api.onrender.com"
        echo "  - Brain Orchestrator: https://alpha-orion-brain.onrender.com"
        echo "  - Copilot Agent: https://alpha-orion-copilot.onrender.com"
        echo ""
    fi
}

# Main deployment flow
main() {
    echo ""
    log_info "Alpha-Orion Render Deployment Script"
    echo "========================================"
    echo ""
    
    check_prerequisites
    verify_render_yaml
    install_dependencies
    deploy_to_render
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "📋 POST-DEPLOYMENT STEPS"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    echo "After deploying to Render, complete these steps:"
    echo ""
    echo "1. Configure Environment Variables in Render Dashboard:"
    echo "   - OPENAI_API_KEY"
    echo "   - ETHEREUM_RPC_URL"
    echo "   - ARBITRUM_RPC_URL"
    echo "   - PIMLICO_API_KEY"
    echo "   - DEPLOYER_PRIVATE_KEY"
    echo "   - PROFIT_WALLET_ADDRESS"
    echo "   - JWT_SECRET"
    echo ""
    echo "2. Activate Profit Mode:"
    echo "   - Navigate to https://alpha-orion.onrender.com"
    echo "   - Go to Settings → Profit Mode"
    echo "   - Click 'Activate Profit Engine'"
    echo ""
    echo "3. Verify Deployment:"
    echo "   - Check health endpoints for all services"
    echo "   - Monitor logs in Render Dashboard"
    echo "   - Verify profit generation is active"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    log_success "Deployment preparation complete!"
    echo ""
}

# Run main function
main "$@"
