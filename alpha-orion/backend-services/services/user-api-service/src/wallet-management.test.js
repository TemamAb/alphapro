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

// Mock JWT verification
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, cb) => cb(null, { username: 'test-user', role: 'admin' }))
}));

describe('Wallet Management API', () => {
  it('should add a valid wallet', async () => {
    const res = await request(app)
      .post('/api/wallets')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
        chain: 'ethereum'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.wallet).toHaveProperty('id');
    expect(res.body.wallet.address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should reject invalid address', async () => {
    const res = await request(app)
      .post('/api/wallets')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Bad Wallet',
        address: 'invalid-address',
        chain: 'ethereum'
      });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Invalid Ethereum address');
  });

  it('should update a wallet', async () => {
    // First add
    const addRes = await request(app)
      .post('/api/wallets')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Update Me',
        address: '0x1234567890123456789012345678901234567890',
        chain: 'polygon'
      });
    
    const id = addRes.body.wallet.id;

    // Then update
    const updateRes = await request(app)
      .put(`/api/wallets/${id}`)
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Updated Name'
      });

    expect(updateRes.statusCode).toEqual(200);
    expect(updateRes.body.wallet.name).toBe('Updated Name');
  });

  it('should delete a wallet', async () => {
    // First add
    const addRes = await request(app)
      .post('/api/wallets')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Delete Me',
        address: '0x1234567890123456789012345678901234567890',
        chain: 'optimism'
      });
    
    const id = addRes.body.wallet.id;

    // Then delete
    const delRes = await request(app)
      .delete(`/api/wallets/${id}`)
      .set('Authorization', 'Bearer test-token');

    expect(delRes.statusCode).toEqual(200);
  });
});