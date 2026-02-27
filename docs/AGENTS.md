# AGENTS.md - Codebase Guide for AI Agents

## Build & Test Commands

```bash
# Run all tests with coverage
pytest tests/ --cov=core --cov=dashboard -v

# Run single test file
pytest tests/test_e2e.py -v

# Run single test class
pytest tests/test_e2e.py::TestUserScenarios -v

# Run single test method
pytest tests/test_e2e.py::TestUserScenarios::test_user_sees_verified_profit_only -v

# Run by marker (unit, integration, e2e, performance, enterprise, etc.)
pytest -m enterprise -v
pytest -m "not slow" -v

# Linting & formatting
black core/ dashboard/
isort core/ dashboard/
flake8 core/ dashboard/
mypy core/ dashboard/

# Start system
python core/unified_system.py  # Main engine
streamlit run dashboard/monitoring_dashboard.py  # Dashboard

# Health check
curl http://localhost:8081/status
```

## Architecture Overview

### Core Components
- **Tier 1 Scanner** (`core/tier_scanner.py`): Monitors 8+ DEXs, scans for flash loan opportunities
- **Tier 2 Orchestrator** (`core/tier_orchestrator.py`): AI-driven routing and decision engine
- **Tier 3 Executor** (`core/tier_executor.py`): Ultra-fast transaction execution (<5ms)
- **Unified System** (`core/unified_system.py`): Integration point for all tiers
- **AI Optimizer** (`core/ai_optimizer.py`): 24/7 learning (every 15 mins), adaptive strategy tuning

### Dashboard & Monitoring
- **Monitoring Dashboard** (`dashboard/monitoring_dashboard.py`): Streamlit real-time UI
- **Data Models** (`dashboard/models.py`): Verified metrics with blockchain validation
- **Validators** (`dashboard/validators.py`): Data validation and consistency checks
- **Blockchain Verifier** (`dashboard/blockchain_verifier.py`): On-chain proof of trades
- **Risk Control** (`dashboard/risk_control_verifier.py`): Position limits, daily loss caps
- **Data Source Manager** (`dashboard/data_source_manager.py`): Multi-source fallback handling

### Infrastructure
- `core/infrastructure/`: Deployment and infra support
- `core/strategies/`: Individual profit strategy implementations
- `core/math/`: Mathematical models and calculations

## Code Style & Conventions

### Python Style
- **Format**: PEP 8 compliant, use spaces (4 spaces per indent)
- **Type Hints**: Use `typing` module (e.g., `Dict`, `Optional`, `List`, `Decimal`)
- **Imports**: Group standard lib → third-party → local; use `from X import Y` style
- **Dataclasses**: Prefer `@dataclass` or Pydantic `BaseModel` over plain classes
- **Decimals**: Use `Decimal` for all financial amounts (never `float`)
- **Datetime**: Use `datetime.datetime`, store UTC with `.isoformat()` for JSON
- **Enums**: Inherit from `Enum` for configuration/status values (e.g., `DataSource`, `VerificationStatus`)

### Naming Conventions
- **Classes**: PascalCase (e.g., `ProfitMetric`, `BlockchainVerifier`)
- **Functions**: snake_case (e.g., `validate_profit_data()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_POSITION_SIZE`)
- **Private**: Leading underscore for internal methods (e.g., `_initialize()`)

### Error Handling
- **Custom Exceptions**: Create project-specific exceptions (e.g., `ValidationError`, `BlockchainVerificationError`)
- **Logging**: Use Python's `logging` module, never print sensitive data (keys, addresses, amounts)
- **Async**: Use `asyncio` with `async/await` for I/O-bound operations (network, blockchain calls)
- **Validation**: Validate early, raise exceptions with clear messages (not silent failures)

### Key Patterns
- **Verified Metrics**: All metrics inherit from `VerifiedMetric` with `source`, `verification_status`, `confidence`
- **Data Sources**: Fallback hierarchy: Backend → Blockchain → Cache
- **Risk Management**: Position caps ($1K-$100M), daily loss limit ($1.5M), slippage caps (0.1%)
- **Tests**: Async tests use `@pytest.mark.asyncio`, use mocks (`unittest.mock`) for external APIs

## Important Files & APIs

- `.env`: Configuration (ETH_RPC_URL, WALLET_ADDRESS, PAYMASTER_URL, BUNDLER_URL, ETHERSCAN_API_KEY)
- `pyproject.toml`: Poetry config with test markers, linting tools, coverage thresholds
- `core/requirements.txt`: Python deps (web3.py, pydantic, pytest, tensorflow)
- `dashboard/requirements.txt`: Dashboard-specific deps (streamlit)

## Environment & Configuration

- **Python**: 3.9+ (Poetry managed)
- **Line Length**: 100 chars (black/isort config)
- **Coverage Minimum**: 95% (fail under policy)
- **Test Markers**: unit, integration, e2e, performance, enterprise, slow, chaos, security, compliance
- **Async**: asyncio_mode="auto" in pytest config

---

**Last Updated**: December 2025 | Version 1.1
