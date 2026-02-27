# Minimal Dockerfile for the brain service
FROM python:3.11-slim

# install runtime deps
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy and install requirements
COPY backend-services/services/brain-ai-optimization-orchestrator/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# copy application code
COPY backend-services/services/brain-ai-optimization-orchestrator/ /app/

EXPOSE 8080

CMD ["gunicorn", "--workers", "2", "--threads", "4", "--worker-class", "gthread", "src.app:app"]
