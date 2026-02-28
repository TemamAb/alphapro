const request = require('supertest');
const axios = require('axios');

// Mock dependencies before requiring the app
jest.mock('axios');
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    duplicate: jest.fn(() => ({
      on: jest.fn(),
      connect: jest.fn(),
      subscribe: jest.fn(),
    })),
    lRange: jest.fn().mockResolvedValue([]),
    isOpen: true,
    isReady: true
  })),
}));

// Mock engine manager to avoid starting the loop or real engine
jest.mock('../../src/profit-engine-manager', () => ({
    getProfitEngine: jest.fn(() => ({
        name: 'StubProfitEngine',
        strategies: {},
        strategyRegistry: {},
        getPerformanceMetrics: jest.fn().mockReturnValue({ totalPnl: 100 })
    }))
}));

const app = require('../../src/index');

describe('Full System Integration Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle a full user session: health -> dashboard -> optimization', async () => {
        // 1. Check System Health
        // Simulates the load balancer or monitoring system checking health
        const healthRes = await request(app).get('/health');
        expect(healthRes.statusCode).toBe(200);
        expect(healthRes.body.status).toMatch(/ok|degraded/);

        // 2. Load Dashboard Stats (Public)
        // Simulates the frontend fetching initial stats
        const statsRes = await request(app).get('/api/dashboard/stats');
        expect(statsRes.statusCode).toBe(200);
        expect(statsRes.body).toHaveProperty('totalPnl');
        expect(statsRes.body).toHaveProperty('systemStatus');

        // 3. Fetch Optimization Metrics (Proxied to AI Service)
        // Simulates the user viewing the Optimization tab
        const mockAiResponse = {
            metrics: {
                gas: { current: 45.0, optimized: 38.5 },
                strategy: { active_adjustments: [] },
                infrastructure: { active_instances: 4, load: 65.2 },
                ai_performance: { accuracy: 0.94, drift_score: 0.02 }
            }
        };
        axios.mockResolvedValue({
            status: 200,
            headers: { 'content-type': 'application/json' },
            data: mockAiResponse
        });

        const optRes = await request(app).get('/apex-optimization/status');
        expect(optRes.statusCode).toBe(200);
        expect(optRes.body.metrics.gas.current).toBe(45.0);
        
        // Verify proxy call was made correctly
        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            url: expect.stringContaining('/apex-optimization/status'),
            method: 'GET'
        }));
    });
});