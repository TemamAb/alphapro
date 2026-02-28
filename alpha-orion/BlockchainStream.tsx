import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  Skull, 
  Clock, 
  Link, 
  DollarSign
} from 'lucide-react';

interface BlockchainEvent {
  timestamp: string;
  chain: string;
  type: string;
  details: string;
  value: number;
  txHash: string;
  visuals: {
    color: string;
    icon: string;
  };
}

const BlockchainStream: React.FC = () => {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Mock initial data for visualization if stream is empty
  useEffect(() => {
    const mockEvents: BlockchainEvent[] = [
      {
        timestamp: new Date().toISOString(),
        chain: 'ethereum',
        type: 'Arbitrage Profit',
        details: 'WETH -> USDC',
        value: 1250.50,
        txHash: '0x123...',
        visuals: { color: 'green', icon: 'trending-up' }
      },
      {
        timestamp: new Date(Date.now() - 5000).toISOString(),
        chain: 'arbitrum',
        type: 'Flash Loan',
        details: '1000 ETH Borrow',
        value: 1850000,
        txHash: '0x456...',
        visuals: { color: 'blue', icon: 'zap' }
      },
      {
        timestamp: new Date(Date.now() - 15000).toISOString(),
        chain: 'polygon',
        type: 'Liquidation',
        details: 'Aave V3 Position',
        value: 4500.00,
        txHash: '0x789...',
        visuals: { color: 'purple', icon: 'skull' }
      }
    ];
    setEvents(mockEvents);

    // Connect to WebSocket
    const connectWebSocket = () => {
      // In production, use the actual API URL derived from window location or env
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Connects to same host in unified deployment
      const wsUrl = process.env.REACT_APP_WS_URL || `${protocol}//${host}`; 
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Blockchain Stream Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Validate schema basics
          if (data.type && data.chain && data.visuals) { 
             setEvents(prev => [data, ...prev].slice(0, 50)); // Keep last 50 events
          }
        } catch (e) {
          console.error('Failed to parse blockchain event', e);
        }
      };

      ws.onclose = () => {
        console.log('Blockchain Stream Disconnected, retrying...');
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'trending-up': return <TrendingUp size={14} />;
      case 'zap': return <Zap size={14} />;
      case 'skull': return <Skull size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getChainColor = (chain: string) => {
    switch (chain.toLowerCase()) {
      case 'ethereum': return 'text-blue-400';
      case 'polygon': return 'text-purple-400';
      case 'arbitrum': return 'text-cyan-400';
      case 'optimism': return 'text-red-400';
      case 'bsc': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/80 border-l border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Activity size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Blockchain Stream</h2>
            <p className="text-[10px] text-slate-400">Real-time Network Events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-900/50 border-b border-white/5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        <div className="col-span-2">Time</div>
        <div className="col-span-2">Chain</div>
        <div className="col-span-3">Type</div>
        <div className="col-span-3">Details</div>
        <div className="col-span-2 text-right">Value</div>
      </div>

      {/* Stream List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-white/5">
          {events.map((event, index) => (
            <div 
              key={`${event.txHash}-${index}`} 
              className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/5 transition-colors group"
            >
              {/* Timestamp */}
              <div className="col-span-2 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <Clock size={10} className="text-slate-600" />
                {formatTime(event.timestamp)}
              </div>

              {/* Chain */}
              <div className={`col-span-2 flex items-center gap-1 text-[10px] font-medium capitalize ${getChainColor(event.chain)}`}>
                <Link size={10} />
                {event.chain}
              </div>

              {/* Type */}
              <div className="col-span-3 flex items-center gap-2">
                <div 
                  className={`p-1 rounded bg-${event.visuals.color}-500/10 text-${event.visuals.color}-400 border border-${event.visuals.color}-500/20`}
                  style={{ 
                    backgroundColor: `var(--${event.visuals.color}-500-10, rgba(255,255,255,0.05))`,
                    borderColor: `var(--${event.visuals.color}-500-20, rgba(255,255,255,0.1))`,
                    color: event.visuals.color === 'green' ? '#34d399' : event.visuals.color === 'blue' ? '#60a5fa' : '#c084fc'
                  }}
                >
                  {getIcon(event.visuals.icon)}
                </div>
                <span 
                  className="text-[10px] font-medium"
                  style={{ color: event.visuals.color === 'green' ? '#34d399' : event.visuals.color === 'blue' ? '#60a5fa' : '#c084fc' }}
                >
                  {event.type}
                </span>
              </div>

              {/* Details */}
              <div className="col-span-3 flex items-center text-[10px] text-slate-300 truncate" title={event.details}>
                {event.details}
              </div>

              {/* Value */}
              <div className="col-span-2 flex items-center justify-end gap-1 text-[10px] font-bold text-white">
                {event.value > 0 && <DollarSign size={10} className="text-emerald-500" />}
                ${event.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
          
          {events.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              Waiting for blockchain events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockchainStream;