FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc python3-dev && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend-services/services/copilot-agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY backend-services/services/copilot-agent/src /app/src

# Set Python path
ENV PYTHONPATH=/app

# Run Gunicorn (Port 8082 per main.py)
CMD ["gunicorn", "--bind", "0.0.0.0:8082", "--chdir", "/app/src", "main:app"]