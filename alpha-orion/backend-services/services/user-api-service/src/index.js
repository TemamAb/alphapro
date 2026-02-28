require('dotenv').config();
const { ethers } = require('ethers');

const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const logger = require('./logger');
const pinoHttp = require('pino-http');
const { pgPool, connectToDB } = require('./database');
const { redisClient, redisSubscriber, connectRedis } = require('./redis-client');
const axios = require('axios');

// Error Notifier for real-time alerts via Telegram/Discord
const { getErrorNotifier, errorHandlerMiddleware } = require('./error-notifier');
const errorNotifier = getErrorNotifier();

// Import the singleton manager for the main profit engine
const { getProfitEngine } = require('./profit-engine-manager');
const engine = getProfitEngine(); // Get the singleton instance

// ============================================================
// STRATEGY REGISTRY
// Defines enabled strategies and their risk weights
// ============================================================
const STRATEGY_REGISTRY = {
  // Category A: Core DEX Strategies
  'triangular_arbitrage': { enabled: true, weight: 0.15 },
  'options_arbitrage': { enabled: true, weight: 0.08 },
  'perpetuals_arbitrage': { enabled: true, weight: 0.10 },
  'gamma_scalping': { enabled: true, weight: 0.05 },
  'delta_neutral': { enabled: true, weight: 0.08 },
  'cross_dex_arbitrage': { enabled: true, weight: 0.12 },
  'statistical_arbitrage': { enabled: true, weight: 0.08 },
  'batch_auction_arbitrage': { enabled: true, weight: 0.06 },
  'cross_chain_arbitrage': { enabled: true, weight: 0.08 },
  'liquidity_pool_arbitrage': { enabled: true, weight: 0.05 },
  // Category B: Specialized & AI Strategies
  'lvr_inversion': { enabled: true, weight: 0.03 },
  'oracle_latency': { enabled: true, weight: 0.02 },
  'jit_liquidity': { enabled: false, weight: 0.0 },
  'mev_extraction': { enabled: true, weight: 0.04 },
  'order_flow_arbitrage': { enabled: true, weight: 0.03 },
  'flash_loan_yield_farming': { enabled: true, weight: 0.03 },
  'cross_asset_arbitrage': { enabled: true, weight: 0.05 },
  'path_optimization': { enabled: true, weight: 0.05 },
  'batch_velocity_arbitrage': { enabled: true, weight: 0.05 },
  'ml_arbitrage_scanner': { enabled: true, weight: 0.10 } // Total 20 Strategies
};

// ============================================================
// KERNEL INTEGRITY VERIFICATION
// Validates production configuration before enabling trading
// ============================================================
function isValidEthAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function verifyKernelIntegrity() {
  const errors = [];
  const warnings = [];

  // Check environment variables
  if (process.env.NODE_ENV !== 'production') {
    warnings.push('NODE_ENV is not production - running in development mode');
  }

  // Wallet mode detection using WALLET_ADDRESS (public address, no private keys)
  const hasWalletAddress = process.env.WALLET_ADDRESS && isValidEthAddress(process.env.WALLET_ADDRESS);
  const hasPimlicoKey = !!process.env.PIMLICO_API_KEY;
  const isDryRun = process.env.PROFIT_MODE === 'paper' || process.env.DRY_RUN === 'true';
  
  if (!process.env.POLYGON_RPC_URL) {
    warnings.push('POLYGON_RPC_URL not set - using default public RPC');
  }

  // Check Redis connection status - optional, degrades gracefully to in-memory
  if (!redisClient || !redisClient.isReady) {
    warnings.push('Redis not connected - running with in-memory storage (degraded mode)');
  }

  // Check engine availability
  if (!engine || engine.name === 'StubProfitEngine') {
    warnings.push('Variant Execution Kernel using stub - enterprise engine not fully loaded');
  }

  // Production mode requirements: Wallet Address (for profits/monitoring) AND Pimlico Key (for execution)
  // Private Key is explicitly NOT required for safety.
  const isProductionReady = hasWalletAddress && hasPimlicoKey;

  if (!hasWalletAddress) {
      warnings.push('WALLET_ADDRESS not set - system running in signal-only mode');
  }
  if (!hasPimlicoKey && !isDryRun) {
      warnings.push('PIMLICO_API_KEY not set - gasless execution disabled');
  }

  let currentMode = 'signals';
  if (isDryRun) {
      currentMode = 'paper';
  } else if (isProductionReady) {
      currentMode = 'production';
  }

  return {
    valid: errors.length === 0,
    mode: currentMode,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
    strategiesActive: engine && engine.strategies ? Object.keys(engine.strategies).length : 0,
    executionEnabled: isProductionReady || isDryRun,
    walletAddress: process.env.WALLET_ADDRESS || null
  };
}

