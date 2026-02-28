FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Copy strategies directory from root level for profit engine
# The code expects ../../../../strategies/enterprise
COPY strategies/ /strategies/

# Expose port 8080
EXPOSE 8080
CMD ["npm", "start"]
