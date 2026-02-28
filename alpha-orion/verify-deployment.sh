#!/bin/bash

URL="https://alpha-orion-alpha.onrender.com"

echo "🔍 Verifying Alpha-Orion Production Deployment..."
echo "Target: $URL"
echo "---------------------------------------------"

# 1. Check Health Endpoint (JSON)
echo "1. Checking API Health..."
HEALTH_RESPONSE=$(curl -s "$URL/health")
if [[ $HEALTH_RESPONSE == *"status"* ]]; then
  echo "✅ API Health: OK ($HEALTH_RESPONSE)"
else
  echo "❌ API Health: FAILED (Got: $HEALTH_RESPONSE)"
fi

# 2. Check Dashboard (HTML)
echo "2. Checking Dashboard..."
DASH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/")
if [ "$DASH_CODE" == "200" ]; then
  echo "✅ Dashboard: OK (HTTP 200)"
else
  echo "❌ Dashboard: FAILED (HTTP $DASH_CODE)"
fi

echo "---------------------------------------------"
echo "Done."