FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc python3-dev && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY backend-services/services/brain-orchestrator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared libraries from root (requires build context at project root)
COPY benchmarking_tracker.py /app/benchmarking_tracker.py
COPY router.py /app/router.py

# Copy service code
COPY backend-services/services/brain-orchestrator/src /app/src

# Set Python path to allow imports from root
ENV PYTHONPATH=/app

# Run Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--chdir", "/app/src", "main:app"]