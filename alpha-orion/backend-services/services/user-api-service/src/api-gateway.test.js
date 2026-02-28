const request = require('supertest');
const axios = require('axios');
const app = require('./index');

// Mock dependencies
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

describe('API Gateway Proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should proxy /apex-optimization requests to AI Service', async () => {
    // Mock the response from the Python AI Service
    const mockAiResponse = {
      status: 'success',
      metrics: {
        gas: { current: 50, optimized: 40 }
      }
    };

    axios.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: mockAiResponse
    });

    const res = await request(app).get('/apex-optimization/status');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockAiResponse);
    
    // Verify axios was called with correct URL constructed from env var
    // Note: AI_SERVICE_URL defaults to http://localhost:5000 in index.js if not set
    expect(axios).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('/apex-optimization/status'),
      method: 'GET'
    }));
  });
});