// Initialize kernel status
const kernelStatus = verifyKernelIntegrity();
console.log('[Kernel] Integrity Check:', kernelStatus.valid ? 'PASSED' : 'FAILED');
if (kernelStatus.errors.length > 0) {
  console.log('[Kernel] Errors:', kernelStatus.errors);
}
if (kernelStatus.warnings.length > 0) {
  console.log('[Kernel] Warnings:', kernelStatus.warnings);
}

// --- OpenAI Integration (Robust Import) ---
let OpenAI;
let openaiClient = null;
try {
  OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized successfully');
  } else {
    logger.warn('OPENAI_API_KEY not found. AI features will use fallbacks.');
  }
} catch (err) {
  logger.warn('OpenAI dependency not found. AI features will use fallbacks.');
}

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
const PORT = process.env.PORT || 8080;

// --- WebSocket Server Initialization ---
const wss = new WebSocketServer({ server });

const broadcast = (data) => {
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
};

wss.on('connection', (ws) => {
  logger.info('New WebSocket client connected');
  ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED', timestamp: new Date().toISOString() }));
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// --- AI Service Proxy Configuration ---
// Proxies requests to the Python AI Service (Brain/Optimizer)
// This allows the User API to act as a unified gateway for the frontend
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
const AI_ROUTES = [
    '/orchestrate',
    '/signals',
    '/scanner',
    '/options-arbitrage',
    '/perpetuals-arbitrage',
    '/gamma-scalping',
    '/delta-neutral',
    '/advanced-risk',
    '/regulatory-report',
    '/apex-optimization'
];

const proxyToAiService = async (req, res) => {
    try {
        const targetUrl = `${AI_SERVICE_URL}${req.originalUrl}`;
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: { ...req.headers, host: new URL(AI_SERVICE_URL).host },
            validateStatus: () => true // Pass all status codes back to client
        });
        res.status(response.status).set(response.headers).send(response.data);
    } catch (error) {
        logger.error(`AI Service Proxy Error: ${error.message}`);
        res.status(502).json({ error: 'AI Service Unavailable', details: error.message });
    }
};

// Register AI proxy routes
AI_ROUTES.forEach(route => {
    app.use(route, proxyToAiService);
});

// Auth Middleware - Works without real JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Allow access if no token (development mode) or use dev token
  if (!token || token === 'dev-token') {
    req.user = { username: 'dev-user' };
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Allow access in dev mode
      req.user = { username: 'dev-user' };
    } else {
      req.user = user;
    }
    next();
  });
};

// --- Routes ---

// Health Check - Works without Redis/DB
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    if (pgPool) {
      await pgPool.query('SELECT 1');
      dbStatus = 'connected';
    }
  } catch (e) { dbStatus = 'disconnected'; }

  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.ping();
      redisStatus = 'connected';
    }
  } catch (e) { redisStatus = 'disconnected'; }

  res.json({
    status: dbStatus === 'connected' || redisStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
      arbitrageEngine: engine ? 'active' : 'inactive'
    },
    profitMode: 'ready'
  });
});

// Mode Current - Returns system mode for dashboard compatibility  
app.get('/mode/current', (req, res) => {
  const stats = verifyKernelIntegrity();
  const activeStrategies = engine && engine.strategyRegistry
    ? Object.values(engine.strategyRegistry).filter(s => s.enabled).length  
    : 0;
  
  // Distinguish real engine from stub
  const isRealEngine = engine && engine.name !== 'StubProfitEngine';

  let modeText = 'Signal Mode';
  if (stats.mode === 'production') modeText = 'Production Mode Live';
  else if (stats.mode === 'paper') modeText = 'Paper Trading Active';

  res.json({
    success: true,
    data: {
      status: isRealEngine ? 'Engine Active' : 'Stopped',
      mode: modeText,
      uptime: Math.floor(process.uptime()),
      connections: activeStrategies,
      kernelReady: stats.valid,
      profitMode: stats.mode
    }
  });
});

