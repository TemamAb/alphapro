const request = require('supertest');
const app = require('./index');

// Mock dependencies
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

// Mock the profit engine manager to return a mock engine with performance metrics
jest.mock('./profit-engine-manager', () => ({
  getProfitEngine: jest.fn(() => ({
    strategyRegistry: {
      'triangular_arbitrage': { enabled: true },
      'cross_dex_arbitrage': { enabled: true }
    },
    strategies: {
      'triangular_arbitrage': {},
      'cross_dex_arbitrage': {}
    },
    getPerformanceMetrics: jest.fn().mockResolvedValue({
      strategyPerformance: [
        { strategy: 'triangular_arbitrage', avgLatencyMs: '150', mevExposureRate: '0.05' },
        { strategy: 'cross_dex_arbitrage', avgLatencyMs: '200', mevExposureRate: '0.10' }
      ]
    })
  }))
}));

// Mock JWT verification to bypass auth
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, cb) => cb(null, { username: 'test-user', role: 'admin' }))
}));

describe('GET /api/dashboard/strategies', () => {
  it('should return strategies with latency and MEV exposure metrics', async () => {
    // Setup PG mock return values
    const { Pool } = require('pg');
    const pool = new Pool();
    
    // Mock responses for the multiple queries in the endpoint
    pool.query
      .mockResolvedValueOnce({ // Strategy profits
        rows: [
          { strategy: 'triangular_arbitrage', total_profit: '1000' },
          { strategy: 'cross_dex_arbitrage', total_profit: '500' }
        ]
      })
      .mockResolvedValueOnce({ // Top pairs
        rows: []
      })
      .mockResolvedValueOnce({ // Top chains
        rows: []
      })
      .mockResolvedValueOnce({ // Top DEXes
        rows: []
      });

    const res = await request(app)
      .get('/api/dashboard/strategies')
      .set('Authorization', 'Bearer test-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.strategies).toBeDefined();
    expect(res.body.strategies.length).toBeGreaterThan(0);
    
    const triArb = res.body.strategies.find(s => s.name === 'Triangular Arbitrage');
    expect(triArb).toBeDefined();
    expect(triArb).toHaveProperty('avgLatencyMs', 150);
    expect(triArb).toHaveProperty('mevExposureRate', 0.05);
    
    const crossDex = res.body.strategies.find(s => s.name === 'Cross Dex Arbitrage');
    expect(crossDex).toBeDefined();
    expect(crossDex).toHaveProperty('avgLatencyMs', 200);
    expect(crossDex).toHaveProperty('mevExposureRate', 0.10);
  });
});