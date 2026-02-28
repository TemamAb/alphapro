/**
 * Risk Engine
 * 
 * Provides risk management calculations including VaR, Sharpe Ratio, and Max Drawdown.
 */

const { redisClient } = require('./redis-client');
const logger = require('./logger');

class RiskEngine {
  constructor() {
    this.confidenceLevel = 0.95; // 95% confidence for VaR
    this.riskFreeRate = 0.02; // 2% annual risk-free rate (approximate)
  }

  /**
   * Calculates Value at Risk (VaR) using the Historical Simulation method.
   * @param {number[]} returns - Array of percentage returns per trade/period
   */
  calculateVaR(returns) {
    if (!returns || returns.length === 0) return { varPercentage: 0, varDollar: 0 };
    
    // Sort returns ascending to find the tail losses
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Find the index corresponding to the confidence level (e.g., bottom 5%)
    const index = Math.floor((1 - this.confidenceLevel) * sortedReturns.length);
    const varValue = sortedReturns[index];
    
    return {
      varPercentage: Math.abs(varValue),
      // Normalized to a hypothetical $100k allocation for display purposes
      varDollar: Math.abs(varValue * 100000) 
    };
  }

  /**
   * Calculates the Sharpe Ratio to measure risk-adjusted return.
   * @param {number[]} returns - Array of percentage returns
   */
  calculateSharpeRatio(returns) {
    if (!returns || returns.length === 0) return 0;

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // Calculate Standard Deviation
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    
    // Annualized Sharpe Ratio (assuming daily returns logic for high-frequency arb)
    // Note: For HFT, time scaling varies, but sqrt(365) is standard for daily.
    return ((meanReturn - (this.riskFreeRate / 365)) / stdDev) * Math.sqrt(365);
  }

  calculateMaxDrawdown(equityCurve) {
    let maxDrawdown = 0;
    let peak = equityCurve[0];

    for (const balance of equityCurve) {
      if (balance > peak) peak = balance;
      const drawdown = (peak - balance) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  /**
   * Main entry point to recalculate and cache metrics.
   * @param {Array} tradeHistory - Array of trade objects { profit, amountIn, ... }
   */
  async updateRiskMetrics(tradeHistory) {
    try {
      if (!tradeHistory || tradeHistory.length === 0) return;

      // 1. Prepare Data
      const returns = tradeHistory.map(t => t.profit / t.amountIn);
      
      let currentEquity = 100000; // Baseline capital
      const equityCurve = [currentEquity];
      for (const t of tradeHistory) {
        currentEquity += t.profit;
        equityCurve.push(currentEquity);
      }

      // 2. Calculate Metrics
      const varMetrics = this.calculateVaR(returns);
      const sharpe = this.calculateSharpeRatio(returns);
      const drawdown = this.calculateMaxDrawdown(equityCurve);

      // 3. Cache in Redis for API consumption
      await redisClient.set('risk_metrics:var', JSON.stringify({
        ...varMetrics,
        interpretation: varMetrics.varPercentage > 0.02 ? "High Risk" : "Moderate Risk"
      }));

      await redisClient.set('risk_metrics:sharpe', JSON.stringify({
        sharpeRatio: sharpe.toFixed(2),
        interpretation: sharpe > 2 ? "Excellent" : (sharpe > 1 ? "Good" : "Poor")
      }));

      await redisClient.set('risk_metrics:drawdown', JSON.stringify({
        maxDrawdown: (drawdown * 100).toFixed(2),
        interpretation: drawdown > 0.1 ? "Critical Drawdown" : "Stable"
      }));

      logger.info('Risk metrics recalculated and cached.');
    } catch (error) {
      logger.error({ err: error }, 'Failed to update risk metrics');
    }
  }
}

// Export the class itself (not an instance) so it can be instantiated
module.exports = RiskEngine;