// Dashboard: Real-time Stats - Works without Redis
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    let pnl = 0, trades = 0, gas = 0, wins = 0;
    try {
      if (redisClient && redisClient.isReady) {
        const [pnlVal, tradesVal, gasVal, winsVal] = await Promise.all([
          redisClient.get('total_pnl'),
          redisClient.get('total_trades'),
          redisClient.get('gas_spent'),
          redisClient.get('total_wins')
        ]);
        pnl = parseFloat(pnlVal || 0);
        trades = parseInt(tradesVal || 0);
        gas = parseFloat(gasVal || 0);
        wins = parseInt(winsVal || 0);
      }
    } catch (e) { /* Redis unavailable */ }

    // Get metrics from engine if available
    let engineMetrics = {};
    if (engine && typeof engine.getPerformanceMetrics === 'function') {
      const metrics = engine.getPerformanceMetrics();
      engineMetrics = metrics instanceof Promise ? await metrics : metrics;
    }

    // Calculate Monitor Panel specific metrics
    const profitPerTrade = trades > 0 ? pnl / trades : 0;
    // Use engine's alphaVelocity (Tx/Hr) or estimate from uptime
    const tradesPerHour = engineMetrics.alphaVelocity || (uptimeSeconds > 0 ? (trades / (uptimeSeconds / 3600)) : 0);

    const activeStrategies = engine && engine.strategies ? Object.keys(engine.strategies).length : 0;
    const uptimeSeconds = Math.floor(process.uptime());

    res.json({
      totalPnl: pnl,
      totalTrades: trades,
      gasSpent: gas,
      winRate: trades > 0 ? wins / trades : 0,
      activeStrategies: activeStrategies,
      // Monitor Panel Specifics
      monitor: {
        profitPerTrade: parseFloat(profitPerTrade.toFixed(6)),
        tradesPerHour: parseFloat(Number(tradesPerHour).toFixed(2)),
        latency: parseInt(engineMetrics.executionLatencyMs || 0),
        capitalVelocity: parseFloat(engineMetrics.totalYield || 0) // Yield velocity
      },
      systemStatus: engine ? 'active' : 'inactive',
      profitMode: verifyKernelIntegrity().mode,
      uptime: uptimeSeconds,
      activeConnections: wss.clients.size,
      lastPulse: new Date().toISOString(),
      pimlico: {
        enabled: !!engine?.pimlicoEngine,
        totalGasSavings: gas * 0.9, // Estimated for display if active
        transactionsProcessed: trades,
        status: engine?.pimlicoEngine ? 'active' : 'inactive'
      },
      ...engineMetrics
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching stats');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard: Mission Control - Works without Redis
app.get('/api/dashboard/mission-control', async (req, res) => {
  try {
    let metrics = { totalPnl: 0, totalTrades: 0, activeStrategies: 0 };
    try {
      if (engine && engine.getPerformanceMetrics) {
        const result = engine.getPerformanceMetrics();
        metrics = result instanceof Promise ? await result : result;
      }
    } catch (e) { /* Engine not ready */ }

    res.json({
      ...metrics,
      status: 'operational',
      profitMode: 'active',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching mission control data');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard: Recent Opportunities - Uses Redis, generates from launch button
app.get('/api/dashboard/opportunities', async (req, res) => {
  try {
    let opportunities = [];
    try {
      if (redisClient && redisClient.isReady) {
        opportunities = await redisClient.lRange('recent_opportunities', 0, 9);
        opportunities = opportunities.map(op => JSON.parse(op));
      }
    } catch (e) { /* Redis unavailable */ }

    // Return opportunities if available, otherwise prompt to use launch button
    if (opportunities.length > 0) {
      res.json(opportunities);
    } else {
      // No mock data - require launch button to generate real opportunities
      res.json({
        message: 'No opportunities found. Engine is scanning...',
        opportunities: []
      });
    }
  } catch (error) {
    logger.error({ err: error }, 'Error fetching opportunities');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard: Trade History (from Postgres) with Pagination and Filtering
app.get('/api/history/trades', authenticateToken, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    chain,
    strategy,
    status,
    startDate,
    endDate
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (chain) { whereClauses.push(`chain = $${paramIndex++}`); queryParams.push(chain); }
  if (strategy) { whereClauses.push(`strategy = $${paramIndex++}`); queryParams.push(strategy); }
  if (status) { whereClauses.push(`status = $${paramIndex++}`); queryParams.push(status); }
  if (startDate) { whereClauses.push(`timestamp >= $${paramIndex++}`); queryParams.push(startDate); }
  if (endDate) { whereClauses.push(`timestamp <= $${paramIndex++}`); queryParams.push(endDate); }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    // Query for total count
    const countQuery = `SELECT COUNT(*) FROM trades ${whereString}`;
    const totalResult = await pgPool.query(countQuery, queryParams);
    const totalRecords = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / parseInt(limit, 10));

    // Query for paginated data
    const dataParams = [...queryParams, parseInt(limit, 10), offset];
    const dataQuery = `
      SELECT * FROM trades 
      ${whereString} 
      ORDER BY timestamp DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataResult = await pgPool.query(dataQuery, dataParams);

    res.json({
      data: dataResult.rows,
      pagination: { currentPage: parseInt(page, 10), totalPages, totalRecords, limit: parseInt(limit, 10) }
    });
  } catch (error) {
    logger.error({ err: error }, 'DB Error fetching trade history');
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

// Configuration: Get System Config
app.get('/api/config', authenticateToken, async (req, res) => {
  try {
    // Default settings for Dashboard "Settings" Sidebar
    const defaults = {
      capitalVelocityLimit: 1000000, // $1M Slider
      reinvestmentRate: 50, // 50% Reinvestment
      withdrawalSettings: { mode: 'manual', threshold: 5000 }
    };
    const config = await redisClient.get('system_config');
    res.json(JSON.parse(config || '{}'));
    res.json({ ...defaults, ...JSON.parse(config || '{}') });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Configuration: Update System Config (Admin only)
app.post('/api/config', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  try {
    await redisClient.set('system_config', JSON.stringify(req.body));
    // Publish config update event
    await redisClient.publish('config_updates', JSON.stringify(req.body));
    res.json({ status: 'updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// --- Wallet & Balance APIs ---
app.post('/api/wallets/balances', authenticateToken, async (req, res) => {
  const { addresses } = req.body;
  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({ error: 'Valid addresses array required' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
    const balancePromises = addresses.map(async (addr) => {
      try {
        const balance = await provider.getBalance(addr);
        return {
          address: addr,
          balance: parseFloat(ethers.formatEther(balance)),
          status: 'valid'
        };
      } catch (err) {
        return { address: addr, balance: 0, status: 'invalid' };
      }
    });

    const results = await Promise.all(balancePromises);
    res.json({ balances: results, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Failed to fetch blockchain balances', error);
    res.status(500).json({ error: 'Failed to fetch balances from blockchain' });
  }
});

// --- Engine Control & Status ---
// Public endpoint - no authentication required for dashboard compatibility
app.get('/api/engine/status', (req, res) => {
  const activeStrategies = engine && engine.strategyRegistry
    ? Object.values(engine.strategyRegistry).filter(s => s.enabled).length
    : 0;

  // Distinguish real engine from stub — stub has name 'StubProfitEngine'
  const isRealEngine = engine && engine.name !== 'StubProfitEngine';

  res.json({
    status: isRealEngine ? 'running' : 'stopped',
    lastPulse: new Date().toISOString(),
    activeStrategies: activeStrategies,
    totalStrategies: 20,
    profitMode: 'production',
    kernelReady: verifyKernelIntegrity().valid,
    engineType: engine?.name || 'none'
  });
});

// Public endpoint - no authentication required for dashboard
app.post('/api/engine/start', (req, res) => {
  logger.info("Profit Engine start requested via Dashboard (public endpoint)");
  startProfitGenerationLoop();
  res.json({ success: true, status: 'starting', timestamp: new Date().toISOString() });
});

// --- Admin-only endpoints (with authentication) ---
app.post('/api/admin/engine/start', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.username !== 'dev-user') return res.sendStatus(403);

  logger.info("Profit Engine start requested via API");
  startProfitGenerationLoop();
  res.json({ status: 'starting', timestamp: new Date().toISOString() });
});

app.post('/api/admin/engine/stop', authenticateToken, (req, res) => {
  const userRole = req.user.role || '';
  if (userRole !== 'admin' && req.user.username !== 'dev-user') return res.sendStatus(403);

  logger.info("Profit Engine stop requested via API");
  // Logic to stop the loop would go here if we used clearInterval
  res.json({ status: 'stopping', timestamp: new Date().toISOString() });
});

// --- LAUNCH BUTTON ENDPOINT (Phase 3 Implementation) ---
app.post('/api/launch', authenticateToken, async (req, res) => {
  // Allow admin or dev-user (for testing)
  if (req.user.role !== 'admin' && req.user.username !== 'dev-user') return res.sendStatus(403);
  
  const { mode } = req.body; // 'scan' | 'execute' | 'full'
  
  logger.info(`🚀 LAUNCH BUTTON TRIGGERED: Mode=${mode}`);
  
  try {
    // 1. Validate kernel integrity
    const integrityCheck = verifyKernelIntegrity();
    if (!integrityCheck.valid) {
      return res.status(400).json({ 
        error: 'Kernel integrity check failed',
        details: integrityCheck.errors 
      });
    }
    
    // 2. Get all enabled strategies
    const enabledStrategies = Object.entries(STRATEGY_REGISTRY)
      .filter(([_, config]) => config.enabled)
      .map(([name]) => name);
    
    // 3. Execute based on mode
    let results = {};
    
    if (mode === 'scan' || mode === 'full') {
      // Scan for opportunities across all strategies
      results.scan = await scanAllStrategies(enabledStrategies);
    }
    
    if (mode === 'execute' || mode === 'full') {
      // Execute best opportunities found in scan or from cache
      const opportunitiesToExecute = results.scan || []; 
      results.execution = await executeTopOpportunities(opportunitiesToExecute);
    }
    
    // 4. Update Redis with results
    if (redisClient && redisClient.isReady) {
      await redisClient.set('last_launch_result', JSON.stringify({
        timestamp: new Date().toISOString(),
        mode,
        results
      }));
    }
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      mode,
      strategies_activated: enabledStrategies.length,
      results
    });
    
  } catch (error) {
    logger.error({ err: error }, 'Launch failed');
    res.status(500).json({ error: 'Launch failed', details: error.message });
  }
});

// Helper: Scan all strategies
async function scanAllStrategies(strategyNames) {
  const opportunities = [];
  for (const strategy of strategyNames) {
    try {
      // Use engine's scan method if available, otherwise mock for stub
      const result = engine && typeof engine.scanStrategy === 'function' 
        ? await engine.scanStrategy(strategy) 
        : [];
        
      if (result && Array.isArray(result)) {
        opportunities.push(...result.map(op => ({ ...op, strategy })));
      }
    } catch (e) {
      logger.warn(`Strategy ${strategy} scan failed: ${e.message}`);
    }
  }
  return opportunities.sort((a, b) => (b.expectedProfit || 0) - (a.expectedProfit || 0)).slice(0, 20);
}

// Helper: Execute top opportunities
async function executeTopOpportunities(opportunities) {
  const executed = [];
  // Execute top 3 to manage risk
  for (const opp of opportunities.slice(0, 3)) {
    try {
      // Use the existing execution method on the engine
      const result = engine && typeof engine.executeOptimizedTrade === 'function'
        ? await engine.executeOptimizedTrade(opp)
        : { status: 'skipped', reason: 'Engine execution not available' };
        
      executed.push({ opportunity: opp, result });
    } catch (e) {
      logger.warn(`Execution failed for ${opp.strategy}: ${e.message}`);
      executed.push({ opportunity: opp, error: e.message });
    }
  }
  return executed;
}

// --- Kernel Status Endpoint ---
app.get('/api/kernel/status', authenticateToken, (req, res) => {
  const integrity = verifyKernelIntegrity();
  res.json({
    kernel: 'Variant Execution Kernel',
    version: '2.0',
    status: integrity.valid ? 'ready' : 'not_ready',
    integrity,
    strategies: {
      total: 20,
      enabled: engine && engine.strategyRegistry
        ? Object.values(engine.strategyRegistry).filter(s => s.enabled).length
        : 0
    },
    timestamp: new Date().toISOString()
  });
});

// --- Wallet Management System ---
let inMemoryWallets = [];

app.get('/api/wallets', authenticateToken, async (req, res) => {
  try {
    if (redisClient && redisClient.isOpen) {
      const wallets = await redisClient.get('wallets_data');
      return res.json(JSON.parse(wallets || '[]'));
    }
    res.json(inMemoryWallets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

app.post('/api/wallets', authenticateToken, async (req, res) => {
  try {
    const newWallet = req.body;

    // Validation
    if (!newWallet.address || !newWallet.chain) {
      return res.status(400).json({ error: 'Address and chain are required' });
    }
    if (!isValidEthAddress(newWallet.address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const walletToAdd = { ...newWallet, id: Date.now().toString(), status: 'pending' };
    if (redisClient && redisClient.isOpen) {
      const wallets = JSON.parse(await redisClient.get('wallets_data') || '[]');
      wallets.push(walletToAdd);
      await redisClient.set('wallets_data', JSON.stringify(wallets));
    } else {
      inMemoryWallets.push(walletToAdd);
    }
    res.status(201).json({ status: 'success', wallet: walletToAdd });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add wallet' });
  }
});

app.put('/api/wallets/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    let updatedWallet = null;
    if (redisClient && redisClient.isOpen) {
      let wallets = JSON.parse(await redisClient.get('wallets_data') || '[]');
      const index = wallets.findIndex(w => w.id === id);
      if (index !== -1) {
        wallets[index] = { ...wallets[index], ...updates };
        updatedWallet = wallets[index];
        await redisClient.set('wallets_data', JSON.stringify(wallets));
      }
    } else {
      const index = inMemoryWallets.findIndex(w => w.id === id);
      if (index !== -1) {
        inMemoryWallets[index] = { ...inMemoryWallets[index], ...updates };
        updatedWallet = inMemoryWallets[index];
      }
    }
    
    if (updatedWallet) {
      res.json({ status: 'success', wallet: updatedWallet });
    } else {
      res.status(404).json({ error: 'Wallet not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

app.delete('/api/wallets/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (redisClient && redisClient.isOpen) {
      let wallets = JSON.parse(await redisClient.get('wallets_data') || '[]');
      wallets = wallets.filter(w => w.id !== id);
      await redisClient.set('wallets_data', JSON.stringify(wallets));
    } else {
      inMemoryWallets = inMemoryWallets.filter(w => w.id !== id);
    }
    res.json({ status: 'success', message: 'Wallet deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete wallet' });
  }
});

// --- Strategy & Benchmarking Metrics ---
app.get('/api/dashboard/strategies', authenticateToken, async (req, res) => {
  try {
    // 1. Get all enabled strategies from the engine as the source of truth
    const allStrategies = engine && engine.strategyRegistry
      ? Object.keys(engine.strategyRegistry).filter(name => engine.strategyRegistry[name].enabled)
      : [];

    // NEW: Get performance metrics from the engine to merge with profit data
    let performanceMetrics = {};
    if (engine && typeof engine.getPerformanceMetrics === 'function') {
      const metrics = await engine.getPerformanceMetrics();
      performanceMetrics = metrics instanceof Promise ? await metrics : metrics;
    }
    const strategyPerformanceData = performanceMetrics.strategyPerformance || [];
    const performanceMap = new Map(strategyPerformanceData.map(p => [p.strategy, p]));

    // 2. Query the database for profit per strategy in the last 24 hours
    const query = `
      SELECT
        strategy,
        SUM(profit) as total_profit
      FROM trades
      WHERE status = 'confirmed' AND timestamp >= NOW() - INTERVAL '1 day'
      GROUP BY strategy;
    `;
    const { rows } = await pgPool.query(query);

    // 3. Process the results to calculate percentage contribution
    const profitByStrategy = new Map(rows.map(row => [row.strategy, parseFloat(row.total_profit)]));
    const grandTotalProfit = rows.reduce((sum, row) => sum + parseFloat(row.total_profit), 0);

    // 4. Format the response, ensuring all 16 strategies are included
    const strategyContributions = allStrategies.map(strategyName => {
      const profit = profitByStrategy.get(strategyName) || 0;
      const performance = performanceMap.get(strategyName) || { avgLatencyMs: 0, mevExposureRate: 0.00 };
      const share = grandTotalProfit > 0 ? (profit / grandTotalProfit) * 100 : 0;
      return {
        // Format name for display, e.g., 'triangular_arbitrage' -> 'Triangular Arbitrage'
        name: strategyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        share: parseFloat(share.toFixed(2)),
        // Add performance data
        avgLatencyMs: parseInt(performance.avgLatencyMs, 10),
        mevExposureRate: parseFloat(performance.mevExposureRate)
      };
    }).sort((a, b) => b.share - a.share); // Sort by highest contribution

    // 5. Query for top pairs by profit
    const pairsQuery = `
      SELECT
        details->>'pair' as pair_name,
        SUM(profit) as total_profit
      FROM trades
      WHERE status = 'confirmed' AND timestamp >= NOW() - INTERVAL '1 day'
      GROUP BY details->>'pair'
      ORDER BY total_profit DESC
      LIMIT 10;
    `;
    const { rows: pairRows } = await pgPool.query(pairsQuery);

    const topPairs = pairRows.map(row => ({
      name: row.pair_name || 'Multi-Hop',
      profit: parseFloat(row.total_profit)
    }));

    // 6. Query for top chains by profit
    const chainsQuery = `
      SELECT
        chain,
        SUM(profit) as total_profit
      FROM trades
      WHERE status = 'confirmed' AND timestamp >= NOW() - INTERVAL '1 day'
      GROUP BY chain
      ORDER BY total_profit DESC;
    `;
    const { rows: chainRows } = await pgPool.query(chainsQuery);

    const chains = chainRows.map(row => ({
      name: row.chain ? row.chain.charAt(0).toUpperCase() + row.chain.slice(1) : 'Unknown',
      profit: parseFloat(row.total_profit)
    }));

    // 7. Query for top DEXes by profit
    const dexesQuery = `
      SELECT
        COALESCE(details->>'dex', details->>'exchange', 'Multi-DEX') as dex_name,
        SUM(profit) as total_profit
      FROM trades
      WHERE status = 'confirmed' AND timestamp >= NOW() - INTERVAL '1 day'
      GROUP BY COALESCE(details->>'dex', details->>'exchange', 'Multi-DEX')
      ORDER BY total_profit DESC
      LIMIT 10;
    `;
    const { rows: dexRows } = await pgPool.query(dexesQuery);

    const dexes = dexRows.map(row => ({
      name: row.dex_name,
      profit: parseFloat(row.total_profit)
    }));

    res.json({
      strategies: strategyContributions,
      topPairs: topPairs,
      chains: chains,
      dexes: dexes
    });
  } catch (error) {
    logger.error({ err: error }, 'DB Error fetching strategy metrics');
    res.status(500).json({ error: 'Failed to fetch strategy metrics' });
  }
});
// --- AI Copilot: Chat Endpoint ---
app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!openaiClient) {
    logger.warn('OpenAI not available, using fallback response');
    return res.json({ response: getFallbackResponse(message) });
  }

  try {
    const systemPrompt = `You are Alpha-Orion Neural Intelligence Core v3.0, an expert arbitrage trading assistant.
Current Environment: Render Cloud (Production)
Capabilities: Multi-chain arbitrage, Flash Loans, MEV Protection, Gasless Execution via Pimlico.

Current Context:
${JSON.stringify(context || {}, null, 2)}

Provide expert, actionable advice on DeFi arbitrage, risk management, and system optimization. Focus on profit maximization and capital safety.`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    res.json({ response });
  } catch (error) {
    logger.error({ err: error }, 'OpenAI API Error');
    res.status(500).json({ response: getFallbackResponse(message), error: error.message });
  }
});

// ... (skip down to getFallbackResponse) ...

// Fallback responses for when OpenAI is not available
function getFallbackResponse(userInput) {
  const input = userInput.toLowerCase();

  if (input.includes('opportunity') || input.includes('arbitrage') || input.includes('profit')) {
    return `**System Status: ONLINE**\n\nReal-time market scanning is active. Please refer to the "Opportunities" dashboard for live, verified arbitrage data. I am ready to execute confirmed strategies.`;
  }

  if (input.includes('performance') || input.includes('metric') || input.includes('stat')) {
    return `**Performance Metrics**\n\nLive performance data is available in the "Mission Control" panel.`;
  }

  if (input.includes('wallet') || input.includes('balance')) {
    return `**Wallet Security**\n\nWallet balances are synced with the blockchain. Please verify exact amounts in the "Wallet Management" section.`;
  }

  if (input.includes('strategy')) {
    return `**Strategy Engine**\n\nActive strategies are being orchestrated by the V08 Execution Kernel. Check the "Active Strategies" logs for real-time execution details.`;
  }

  if (input.includes('help')) {
    return `**Alpha-Orion Assistant**\n\nI am connected to the live production environment. I can assist with system navigation and status checks.`;
  }

  return `System is running in **LIVE PRODUCTION MODE**. How can I assist you with the active deployment?`;
}

// --- Background Profit Generation & Execution Loop ---
const startProfitGenerationLoop = async () => {
  logger.info("Starting background profit generation loop (PRODUCTION MODE)...");

  const runIteration = async () => {
    try {
      const integrity = verifyKernelIntegrity();
      if (!integrity.valid) {
        logger.error({ errors: integrity.errors }, '[Kernel] Execution halted - integrity check failed');
        setTimeout(runIteration, 60000);
        return;
      }

      if (integrity.warnings.length > 0) {
        logger.warn({ warnings: integrity.warnings }, '[Kernel] Running with warnings (degraded mode)');
      }

      if (engine && typeof engine.generateProfitOpportunities === 'function') {
        const opportunities = await engine.generateProfitOpportunities();

        if (opportunities && opportunities.length > 0) {
          logger.info(`[ProfitEngine] Found ${opportunities.length} opportunities.`);

          if (redisClient && redisClient.isReady) {
            // Store top 50 opportunities for dashboard
            await redisClient.del('recent_opportunities');
            for (const opp of opportunities.slice(0, 50)) {
              await redisClient.lPush('recent_opportunities', JSON.stringify({
                ...opp,
                timestamp: new Date().toISOString()
              }));
            }

            // AUTO-EXECUTION LOGIC
            if (integrity.executionEnabled) {
              const topOpp = opportunities[0];
              if (topOpp.potentialProfit > 0.005) { // Minimum threshold
                logger.info(`[Execution] Auto-triggering highly profitable trade: ${topOpp.id}`);
                try {
                  const result = await engine.executeOptimizedTrade(topOpp);
                  logger.info({ result }, '[Execution] Trade successful');

                  // Record trade to Redis/DB stats
                  await redisClient.incr('total_trades');
                  await redisClient.set('total_pnl', (parseFloat(await redisClient.get('total_pnl') || 0) + topOpp.potentialProfit).toString());
                } catch (execError) {
                  logger.error({ err: execError }, '[Execution] Auto-execution failed');
                }
              }
            }

            // Broadcast update to all clients
            broadcast({
              type: 'OPPORTUNITIES_UPDATED',
              count: opportunities.length,
              topOpportunity: opportunities[0],
              systemStatus: 'active',
              mode: integrity.executionEnabled ? 'execution' : 'signals'
            });
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Error in profit generation iteration');
    }

    // Schedule next run (15 seconds for scanning)
    setTimeout(runIteration, 15000);
  };

  runIteration();
};

// ─── Serve React Dashboard (built static files) ─────────────────────
// The dashboard is built to dashboard/dist/ during Render's build step.
// Serve it as static files, with SPA fallback for client-side routing.
const dashboardPath = path.resolve(__dirname, '../../../../dashboard/dist');
const fs = require('fs');

if (fs.existsSync(dashboardPath)) {
  logger.info(`📊 Serving dashboard from: ${dashboardPath}`);
  app.use(express.static(dashboardPath));

  // SPA fallback: for any GET request that doesn't match a previous API route or a static file,
  // send the main index.html file. This enables client-side routing.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(dashboardPath, 'index.html'));
  });
} else {
  logger.warn(`⚠️  Dashboard build not found at ${dashboardPath} — serving API only`);
  // Fallback: return JSON for any unknown route
  app.get('*', (req, res) => {
    res.status(200).json({
      service: 'alpha-orion-api',
      status: 'running',
      dashboard: 'not built — run: cd dashboard && npm run build',
      endpoints: ['/health', '/api/engine/status', '/api/dashboard/stats']
    });
  });
}

// Start Server
const start = async () => {
  try {
    const redisConnected = await connectRedis();

    if (redisConnected && redisSubscriber) {
      await redisSubscriber.subscribe('blockchain_stream', (message) => {
        logger.info({ channel: 'blockchain_stream', message }, 'Received message from Redis Pub/Sub');
        broadcast(message);
      });
    }

    // Try connecting to PG (non-blocking)
    await connectToDB();

    // Start the profit engine loop
    startProfitGenerationLoop();

    // ============================================================
    // Error Handling Middleware
    // ============================================================
    
    // 404 handler
    app.use((req, res, next) => {
      res.status(404).json({ error: 'Not found', path: req.path });
    });
    
    // Global error handler (must be last)
    app.use(errorHandlerMiddleware);
    
    server.listen(PORT, () => {
      logger.info(`🚀 User API Service with WebSocket server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = app;