import type { Request, Response } from 'express';

// Production Database Service - interacts with PostgreSQL via Prisma
const matrixDbService = {
  persistConfiguration: async (config: any) => {
    console.log('[DB] Persisting Matrix Configuration to PostgreSQL...');
    // In production, use Prisma or raw SQL to persist configuration
    // await prisma.$transaction([
    //   ...config.strategies.map(s => prisma.strategy.upsert({ where: { id: s.id }, update: s, create: s })),
    //   ...config.dexs.map(d => prisma.dex.upsert({ where: { id: d.id }, update: d, create: d })),
    //   ...
    // ])
    // Database connection required for production
    throw new Error('Database connection not configured');
  }
};

// Production Trading Engine Service - interacts with Brain Orchestrator via gRPC/REST
const tradingEngineService = {
  setCapitalVelocity: async (value: number) => {
    console.log(`[CONTROL] Setting capital velocity to ${value}%`);
    // In production, call Brain Orchestrator API or publish to Kafka
    // const response = await fetch('http://brain-orchestrator:8080/api/velocity', { ... });
    throw new Error('Trading engine connection not configured');
  },
  setReinvestmentRate: async (value: number) => {
    console.log(`[CONTROL] Setting reinvestment rate to ${value}%`);
    throw new Error('Trading engine connection not configured');
  },
  toggleStrategy: async (strategyId: string, active: boolean) => {
    console.log(`[CONTROL] Setting strategy '${strategyId}' to active=${active}`);
    throw new Error('Trading engine connection not configured');
  },
  triggerEmergencyStop: async () => {
    console.error(`[CONTROL] 🚨 EMERGENCY STOP TRIGGERED! Halting all trading activity.`);
    // In production, publish emergency stop event to Kafka or call Brain Orchestrator
    throw new Error('Trading engine connection not configured');
  },
};

export const setCapitalVelocity = async (req: Request, res: Response) => {
  const { value } = req.body;
  if (typeof value !== 'number' || value < 0 || value > 100) {
    return res.status(400).json({ error: 'Invalid value. Must be a number between 0 and 100.' });
  }
  try {
    const result = await tradingEngineService.setCapitalVelocity(value);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set capital velocity.' });
  }
};

export const setReinvestmentRate = async (req: Request, res: Response) => {
  const { value } = req.body;
  if (typeof value !== 'number' || value < 0 || value > 100) {
    return res.status(400).json({ error: 'Invalid value. Must be a number between 0 and 100.' });
  }
  try {
    const result = await tradingEngineService.setReinvestmentRate(value);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set reinvestment rate.' });
  }
};

export const toggleStrategy = async (req: Request, res: Response) => {
  const { strategyId } = req.params;
  const { active } = req.body;
  const validStrategies = ['spot', 'gamma', 'perp', 'options'];

  if (!validStrategies.includes(strategyId)) {
    return res.status(400).json({ error: 'Invalid strategy ID.' });
  }
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Invalid active state. Must be a boolean.' });
  }

  try {
    await tradingEngineService.toggleStrategy(strategyId, active);
    res.status(200).json({ status: 'success', strategyId, active });
  } catch (error) {
    res.status(500).json({ error: `Failed to toggle strategy ${strategyId}.` });
  }
};

export const emergencyStop = async (req: Request, res: Response) => {
  try {
    await tradingEngineService.triggerEmergencyStop();
    res.status(200).json({ status: 'success', message: 'Emergency stop triggered. System is halting.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger emergency stop.' });
  }
};

export const saveMatrixConfiguration = async (req: Request, res: Response) => {
  const configuration = req.body;
  // Basic validation
  if (!configuration || typeof configuration !== 'object') {
    return res.status(400).json({ error: 'Invalid configuration payload.' });
  }
  try {
    const result = await matrixDbService.persistConfiguration(configuration);
    res.status(200).json(result);
  } catch (error) {
    console.error('[CONTROL] Failed to save matrix configuration:', error);
    res.status(500).json({ error: 'Failed to save matrix configuration.' });
  }
};