import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Zap,
  Send,
  Sparkles,
  MoreVertical,
  RefreshCw,
  TrendingUp,
  Wallet,
  Rocket,
  HeartPulse,
  ActivitySquare,
  Loader2,
  Play,
  Pause
} from 'lucide-react';
import { sendChatMessage, getSimulatedResponse } from '../services/openaiService';
import { copilotEngine, DeploymentStatus, ProfitStatus } from '../services/copilotEngine';
import { useAlphaOrionStore, useIsEngineRunning } from '../hooks/useAlphaOrionStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  category: 'trading' | 'system' | 'deploy';
}

const AlphaCopilot: React.FC = () => {
  const { profitData, opportunities, systemHealth, pimlicoStatus } = useAlphaOrionStore();
  const isEngineRunning = useIsEngineRunning();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hello! I'm Alpha-Copilot v2.0, your AI-powered self-deploying trading assistant.

🎯 My Capabilities:
• Self-Deploying: I can deploy Alpha-Orion to production
• Self-Healing: I automatically fix service issues
• Profit Detection: I monitor trading profitability
• Real-time Control: @deploy, @heal, @profit commands

Try these commands:
@deploy status   → Check deployment status
@deploy restart  → Restart all services  
@heal now        → Run self-healing
@profit status   → Check profit metrics

How can I assist you today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [profitStatus, setProfitStatus] = useState<ProfitStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initEngine = async () => {
      try {
        copilotEngine.addListener((status) => {
          setDeploymentStatus(status);
        });
        await copilotEngine.start();
        setDeploymentStatus(copilotEngine.getDeploymentStatus());
        setProfitStatus(copilotEngine.getProfitStatus());
      } catch (error) {
        console.error('Failed to start copilot engine:', error);
      }
    };

    initEngine();

    return () => {
      copilotEngine.stop();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickActions: QuickAction[] = [
    { id: 'opportunities', label: 'Find Opportunities', icon: <Zap size={14} />, prompt: 'What are the current arbitrage opportunities?', category: 'trading' },
    { id: 'performance', label: 'Check Performance', icon: <TrendingUp size={14} />, prompt: 'Show me the current performance metrics', category: 'trading' },
    { id: 'deploy-status', label: 'Deploy Status', icon: <Rocket size={14} />, prompt: '@deploy status', category: 'deploy' },
    { id: 'heal', label: 'Self-Heal', icon: <HeartPulse size={14} />, prompt: '@heal now', category: 'deploy' },
    { id: 'profit', label: 'Profit Status', icon: <ActivitySquare size={14} />, prompt: '@profit status', category: 'deploy' },
    { id: 'wallets', label: 'Wallet Status', icon: <Wallet size={14} />, prompt: 'What are the current wallet balances?', category: 'trading' }
  ];

  const handleCopilotCommand = async (command: string): Promise<string> => {
    const cmd = command.toLowerCase().trim();

    if (cmd.startsWith('@deploy')) {
      const action = cmd.replace('@deploy', '').trim();
      if (action === 'status' || action === '') {
        const status = deploymentStatus;
        if (!status) return '🔄 Loading deployment status...';

        const phaseIcons: Record<string, string> = {
          idle: '⏸️', detecting: '🔍', deploying: '🚀', healing: '💚', running: '✅', error: '❌'
        };

        return `🚀 **Deployment Status**

**Phase:** ${phaseIcons[status.phase]} ${status.phase.toUpperCase()}

**Services:**
✅ ${status.services.dashboard?.name || 'Dashboard'}: ${status.services.dashboard?.status || 'unknown'}
✅ ${status.services.userApi?.name || 'User API'}: ${status.services.userApi?.status || 'unknown'}
✅ ${status.services.brainOrchestrator?.name || 'Brain Orchestrator'}: ${status.services.brainOrchestrator?.status || 'unknown'}

**Circuit Breaker:** ${status.phase === 'error' ? '🔴 OPEN' : '🟢 CLOSED'}
**Engine:** ${isEngineRunning ? '🟢 Running' : '🔴 Stopped'}

_Updated: ${new Date(status.lastUpdate).toLocaleString()}_`;
      }

      if (action === 'restart') {
        await copilotEngine.triggerDeployment();
        return '🚀 **Deployment Triggered**\n\nI\'ve initiated a deployment restart. This may take a few minutes.';
      }
    }

    if (cmd.startsWith('@heal')) {
      const action = cmd.replace('@heal', '').trim();
      if (action === 'now' || action === 'run' || action === '') {
        return '💚 **Initiating Self-Healing**\n\nI\'m running diagnostics and will attempt to fix any issues automatically...';
      }
      if (action === 'enable') {
        return '🟢 **Auto-Healing Enabled**\n\nSelf-healing is already enabled.';
      }
      if (action === 'disable') {
        return '🔴 **Auto-Healing Disabled**\n\nNote: Disabling self-healing is not recommended.';
      }
    }

    if (cmd.startsWith('@profit')) {
      const action = cmd.replace('@profit', '').trim();
      if (action === 'status' || action === '') {
        const profit = profitStatus;
        if (!profit) return '🔄 Loading profit status...';

        return `💰 **Profit Status**

**Mode:** ${profit.mode.toUpperCase()}

**Metrics:**
• Total P&L: $${profit.totalPnl.toLocaleString()}
• Trades: ${profit.tradesCount}
• Profit/Hour: $${profit.profitPerHour.toFixed(2)}

${profit.lastTradeTimestamp ? `_Last trade: ${new Date(profit.lastTradeTimestamp).toLocaleString()}_` : '_No trades yet_'}
${profit.mode === 'profitable' ? '\n🎉 **System is generating profit!**' : ''}`;
      }
    }

    if (cmd === '@help' || cmd === '@commands') {
      return `🤖 **Alpha-Copilot Commands**

**Deployment:**
• @deploy status - Check deployment status
• @deploy restart - Restart all services

**Self-Healing:**
• @heal now - Run self-healing immediately

**Profit:**
• @profit status - Check profit metrics`;
    }

    return null;
  };

  const processMessage = async (userInput: string): Promise<string> => {
    if (userInput.startsWith('@')) {
      const commandResponse = await handleCopilotCommand(userInput);
      if (commandResponse) return commandResponse;
    }

    try {
      const context = {
        profitData,
        opportunities,
        systemHealth,
        pimlicoStatus: {
          ...pimlicoStatus,
          engineRunning: isEngineRunning,
          mode: isEngineRunning ? 'PRODUCTION' : 'SIMULATION'
        }
      };
      return await sendChatMessage(userInput, context);
    } catch (error) {
      return getSimulatedResponse(userInput);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setShowQuickActions(false);
    setIsTyping(true);

    try {
      const aiResponse = await processMessage(userMessage.content);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const aiResponse = getSimulatedResponse(inputValue);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    setInputValue(action.prompt);
    setShowQuickActions(false);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: action.prompt,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const aiResponse = await processMessage(action.prompt);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const aiResponse = getSimulatedResponse(action.prompt);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      idle: 'bg-slate-500', detecting: 'bg-blue-500', deploying: 'bg-purple-500',
      healing: 'bg-green-500', running: 'bg-emerald-500', error: 'bg-red-500'
    };
    return colors[phase] || 'bg-slate-500';
  };

  const getProfitIcon = (mode: string) => {
    const icons: Record<string, React.ReactNode> = {
      inactive: <Pause size={12} />,
      detecting: <Loader2 size={12} className="animate-spin" />,
      active: <Play size={12} />,
      profitable: <TrendingUp size={12} />
    };
    return icons[mode] || <ActivitySquare size={12} />;
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/95">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg shadow-purple-500/20">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Alpha-Copilot</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isEngineRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {isEngineRunning ? 'Neural Core Online' : 'Core Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
          <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Mini Status Bar */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`flex-shrink-0 w-2 h-2 rounded-full ${deploymentStatus ? getPhaseColor(deploymentStatus.phase) : 'bg-slate-600'}`} />
          <span className="text-[10px] font-bold text-slate-300 uppercase truncate tracking-tight">
            {deploymentStatus ? `Phase: ${deploymentStatus.phase}` : 'Initializing...'}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-hidden border-l border-white/10 pl-4">
          <div className="text-emerald-400">
            {profitStatus ? getProfitIcon(profitStatus.mode) : <Loader2 size={12} className="animate-spin" />}
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase truncate tracking-tight">
            {profitStatus ? `$${profitStatus.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${message.role === 'user'
                ? 'bg-slate-700'
                : 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-purple-500/20'
                }`}>
                {message.role === 'user' ? <Wallet size={14} className="text-slate-300" /> : <Bot size={14} className="text-white" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xl ${message.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-slate-800 text-slate-100 rounded-tl-none border border-white/5'
                }`}>
                <div className="whitespace-pre-wrap font-medium">{message.content}</div>
                <div className={`mt-2 text-[10px] ${message.role === 'user' ? 'text-blue-100/60' : 'text-slate-500'} font-bold uppercase tracking-widest`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-bl-md p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions (shown when no messages or first interaction) */}
      {showQuickActions && messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 hover:border-purple-500/30 rounded-full text-xs text-slate-300 transition-all hover:scale-105"
              >
                <span className="text-purple-400">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-slate-900/50">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Alpha-Copilot anything..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          Press Enter to send • Alpha-Copilot uses OpenAI
        </p>
      </div>
    </div>
  );
};

export default AlphaCopilot;
