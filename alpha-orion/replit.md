# Alpha-Orion

## Overview
Alpha-Orion is an institutional arbitrage control center with a React/TypeScript dashboard frontend and a Node.js/Express backend API service. It provides real-time monitoring, wallet management, blockchain streaming, benchmarking, and trading strategy management.

## Project Architecture

### Frontend (Dashboard)
- **Location**: `dashboard/`
- **Tech**: React 19, TypeScript, Vite 6, Tailwind CSS, Zustand, Recharts
- **Port**: 5000 (development), served via backend in production
- **Entry**: `dashboard/index.html` -> `dashboard/index.tsx` -> `dashboard/src/App.tsx`
- **API Proxy**: Vite dev server proxies `/api/*` and `/health` requests to backend at `localhost:3001` (preserving path prefix)

### Backend (User API Service)
- **Location**: `backend-services/services/user-api-service/`
- **Tech**: Node.js 20, Express 4, PostgreSQL (pg), WebSocket (ws), JWT auth
- **Port**: 3001 (development), 5000 (production)
- **Entry**: `backend-services/services/user-api-service/src/index.js`
- **Database**: PostgreSQL via DATABASE_URL environment variable
- **Optional**: Redis (REDIS_URL), OpenAI (OPENAI_API_KEY)

### Other Services (not active in Replit)
- Various backend services in `backend-services/services/` (blockchain-monitor, brain-orchestrator, etc.)
- `frontend/` directory is a real-time WebSocket streamer service (not the main frontend)

## Key Files
- `dashboard/vite.config.ts` - Vite configuration with proxy settings
- `dashboard/src/services/api.ts` - API client singleton
- `backend-services/services/user-api-service/src/index.js` - Backend entry point
- `backend-services/services/user-api-service/src/database.js` - PostgreSQL connection
- `backend-services/services/user-api-service/src/redis-client.js` - Redis connection (optional)

## Development Setup
- Frontend runs on port 5000 with Vite dev server
- Backend runs on port 3001 with Express
- Vite proxies `/api/*` and `/health` to the backend (preserving path prefix)
- WebSocket proxy at `/ws` to backend

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)
- `PORT` - Backend port (set to 3001 in development)
- `NODE_ENV` - Environment mode
- `REDIS_URL` - Optional Redis connection
- `OPENAI_API_KEY` - Optional OpenAI API key for AI features
- `JWT_SECRET` - JWT signing secret (defaults to dev key)
- `GEMINI_API_KEY` - Optional Google Gemini API key for dashboard

## Recent Changes
- 2026-02-22: Configured for Replit environment
  - Set Vite to port 5000 with allowedHosts enabled
  - Added Vite proxy for API calls (/api -> localhost:3001)
  - Fixed Redis subscriber null check in backend startup
  - Fixed WalletManagement component API import
  - Created PostgreSQL database
  - Configured deployment for autoscale
