# Alpha-Orion User API Service

The **User API Service** is the central nervous system of the Alpha-Orion platform. It handles user authentication, dashboard metrics aggregation, and communicates with the AI Orchestrator and Blockchain Monitor.

## 🏗️ Architecture

- **Runtime**: Node.js v18 (LTS)
- **Database**: PostgreSQL (via Neon/AlloyDB)
 - **Cache/PubSub**: Redis (via Upstash/Render Redis)
- **AI**: OpenAI GPT-4o Integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (optional, for containerized run)
- PostgreSQL & Redis instances (local or cloud)

### Environment Setup
Create a `.env` file in this directory:

```bash
PORT=8080
NODE_ENV=development

# Security
JWT_SECRET=your_local_dev_secret

# Infrastructure
DATABASE_URL=postgresql://user:pass@localhost:5432/alpha_orion
REDIS_URL=redis://localhost:6379

# External APIs
OPENAI_API_KEY=sk-...
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/...
```

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Start Server**
   ```bash
   npm start
   ```

## 🐳 Docker Support

This service includes a multi-stage Dockerfile optimized for production (Render).

**Build:**
```bash
docker build -t alpha-orion-api .
```

**Run:**
```bash
docker run -p 8080:8080 --env-file .env alpha-orion-api
```

## 📦 Deployment (Render)

This service is configured for auto-deployment on Render via the root `render.yaml`.

1. Push changes to `main`.
2. Render detects the `render.yaml`.
3. The `user-api-service` is built using the `starter` plan.
4. Secrets are injected via the `alpha-orion-secrets` Environment Group.

*Maintained by the Alpha-Orion Architecture Team.*