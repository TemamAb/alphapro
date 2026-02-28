import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 50 },  // Ramp up to 50 users over 1 minute
    { duration: '1m', target: 50 },  // Stay at 50 users for 1 minute (Sustained Load)
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500'], 
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
// To test protected routes, pass a valid JWT token via environment variable:
// k6 run -e JWT_TOKEN=... k6_script.js
const JWT_TOKEN = __ENV.JWT_TOKEN; 

export default function () {
  // 1. Test Public Health Endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 
    'Health check status is 200': (r) => r.status === 200,
    'Health check duration < 200ms': (r) => r.timings.duration < 200
  });

  // 2. Test Protected Dashboard Endpoint (if token provided)
  if (JWT_TOKEN) {
    const params = {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const statsRes = http.get(`${BASE_URL}/api/dashboard/stats`, params);
    check(statsRes, { 'Dashboard stats status is 200': (r) => r.status === 200 });
  }

  sleep(1); // Think time between requests
}