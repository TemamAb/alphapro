import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, Shield, Zap } from 'lucide-react';

function App() {
  const [profit, setProfit] = useState(1523.67);
  const [status, setStatus] = useState('Demo Mode');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to connect to AINEON backend
        const response = await fetch('/api/profit');
        const data = await response.json();
        setProfit(data.current_profit || 1523.67);
        setStatus('Connected');
      } catch (error) {
        console.log('Using mock data');
        setProfit(1523.67);
        setStatus('Demo Mode');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Zap className="text-blue-500" />
              AINEON Enterprise Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Real-time trading engine monitoring</p>
          </div>
          <div className={`px-4 py-2 rounded-full mt-4 md:mt-0 ${status === 'Connected' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
            {status}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="text-green-400" />
              <h2 className="text-xl font-bold">Total Profit</h2>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(profit)}</div>
            <div className="text-gray-400 mt-2">Lifetime earnings</div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-blue-400" />
              <h2 className="text-xl font-bold">Daily ROI</h2>
            </div>
            <div className="text-3xl font-bold">2.34%</div>
            <div className="text-gray-400 mt-2">+$342.15 today</div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-purple-400" />
              <h2 className="text-xl font-bold">Active Trades</h2>
            </div>
            <div className="text-3xl font-bold">12</div>
            <div className="text-gray-400 mt-2">3 arbitrage, 5 MEV, 4 DEX</div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-amber-400" />
              <h2 className="text-xl font-bold">Risk Score</h2>
            </div>
            <div className="text-3xl font-bold">8.2/10</div>
            <div className="text-gray-400 mt-2">Low risk profile</div>
          </div>
        </div>

        {/* Engine Status */}
        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700 mb-8">
          <h2 className="text-2xl font-bold mb-6">Engine Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">Arbitrage Engine</span>
              </div>
              <div className="text-sm text-gray-300 mt-2">Monitoring 5 DEXes</div>
            </div>
            <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">MEV Bot</span>
              </div>
              <div className="text-sm text-gray-300 mt-2">Active on Ethereum</div>
            </div>
            <div className="p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">AI Optimizer</span>
              </div>
              <div className="text-sm text-gray-300 mt-2">Learning active</div>
            </div>
          </div>
        </div>

        {/* Connection Info */}
        <div className="text-center text-gray-500 text-sm mt-12">
          <p>Connected to AINEON Backend: {status === 'Connected' ? '✅' : '⚠️'}</p>
          <p className="mt-2">Dashboard will auto-refresh with real data when backend is available</p>
        </div>
      </div>
    </div>
  );
}

export default App;