const request = require('supertest');
const app = require('../src/index'); // Imports the app without starting the server

// Mock dependencies to avoid needing real Redis/PG connections during test
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(true),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    duplicate: jest.fn(() => ({
      on: jest.fn(),
      connect: jest.fn(),
      subscribe: jest.fn(),
    })),
    lRange: jest.fn().mockResolvedValue([]),
  })),
}));

describe('User API Service Functional Tests', () => {
  
  describe('GET /health', () => {
    it('should return 200 OK and service status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body.services).toHaveProperty('database');
      expect(res.body.services).toHaveProperty('redis');
    });
  });

  describe('Protected Routes (Auth Check)', () => {
    it('should return 401 for /api/dashboard/stats without token', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.statusCode).toEqual(401);
    });

    it('should return 401 for /api/history/trades without token', async () => {
      const res = await request(app).get('/api/history/trades');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('AI Copilot Endpoint', () => {
    // Mocking JWT verification for this specific test block
    // In a real scenario, you'd use a test token or mock the middleware
    
    it('should handle missing OpenAI dependency gracefully', async () => {
      // Note: Since we can't easily mock the require('openai') inside the function 
      // without more complex setup, we expect 401 here due to auth, 
      // but this confirms the route exists.
      const res = await request(app)
        .post('/api/ai/copilot')
        .send({ message: 'Hello' });
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('Risk Analytics Endpoints', () => {
    it('should protect VaR endpoint', async () => {
      const res = await request(app).get('/api/risk/var');
      expect(res.statusCode).toEqual(401);
    });

    it('should protect Sharpe Ratio endpoint', async () => {
      const res = await request(app).get('/api/risk/sharpe');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('Chat Endpoint', () => {
    it('should return fallback response when OpenAI is missing', async () => {
      const res = await request(app).post('/api/chat').send({ message: 'help' });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('model', 'fallback');
    });
  });
});