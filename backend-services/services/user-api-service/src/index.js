const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Mock data (same as frontend)
const SERVICE_LIST = [
  'user-api-service',
  'eye-scanner',
  'brain-orchestrator',
  'executor',
  'withdrawal-service',
  'ai-optimizer',
  'ai-agent-service',
  'benchmarking-scraper-service',
  'brain-strategy-engine',
  'order-management-service',
  'brain-risk-management',
  'dataflow-market-data-ingestion',
  'dataflow-cep',
  'hand-blockchain-proxy',
  'hand-smart-order-router',
  'brain-ai-optimization-orchestrator',
  'brain-simulation',
];

const REGIONS = ['us-central1', 'europe-west1'];

const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max));
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateService = (name) => ({
  id: name,
  name,
  region: randomElement(REGIONS),
  status: randomElement(['online', 'online', 'online', 'degraded', 'offline']),
  cpuUsage: random(5, 80),
  memoryUsage: random(10, 90),
  lastLog: `[INFO] ${new Date().toISOString()} - Operation successful.`,
});

const generateOpportunity = (id) => ({
  id: `opp-${id}-${Date.now()}`,
  assets: ['ETH', 'USDC'],
  exchanges: ['Uniswap', 'Sushiswap'],
  potentialProfit: random(50, 1500),
  riskLevel: randomElement(['Low', 'Medium', 'High']),
  timestamp: Date.now(),
});

const generateStrategy = (id) => ({
  id: `strat-${id}`,
  name: `Momentum Strategy ${id}`,
  description: 'Trades based on recent price movements.',
  isActive: Math.random() > 0.3,
  pnl: random(-5000, 25000),
  winRate: random(45, 75),
});

const generatePnlData = () => {
  let pnl = 10000;
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    pnl += random(-2000, 3500);
    return {
      time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: pnl,
    };
  });
};

// Endpoints
app.get('/services', (req, res) => {
  const services = SERVICE_LIST.map(generateService);
  res.json(services);
});

app.get('/opportunities', (req, res) => {
  const opportunities = Array.from({ length: 15 }, (_, i) => generateOpportunity(i));
  res.json(opportunities);
});

app.get('/strategies', (req, res) => {
  const strategies = Array.from({ length: 5 }, (_, i) => generateStrategy(i));
  res.json(strategies);
});

app.get('/analytics/pnl', (req, res) => {
  const pnlData = generatePnlData();
  res.json(pnlData);
});

app.get('/analytics/total-pnl', (req, res) => {
  res.json({ totalPnl: 125430.50, totalTrades: 8432 });
});

app.post('/terminal', (req, res) => {
  const { command } = req.body;
  const lowerCmd = command.toLowerCase().trim();
  const responses = {
    'status services': 'All services are online. eye-scanner-us is at 85% CPU.',
    'list opportunities': 'Found 3 new opportunities. Highest potential profit: $1,203 on ETH/USDC (Uniswap -> Sushiswap).',
    'run diagnostics': 'Running diagnostics... All systems nominal. Latency to us-central1: 32ms. Latency to europe-west1: 112ms.',
    'help': 'Available commands: status services, list opportunities, run diagnostics, clear, help. Other commands are sent to the AI agent.',
  };

  if (responses[lowerCmd]) {
    res.json({ response: responses[lowerCmd] });
  } else {
    res.json({ response: `Querying AI agent for "${command}"... The current market sentiment is neutral-positive. I suggest focusing on high-volume pairs to minimize slippage.` });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`User API Service listening on port ${PORT}`);
});
