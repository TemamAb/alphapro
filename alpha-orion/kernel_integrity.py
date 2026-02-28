import os
import sys

def verify_variant_kernel_integrity():
    """
    Enforces strict production standards for the Variant Execution Kernel.

    This function is designed to run at the absolute start of the application
    to validate critical environment settings. It will cause the application
    to exit with a non-zero status code if any check fails, preventing
    the orchestrator from running in a polluted or non-production state.
    """
    print("--- VARIANT EXECUTION KERNEL INTEGRITY CHECK ---")
    errors = []

    # 1. Environment Verification
    # Per convention, FLASK_ENV should be 'production' for production builds.
    if os.getenv("FLASK_ENV") != "production":
        errors.append("FLASK_ENV must be 'production'.")

    # 2. Live Trading Mode Verification
    if os.getenv("LIVE_TRADING_ENABLED") != "true":
        errors.append("LIVE_TRADING_ENABLED must be 'true' to exit Purgatory State.")

    # 3. Mock/Simulation Artifact Detection
    if os.getenv("USE_MOCKS") == "true":
        errors.append("Simulation artifact 'USE_MOCKS' cannot be 'true'.")
    if os.getenv("SIMULATION_MODE") == "true":
        errors.append("Simulation artifact 'SIMULATION_MODE' cannot be 'true'.")

    # 4. Wallet Security Verification
    profit_wallet = os.getenv("PROFIT_WALLET_ADDRESS")
    if not profit_wallet or not profit_wallet.startswith('0x') or len(profit_wallet) != 42:
        errors.append("PROFIT_WALLET_ADDRESS is invalid or missing.")

    if errors:
        print("🔴 KERNEL PANIC: Halting system due to critical configuration errors.", file=sys.stderr)
        for error in errors:
            print(f"   - {error}", file=sys.stderr)
        sys.exit(1)

    print("✅ KERNEL INTEGRITY VERIFIED. System is LIVE.")
    print("--- Transitioning from Purgatory State to Variant Execution Mode ---")