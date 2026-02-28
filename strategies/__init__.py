"""
Alpha-Orion Unified Strategies Module
=====================================
This module exports all 16 trading strategies for the Alpha-Orion platform.

Strategies are organized into three tiers:
1. Basic Strategies (6) - Core arbitrage strategies
2. Enterprise Strategies (4) - Advanced institutional-grade strategies  
3. Advanced Strategies (6) - AI/ML-powered strategies

Version: 2.0
Date: February 2026
"""

# Import all base strategy classes from orchestrator
from .orchestrator import (
    BaseStrategy,
    TriangularArbitrage,
    OptionsArbitrage,
    PerpetualsArbitrage,
    GammaScalping,
    DeltaNeutral,
    CrossExchangeArbitrage,
    StatisticalArbitrage,
    BatchAuctionArbitrage,
    PathOptimizationArbitrage,
    CrossAssetArbitrage,
    StrategyOrchestrator,
    StrategyAPI
)

# Advanced strategy imports from brain-ai-optimization-orchestrator
# These are imported with try-except to handle missing dependencies gracefully

try:
    from .advanced_strategies import (
        ArbitrageScanner,
        OptionsArbitrageScanner,
        PerpetualsArbitrageScanner,
        GammaScalpingManager,
        DeltaNeutralManager,
        ApexOptimizer
    )
    ADVANCED_STRATEGIES_AVAILABLE = True
except ImportError as e:
    ADVANCED_STRATEGIES_AVAILABLE = False
    print(f"Warning: Advanced strategies not available: {e}")

# Strategy registry for dynamic loading
STRATEGY_REGISTRY = {
    # Basic Strategies
    'triangular_arbitrage': TriangularArbitrage,
    'options_arbitrage': OptionsArbitrage,
    'perpetuals_arbitrage': PerpetualsArbitrage,
    'gamma_scalping': GammaScalping,
    'delta_neutral': DeltaNeutral,
    'cross_exchange_arbitrage': CrossExchangeArbitrage,
    
    # Enterprise Strategies
    'statistical_arbitrage': StatisticalArbitrage,
    'batch_auction_arbitrage': BatchAuctionArbitrage,
    'path_optimization_arbitrage': PathOptimizationArbitrage,
    'cross_asset_arbitrage': CrossAssetArbitrage,
}

# Strategy categories
BASIC_STRATEGIES = [
    'triangular_arbitrage',
    'options_arbitrage',
    'perpetuals_arbitrage',
    'gamma_scalping',
    'delta_neutral',
    'cross_exchange_arbitrage'
]

ENTERPRISE_STRATEGIES = [
    'statistical_arbitrage',
    'batch_auction_arbitrage',
    'path_optimization_arbitrage',
    'cross_asset_arbitrage'
]

ADVANCED_STRATEGIES = [
    'arbitrage_scanner',
    'options_arbitrage_scanner',
    'perpetuals_arbitrage_scanner',
    'gamma_scalping_manager',
    'delta_neutral_manager',
    'apex_optimizer'
]

# All strategies combined
ALL_STRATEGIES = BASIC_STRATEGIES + ENTERPRISE_STRATEGIES

