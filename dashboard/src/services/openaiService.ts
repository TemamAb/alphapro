/**
 * OpenAI Integration Service for Alpha-Orion Dashboard
 * Replaces Google Gemini with OpenAI API
 */

// Use window.env for environment variables or process.env as fallback
const getEnv = (key: string, fallback: string): string => {
  // @ts-ignore - Vite environment variable
  if (typeof window !== 'undefined' && (window as any).env?.[key]) {
    return (window as any).env[key];
  }
  // @ts-ignore - Vite import.meta.env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[`VITE_${key}`]) {
    return (import.meta as any).env[`VITE_${key}`];
  }
  return fallback;
};

const OPENAI_API_KEY = getEnv('OPENAI_API_KEY', '');
const API_BASE_URL = getEnv('VITE_API_URL', ''); // Use Vite env var

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

/**
 * Send a chat message to OpenAI API via backend proxy
 */
export async function sendChatMessage(
  message: string,
  context?: {
    profitData?: any;
    opportunities?: any[];
    systemHealth?: any;
    pimlicoStatus?: any;
  }
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        model: 'gpt-4o'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || data.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('OpenAI service unavailable. Please configure valid API credentials.');
  }
}

/**
 * Direct OpenAI API call (for use with own API key)
 */
export async function callOpenAI(
  messages: ChatMessage[],
  model: string = 'gpt-4o',
  temperature: number = 0.7
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Get system context for the AI assistant
 */
export function getSystemContext(context?: {
  profitData?: any;
  opportunities?: any[];
  systemHealth?: any;
  pimlicoStatus?: any;
}): string {
  const { profitData, opportunities, systemHealth, pimlicoStatus } = context || {};

  return `You are Alpha-Orion Neural Intelligence Core v3.0, an expert arbitrage trading assistant for decentralized exchanges (DEX).

Your role is to:
1. Analyze market data and identify profitable arbitrage opportunities
2. Evaluate risks and suggest risk mitigation strategies
3. Optimize trading parameters (gas, slippage, route)
4. Monitor multiple DEXs (Uniswap, Sushiswap, Curve, etc.)
5. Provide real-time strategy adjustments
6. Explain MEV protection mechanisms

Current System Status:
${profitData ? `- Total PnL: $${profitData.totalPnL?.toLocaleString() || '0'}` : '- Total PnL: N/A'}
- Active Opportunities: ${opportunities?.filter(o => o.status === 'pending').length || 0}
- System Mode: ${systemHealth?.mode || 'UNKNOWN'}
- System Status: ${systemHealth?.status || 'UNKNOWN'}
- Gasless Transactions: ${pimlicoStatus?.transactionsProcessed || 0}
- Gas Savings: $${pimlicoStatus?.totalGasSavings?.toLocaleString() || '0'}

Your primary goal is to OPTIMIZE trading performance. Provide insights on: Pimlico gasless transactions, cross-chain arbitrage, MEV protection mechanisms (specifically front-running and sandwich attacks), slippage management, and institutional risk management. Focus on actionable recommendations to reduce latency, minimize slippage, maximize spread capture, enhance capital velocity, and increase trade frequency.

Always prioritize safety and risk management.`;
}

/**
 * Fallback simulated responses when API is not available
 */
export function getSimulatedResponse(userInput: string, context?: any): string {
  const input = userInput.toLowerCase();
  const { pimlicoStatus, systemHealth, profitData } = context || {};
  const isProduction = pimlicoStatus?.mode === 'PRODUCTION';

  if (isProduction && (input.includes('status') || input.includes('mode'))) {
    return `⚡ **Alpha-Orion Production Mode Active**
    
    The engine is currently running in **Full Production Mode**. 
    • Strategy Kernel: V08-Elite
    • MEV Protection: Active
    • Capital Velocity: 85%
    
    System is scanning for real-time arbitrage opportunities on Mainnet.`;
  }

  if (input.includes('opportunity') || input.includes('arbitrage') || input.includes('profit')) {
    const oppCount = context?.opportunities?.length || 0;
    const totalPnL = context?.profitData?.totalPnL || 0;

    return `📊 **Operational State Analysis**

Current system telemetry shows **${oppCount} active opportunities** identified by the Variant Execution Kernel.
Total Cumulative PnL is currently **$${totalPnL.toLocaleString()}**.

The engine is operating on **Mainnet** using **Pimlico Gasless Architecture**. 
I am ready to authorize ${oppCount > 0 ? 'immediate execution' : 'further scanning'} protocol.`;
  }

  if (input.includes('wallet') || input.includes('balance')) {
    const totalBalance = context?.totalWalletBalance || 0;
    return `👛 **Treasury Status Report**

The integrated ledger reports a total aggregate liquidity of **$${totalBalance.toLocaleString()}**.
Connectivity to the **Pimlico Gasless Hub** is stable. All executions are currently configured to bypass traditional gas requirements via the Alpha-Policy-ID.`;
  }

  if (input.includes('performance') || input.includes('metric') || input.includes('stat')) {
    const profit = context?.profitData?.totalPnL || 0;
    return `📈 **Real-Time Performance Feed**

The optimization engine reports:
• Cumulative Profit: $${profit.toLocaleString()}
• Engine Mode: ${context?.systemHealth?.mode || 'OFFLINE'}
• MEV Protection: Active (Flashbots/Pimlico Hub)

Wait for live block updates for sub-ms execution metrics.`;
  }

  if (input.includes('strategy') || input.includes('strategies')) {
    return `🧠 **Institutional Strategy Matrix**

The Alpha-Orion kernel is configured for:
• Multi-Chain Arbitrage
• MEV Front-run Protection
• Gasless Execution (via Pimlico)

Connect to the backend cluster to view live strategy allocations.`;
  }

  if (input.includes('help')) {
    return `🤖 **System Command List**

I can facilitate the following professional operations:
• **Market Analysis** - Real-time opportunity scanning
• **Performance Recovery** - Analyze execution latency
• **Treasury Audit** - Verify wallet balances and status
• **Protocol Optimization** - Adjust Pimlico gasless parameters

Please provide a specific query for deep-space telemetry.`;
  }

  return `System Core Online. Observation for: "${userInput}" is pending live mainnet data synchronization. No simulation metrics allowed.`;
}

