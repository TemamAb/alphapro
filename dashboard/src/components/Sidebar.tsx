import React from 'react';
import { Zap, Command, Monitor, Sliders, Settings, Settings2, Eye } from 'lucide-react';
import { useAlphaOrionStore, useIsEngineRunning } from '../hooks/useAlphaOrionStore';

// Sidebar navigation items
const sidebarItems = [
  { id: 'command', label: 'Command Post', icon: Command },
  { id: 'monitor', label: 'Monitor', icon: Monitor },
  { id: 'optimize', label: 'Optimize', icon: Sliders },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activeItem: string;
  setActiveItem: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem }) => {
  const isEngineRunning = useIsEngineRunning();

  return (
    <aside className="w-64 border-r border-white/10 bg-[#080c14] flex flex-col py-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-center mb-10 px-4">
        <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.6)] shrink-0">
          <Zap size={20} className="text-white" />
        </div>
        <span className="ml-3 text-xs font-black text-white tracking-widest uppercase">Alpha-Orion</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activeItem === item.id
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <item.icon size={18} className={activeItem === item.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'} />
            <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
            {activeItem === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      {/* Requirement 1: Engine Running Signal with animating gear */}
      <div className="px-3 mt-auto pt-6 border-t border-white/5 space-y-3">
        {isEngineRunning ? (
          <div className="flex flex-col gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <Settings2 size={16} className="text-emerald-400 animate-spin-slow" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Engine Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye size={12} className="text-emerald-500/70" />
              <span className="text-[9px] font-bold text-emerald-400/80 uppercase">Production Mode Live</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-2xl opacity-60">
            <div className="flex items-center gap-3">
              <Settings2 size={16} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Engine Halted</span>
            </div>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest ml-7">System Offline</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;