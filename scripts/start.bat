@echo off
REM ╔════════════════════════════════════════════════════════════════════════════════╗
REM ║                                                                                ║
REM ║                   AINEON UNIFIED SYSTEM - STARTUP SCRIPT                       ║
REM ║              Enterprise Flash Loan Engine (Top 0.001% Tier)                    ║
REM ║                                                                                ║
REM ╚════════════════════════════════════════════════════════════════════════════════╝

setlocal enabledelayedexpansion

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo Visit: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════════════════════════╗
echo ║                    AINEON UNIFIED SYSTEM - STARTING                           ║
echo ║                   Top 0.001% Tier Enterprise Engine                          ║
echo ╚════════════════════════════════════════════════════════════════════════════════╝
echo.

REM Check for .env file
if not exist ".env" (
    echo [WARNING] .env file not found
    echo Please copy .env.example to .env and configure your settings:
    echo   - ETH_RPC_URL
    echo   - CONTRACT_ADDRESS
    echo   - WALLET_ADDRESS
    echo   - PRIVATE_KEY
    echo   - PAYMASTER_URL (for gasless mode)
    echo   - BUNDLER_URL (for gasless mode)
    echo.
    pause
    exit /b 1
)

echo [INFO] Environment file found: .env
echo [INFO] Installing dependencies...

REM Install/Update requirements
cd /d "%~dp0"
python -m pip install --upgrade pip >nul 2>&1
python -m pip install -r requirements.txt --quiet

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [INFO] Dependencies installed successfully
echo.
echo [INFO] Starting AINEON Unified System...
echo.

REM Launch the main system
cd core
python main.py

REM If execution stops, show error
if errorlevel 1 (
    echo.
    echo [ERROR] System stopped with error
    pause
)

endlocal
