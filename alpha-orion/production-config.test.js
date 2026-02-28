const request = require('supertest');
const app = require('../../src/index');

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

describe('Production Configuration Verification', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should correctly identify production mode when keys are present', async () => {
        process.env.NODE_ENV = 'production';
        process.env.WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
        process.env.PIMLICO_API_KEY = 'pim_test_key';
        
        // The /mode/current endpoint calls verifyKernelIntegrity dynamically
        const res = await request(app).get('/mode/current');
        expect(res.body.data.profitMode).toBe('production');
        expect(res.body.data.mode).toBe('Production Mode Live');
    });

    it('should fallback to signal mode if PIMLICO_API_KEY is missing', async () => {
        process.env.NODE_ENV = 'production';
        process.env.WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
        delete process.env.PIMLICO_API_KEY;
        
        const res = await request(app).get('/mode/current');
        expect(res.body.data.profitMode).toBe('signals');
        expect(res.body.data.mode).toBe('Signal Mode');
    });
});