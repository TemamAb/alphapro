const { pgPool, connectToDB } = require('../database');
const { connectRedis, redisClient } = require('../redis-client');
const riskEngine = require('../risk-engine');
const logger = require('../logger');

async function runHourlyMaintenance() {
  logger.info('⏰ Starting Hourly Maintenance Job...');

  try {
    // 1. Initialize Connections
    await connectToDB();
    await connectRedis();

    // 2. Fetch Recent Trade History (e.g., last 30 days for risk calc)
    // We need enough data points for meaningful VaR/Sharpe calculation
    const query = `
      SELECT profit, amount_in, timestamp 
      FROM trades 
      WHERE timestamp > NOW() - INTERVAL '30 days'
      ORDER BY timestamp ASC
    `;
    
    const result = await pgPool.query(query);
    const trades = result.rows.map(row => ({
      profit: parseFloat(row.profit),
      amountIn: parseFloat(row.amount_in),
      timestamp: row.timestamp
    }));

    logger.info(`Fetched ${trades.length} trades for risk analysis.`);

    // 3. Update Risk Metrics
    if (trades.length > 0) {
      await riskEngine.updateRiskMetrics(trades);
      logger.info('✅ Risk metrics updated successfully.');
    } else {
      logger.warn('⚠️ No trades found in the last 30 days. Skipping risk update.');
    }

  } catch (error) {
    logger.error({ err: error }, '❌ Hourly job failed.');
    process.exit(1);
  } finally {
    logger.info('🏁 Hourly Maintenance Job Complete.');
    process.exit(0);
  }
}

runHourlyMaintenance();