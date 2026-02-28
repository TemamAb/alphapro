// tests/redis.integration.test.js
const { createClient } = require('redis');

describe('Redis Integration Tests', () => {
  let client;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  beforeAll(async () => {
    client = createClient({ url: redisUrl });
    client.on('error', (err) => console.error('Redis Test Client Error', err));
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  beforeEach(async () => {
    // Clean up before each test
    await client.flushDb();
  });

  it('should set and get a value from Redis', async () => {
    const key = 'test_key';
    const value = 'test_value';
    await client.set(key, value);
    const retrievedValue = await client.get(key);
    expect(retrievedValue).toBe(value);
  });

  it('should correctly store and retrieve dashboard stats', async () => {
    const pnl = 1234.56;
    const trades = 789;

    await client.set('total_pnl', pnl);
    await client.set('total_trades', trades);

    const [retrievedPnl, retrievedTrades] = await Promise.all([
      client.get('total_pnl'),
      client.get('total_trades'),
    ]);

    expect(parseFloat(retrievedPnl)).toBe(pnl);
    expect(parseInt(retrievedTrades, 10)).toBe(trades);
  });

  it('should handle non-existent keys gracefully', async () => {
    const value = await client.get('non_existent_key');
    expect(value).toBeNull();
  });
});