# Strategy metadata
STRATEGY_METADATA = {
    'triangular_arbitrage': {
        'name': 'Triangular Arbitrage',
        'category': 'basic',
        'risk_level': 'medium',
        'description': 'Exploit price differences between three crypto assets on the same exchange'
    },
    'options_arbitrage': {
        'name': 'Options Arbitrage',
        'category': 'basic',
        'risk_level': 'medium',
        'description': 'Arbitrage opportunities in options pricing across platforms'
    },
    'perpetuals_arbitrage': {
        'name': 'Perpetuals Arbitrage',
        'category': 'basic',
        'risk_level': 'high',
        'description': 'Exploit funding rate differences between perpetual futures and spot'
    },
    'gamma_scalping': {
        'name': 'Gamma Scalping',
        'category': 'basic',
        'risk_level': 'medium',
        'description': 'Dynamic hedging strategy for options portfolios'
    },
    'delta_neutral': {
        'name': 'Delta-Neutral Arbitrage',
        'category': 'basic',
        'risk_level': 'low',
        'description': 'Market-neutral strategy balancing delta exposure'
    },
    'cross_exchange_arbitrage': {
        'name': 'Cross-Exchange Arbitrage',
        'category': 'basic',
        'risk_level': 'medium',
        'description': 'Profit from price differences across different exchanges'
    },
    'statistical_arbitrage': {
        'name': 'Statistical Arbitrage',
        'category': 'enterprise',
        'risk_level': 'medium',
        'description': 'Mathematical/statistical based trading on correlated assets'
    },
    'batch_auction_arbitrage': {
        'name': 'Batch Auction Arbitrage',
        'category': 'enterprise',
        'risk_level': 'low',
        'description': 'Arbitrage in batch auction markets like CoW Protocol'
    },
    'path_optimization_arbitrage': {
        'name': 'Path Optimization Arbitrage',
        'category': 'enterprise',
        'risk_level': 'medium',
        'description': 'Optimize routing across multiple DEXes for best execution'
    },
    'cross_asset_arbitrage': {
        'name': 'Cross-Asset Arbitrage',
        'category': 'enterprise',
        'risk_level': 'high',
        'description': 'Arbitrage across different asset classes (crypto, stocks, forex)'
    },
    'arbitrage_scanner': {
        'name': 'ML Arbitrage Scanner',
        'category': 'advanced',
        'risk_level': 'medium',
        'description': 'Machine learning powered arbitrage opportunity detection'
    },
    'options_arbitrage_scanner': {
        'name': 'Options Arbitrage Scanner',
        'category': 'advanced',
        'risk_level': 'medium',
        'description': 'AI-powered options mispricing detection'
    },
    'perpetuals_arbitrage_scanner': {
        'name': 'Perpetuals Scanner',
        'category': 'advanced',
        'risk_level': 'high',
        'description': 'AI-driven perpetual futures arbitrage'
    },
    'gamma_scalping_manager': {
        'name': 'Gamma Scalping Manager',
        'category': 'advanced',
        'risk_level': 'medium',
        'description': 'Automated gamma scalping with AI hedging'
    },
    'delta_neutral_manager': {
        'name': 'Delta Neutral Manager',
        'category': 'advanced',
        'risk_level': 'low',
        'description': 'AI-powered delta-neutral portfolio management'
    },
    'apex_optimizer': {
        'name': 'Apex Optimizer',
        'category': 'advanced',
        'risk_level': 'medium',
        'description': 'Top-tier optimization engine for maximum efficiency'
    }
}

def get_strategy(strategy_name: str):
    """Get a strategy class by name"""
    return STRATEGY_REGISTRY.get(strategy_name)

def get_all_strategies():
    """Get all available strategy classes"""
    return STRATEGY_REGISTRY

def get_strategies_by_category(category: str):
    """Get all strategies in a specific category"""
    return [s for s, meta in STRATEGY_METADATA.items() if meta['category'] == category]

def get_strategy_metadata(strategy_name: str):
    """Get metadata for a specific strategy"""
    return STRATEGY_METADATA.get(strategy_name)

# Export version
__version__ = '2.0'
__all__ = [
    'BaseStrategy',
    'TriangularArbitrage',
    'OptionsArbitrage',
    'PerpetualsArbitrage',
    'GammaScalping',
    'DeltaNeutral',
    'CrossExchangeArbitrage',
    'StatisticalArbitrage',
    'BatchAuctionArbitrage',
    'PathOptimizationArbitrage',
    'CrossAssetArbitrage',
    'StrategyOrchestrator',
    'StrategyAPI',
    'STRATEGY_REGISTRY',
    'BASIC_STRATEGIES',
    'ENTERPRISE_STRATEGIES',
    'ADVANCED_STRATEGIES',
    'ALL_STRATEGIES',
    'STRATEGY_METADATA',
    'get_strategy',
    'get_all_strategies',
    'get_strategies_by_category',
    'get_strategy_metadata',
    'ADVANCED_STRATEGIES_AVAILABLE'
]
