FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
		PYTHONUNBUFFERED=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential gcc \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt -t /app/_deps

FROM python:3.11-slim

RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app

WORKDIR /app

COPY --from=builder /app/_deps /app/_deps
COPY --chown=app:app src/ ./src/
COPY --chown=app:app requirements.txt ./

ENV PATH="/app/_deps/bin:${PATH}"
ENV PYTHONPATH="/app:${PYTHONPATH}"

RUN mkdir -p /app/logs \
 && chown -R app:app /app

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD curl -f http://localhost:8080/health || exit 1

LABEL org.opencontainers.image.source="https://github.com/iamtemam/alphapro"

CMD ["python", "src/main.py"]
