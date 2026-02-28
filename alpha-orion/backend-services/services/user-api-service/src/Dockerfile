# Use Node.js 18 as the base image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# Copy the entire repository into the container
COPY . .

# 1. Build the Dashboard (Frontend)
WORKDIR /app/dashboard
RUN npm install
RUN npm run build

# 2. Install Backend Dependencies
WORKDIR /app/backend-services/services/user-api-service
RUN npm install

# Expose the port (Render will set PORT env var, defaulting to 8080)
ENV PORT=8080
EXPOSE 8080

# 3. Start the Unified Service
# We stay in the user-api-service directory to ensure relative paths work
WORKDIR /app/backend-services/services/user-api-service
CMD ["node", "src/index.js"]