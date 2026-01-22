# AINEON Render Deployment Dockerfile
# Lightweight, optimized for Render deployment
# Builds dependencies locally, runs clean on Render

FROM python:3.11-slim

# Set environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install build dependencies for pandas compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install ALL dependencies at build time
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port (Render assigns via $PORT env var)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/health || exit 1

# Start command
CMD ["sh", "-c", "gunicorn main:app --bind 0.0.0.0:${PORT:-10000} --workers 4 --worker-class uvicorn.workers.UvicornWorker --timeout 120 --access-logfile - --error-logfile -"]
