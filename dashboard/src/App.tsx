import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AlphaCopilot from './components/AlphaCopilot';
import Settings from './components/Settings';
import DataHydrator from './components/DataHydrator';
import { copilotEngine } from './services/copilotEngine';
import { useAlphaOrionStore } from './hooks/useAlphaOrionStore';

function App() {
  const [activeItem, setActiveItem] = useState('command');
  const [isInitializing, setIsInitializing] = useState(true);
  const [systemError, setSystemError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        await copilotEngine.start();
        // Fetch engine status to sync isEngineRunning state
        useAlphaOrionStore.getState().fetchEngineStatus();
        setIsInitializing(false);
      } catch (err) {
        console.error('Failed to initialize Alpha-Orion:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setSystemError(`Critical System Error: Convergence Failure - ${errorMessage}`);
        setIsInitializing(false);
      }
    };

    initApp();

    return () => {
      copilotEngine.stop();
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
          <p className="mt-6 text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] animate-pulse">Initializing Alpha Core</p>
        </div>
      </div>
    );
  }

  if (systemError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <div className="max-w-md p-8 bg-red-950/20 border border-red-500/30 rounded-3xl text-center">
          <h2 className="text-xl font-black text-red-500 uppercase tracking-widest mb-4">Neural Override</h2>
          <p className="text-sm text-red-400/80 mb-6">{systemError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white font-bold rounded-full text-xs uppercase tracking-widest"
          >
            Reboot System
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeItem) {
      case 'command':
      case 'monitor':
        return <Dashboard />;
      case 'optimize':
        return <div className="p-20 text-center text-slate-500 uppercase text-xs tracking-[0.3em]">Optimization Engine Online</div>;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden selection:bg-blue-600/30">
      {/* Background Data Link */}
      <DataHydrator />

      {/* Sidebar Navigation */}
      <Sidebar
        activeItem={activeItem}
        setActiveItem={setActiveItem}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Section */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Scrollable Workspace */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {renderContent()}
          </div>

          {/* Right Panel: Alpha-Copilot (Always Visible or Toggleable) */}
          <div className="w-[400px] border-l border-white/10 shrink-0">
            <AlphaCopilot />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;