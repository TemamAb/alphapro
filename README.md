# Alpha-Orion Flash Loan Arbitrage Application

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deployment](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
[![CI](https://github.com/TemamAb/alphaorion/actions/workflows/ci.yml/badge.svg)](https://github.com/TemamAb/alphaorion/actions/workflows/ci.yml)

A high-performance, enterprise-grade flash loan arbitrage application designed for a modern, serverless cloud stack. It is deployed on Render and leverages a suite of powerful, scalable, and cost-effective services.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Alpha-Orion is a sophisticated flash loan arbitrage system designed to identify and execute profitable arbitrage opportunities across decentralized exchanges. The application leverages advanced algorithms, real-time market data, and automated execution to maximize returns while minimizing risk on a modern PaaS architecture.

## 🏗️ Architecture

### Technology Stack

- **Backend Services**: Node.js (User API), Python (AI & Blockchain Services)
- **Blockchain**: Solidity, Web3.js, Ethers.js
- **Deployment Platform**: [Render](https://render.com/) (Infrastructure as Code via `render.yaml`)
- **Database**: Neon (Serverless PostgreSQL)
- **Cache & Pub/Sub**: Upstash (Serverless Redis)
- **AI/ML**: OpenAI (GPT-4o for strategy optimization)
- **CI/CD**: GitHub Actions

## ✨ Features

- 🔍 **Market Scanner**: Real-time DEX pair monitoring across multiple chains
- 🤖 **Arbitrage Engine**: Automated opportunity identification and execution
- ⚡ **Flash Loans**: Atomic transaction execution with instant liquidation
- 📊 **Analytics Dashboard**: Real-time P&L tracking and performance metrics
- 🔒 **Risk Management**: Slippage protection and gas optimization
- 🧠 **AI-Powered Copilot**: OpenAI integration for conversational strategy analysis.

## 📋 Prerequisites

### System Requirements

- Node.js 18+ and npm
- Python 3.9+ and pip
- Docker 20+
- Git
- A code editor like VS Code

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/TemamAb/alphaorion.git
   cd alphaorion
   ```

2. **Install Dependencies for each service**
   Navigate into each service directory (e.g., `backend-services/services/user-api-service`) and run:
   ```bash
   npm install 
   # or for Python services
   pip install -r requirements.txt
   ```

3. **Configure Local Environment**
   Create a `.env` file in each service's directory based on the `README.md` within that service.
   ```bash
   # Example for user-api-service
   PORT=8080
   DATABASE_URL=...
   REDIS_URL=...
   ```

4. **Run Services Locally**
   In separate terminals, start each required service.
   ```bash
   # Example for user-api-service
   cd backend-services/services/user-api-service
   npm start
   ```

### Docker Development (Recommended)

To spin up the entire stack (API, Postgres, Redis) with a single command:

1. Ensure Docker Desktop is running.
2. Run:
   ```bash
   ./VERIFY_DOCKER_BUILD.ps1
   ```
   Or manually:
   ```bash
   docker-compose up --build
   ```
3. The API will be available at `http://localhost:8080`.

## 📦 Deployment

This project is configured for **Auto-Deploy on Push** to Render.

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your awesome new feature"
   ```

2. **Push to the `main` branch**
   ```bash
   git push origin main
   ```

3. **Monitor the build on Render**
   Render will automatically detect the push, start a new build based on `render.yaml`, and deploy the services upon success.

## ⚙️ Configuration

All production configuration is managed via **Environment Groups** and **Service-level Environment Variables** in the Render Dashboard. The `render.yaml` file links services to these variables.

**Secrets (e.g., API keys) should NEVER be committed to `render.yaml`.** They must be set securely in the Render dashboard.

## 📊 Monitoring

Application logs, performance metrics, and deployment statuses are available directly within the Render Dashboard for each service. The `user-api-service` exposes a `/health` endpoint which is used by Render for health checks.

## 🔒 Security

- **Secret Management**: Secrets are managed via Render Environment Groups, ensuring they are not exposed in the codebase.
- **CI/CD Pipeline**: The GitHub Actions workflow runs tests on every push, preventing regressions from reaching production.
- **Smart Contracts**: The codebase includes a Hardhat test suite to validate smart contract logic and security.
- **Network**: Render provides automatic SSL for web services and manages network infrastructure.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write comprehensive tests
- Update documentation
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- **Documentation**: [docs.alpha-orion.com](https://docs.alpha-orion.com)
- **Issues**: [GitHub Issues](https://github.com/TemamAb/alphaorion/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TemamAb/alphaorion/discussions)

## 🔄 Version History

### v1.0.0 (Current)
- Initial production release
- Multi-region deployment
- Enterprise security features
- Automated CI/CD pipeline
