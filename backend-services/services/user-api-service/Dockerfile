FROM node:18-alpine AS base

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

RUN addgroup -S app && adduser -S -G app app && chown -R app:app /app

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD wget -qO- http://localhost:8080/health || exit 1

LABEL org.opencontainers.image.source="https://github.com/iamtemam/alphapro"

CMD ["npm", "start"]
