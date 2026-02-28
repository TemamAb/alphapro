# Alpha-Orion Main Dockerfile
# Serves as entry point for Render deployment
# Supports both backend API and dashboard from same repository

# 1. Build Dashboard (Frontend)
FROM node:18-alpine AS dashboard-builder
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm install --legacy-peer-deps
COPY dashboard/ ./
RUN npm run build

# 2. Build & Run Unified Service (Backend + Frontend)
FROM node:18-alpine
WORKDIR /app

# Install Backend Dependencies
WORKDIR /app/backend-services/services/user-api-service
COPY backend-services/services/user-api-service/package*.json ./
RUN npm install --omit=dev

# Copy Backend Source
COPY backend-services/services/user-api-service/ ./

# Copy Strategies
COPY strategies/ /app/strategies/

# Copy Dashboard Build from Builder Stage
# Placed where the backend expects it: ../../../../dashboard/dist relative to src/index.js
COPY --from=dashboard-builder /app/dashboard/dist /app/dashboard/dist

# Environment Configuration
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Start the Unified Gateway
CMD ["node", "src/index.js"]
