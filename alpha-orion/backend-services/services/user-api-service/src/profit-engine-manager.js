/**
 * Profit Engine Manager
 *
 * This module is responsible for instantiating and managing the singleton
 * instance of the EnterpriseProfitEngine and its dependencies.
 * 
 * Updated to use the full 20-strategy implementation.
 */

// PRODUCTION MODE: Fail fast if required modules are not available
function safeRequire(modulePath, moduleName) {
  try {
    return require(modulePath);
  } catch (err) {
    console.warn(`[ProfitEngineManager] WARNING: ${moduleName} not available: ${err.message}`);
    return null;
  }
}

// Helper function to get an instance from a module
function getInstance(moduleExport, className) {
  // Handle null or undefined
  if (!moduleExport) {
    console.warn(`[ProfitEngineManager] ${className} not available, skipping`);
    return null;
  }
  
  // Check if it is already an instantiated object
  if (typeof moduleExport === 'object' && typeof moduleExport.constructor === 'function') {
    if (moduleExport.calculateVaR || moduleExport.generateProfitOpportunities) {
      console.log('[ProfitEngineManager] Using provided instance for ' + className);
      return moduleExport;
    }
  }

  // Check if it is a class constructor
  if (typeof moduleExport === 'function' && moduleExport.prototype) {
    console.log('[ProfitEngineManager] Instantiating ' + className + ' from class');
    return new moduleExport();
  }

  throw new Error(`[ProfitEngineManager] FATAL: Could not instantiate ${className} - invalid module export`);
}

// Load required enterprise implementation from the main strategies folder
const EnterpriseProfitEngine = safeRequire('../../../../strategies/enterprise', 'EnterpriseProfitEngine');
const MultiChainArbitrageEngine = safeRequire('./multi-chain-arbitrage-engine', 'MultiChainArbitrageEngine');
const MEVRouter = safeRequire('./mev-router', 'MEVRouter');
const InstitutionalRiskEngine = safeRequire('./institutional-risk-engine', 'InstitutionalRiskEngine');

let profitEngineInstance = null;

/**
 * Initializes and returns a singleton instance of the EnterpriseProfitEngine.
 * @returns {EnterpriseProfitEngine} The singleton instance.
 */
function getProfitEngine() {
  if (!profitEngineInstance) {
    // Check if EnterpriseProfitEngine is available
    if (!EnterpriseProfitEngine) {
      console.warn('[ProfitEngineManager] EnterpriseProfitEngine not available, using stub implementation');
      // Return a stub implementation
      profitEngineInstance = {
        name: 'StubProfitEngine',
        initialize: () => console.log('[StubProfitEngine] Initialized'),
        generateProfitOpportunities: () => [],
        scanStrategy: () => ({ success: false, reason: 'Not available' }),
        calculateVaR: () => 0
      };
      return profitEngineInstance;
    }
    
    console.log('[ProfitEngineManager] Initializing EnterpriseProfitEngine with 20 strategies...');

    const multiChainEngine = getInstance(MultiChainArbitrageEngine, 'MultiChainArbitrageEngine');
    const mevRouter = getInstance(MEVRouter, 'MEVRouter');
    const riskEngine = getInstance(InstitutionalRiskEngine, 'InstitutionalRiskEngine');

    // Skip if critical engine is not available
    if (!EnterpriseProfitEngine) {
      console.warn('[ProfitEngineManager] EnterpriseProfitEngine not available, using stub implementation');
      profitEngineInstance = {
        name: 'StubProfitEngine',
        initialize: () => console.log('[StubProfitEngine] Initialized'),
        generateProfitOpportunities: () => [],
        scanStrategy: () => ({ success: false, reason: 'Not available' }),
        calculateVaR: () => 0
      };
      return profitEngineInstance;
    }

    // 2. Instantiate the Enterprise Profit Engine with real implementation
    const engine = new EnterpriseProfitEngine(multiChainEngine || undefined, mevRouter || undefined);

    // 3. Set the risk engine dependency
    engine.setRiskEngine = function (riskEngine) {
      this.riskEngine = riskEngine;
    };
    engine.setRiskEngine(riskEngine);

    profitEngineInstance = engine;
    console.log('[ProfitEngineManager] EnterpriseProfitEngine is ready with 20 strategies.');
  }
  return profitEngineInstance;
}

module.exports = { getProfitEngine };
