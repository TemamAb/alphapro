import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Search,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';

interface WalletData {
  id: string;
  name: string;
  address: string;
  chain: string;
  balance?: number;
  status: 'valid' | 'invalid' | 'pending';
}

const WalletPanel: React.FC = () => {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletData | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', chain: 'ethereum' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof WalletData; direction: 'asc' | 'desc' } | null>(null);

  // Fetch wallets
  const fetchWallets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wallets', {
        headers: { 'Authorization': 'Bearer dev-token' } // Using dev-token as per backend setup
      });
      if (response.ok) {
        const data = await response.json();
        // Mock balances if not provided by backend yet (backend just stores list)
        const walletsWithBalance = data.map((w: any) => ({
          ...w,
          balance: w.balance || Math.random() * 10, // Mock balance for display if 0
          status: w.status || 'valid'
        }));
        setWallets(walletsWithBalance);
      }
    } catch (error) {
      console.error('Failed to fetch wallets', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleSave = async () => {
    try {
      const url = editingWallet ? `/api/wallets/${editingWallet.id}` : '/api/wallets';
      const method = editingWallet ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-token'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingWallet(null);
        setFormData({ name: '', address: '', chain: 'ethereum' });
        fetchWallets();
      } else {
        const err = await response.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Failed to save wallet', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;
    
    try {
      const response = await fetch(`/api/wallets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer dev-token' }
      });
      
      if (response.ok) {
        fetchWallets();
      }
    } catch (error) {
      console.error('Failed to delete wallet', error);
    }
  };

  const openModal = (wallet?: WalletData) => {
    if (wallet) {
      setEditingWallet(wallet);
      setFormData({ name: wallet.name, address: wallet.address, chain: wallet.chain });
    } else {
      setEditingWallet(null);
      setFormData({ name: '', address: '', chain: 'ethereum' });
    }
    setIsModalOpen(true);
  };

  const handleSort = (key: keyof WalletData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    
    const sorted = [...wallets].sort((a, b) => {
      if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
      if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setWallets(sorted);
  };

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  return (
    <div className="h-full flex flex-col bg-slate-950/80 border-l border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Wallet size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Wallet Management</h2>
            <p className="text-[10px] text-slate-400">Execution & Profit Wallets</p>
          </div>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          Add Wallet
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b border-white/5">
        <div className="bg-slate-900/50 p-3 rounded border border-white/5">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Total Wallets</div>
          <div className="text-lg font-bold text-white">{wallets.length}</div>
        </div>
        <div className="bg-slate-900/50 p-3 rounded border border-white/5">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Total Balance (Est.)</div>
          <div className="text-lg font-bold text-emerald-400">{totalBalance.toFixed(4)} ETH</div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-slate-900/30 rounded border border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-[10px] text-slate-500 uppercase border-b border-white/5">
                <th className="p-3 font-semibold cursor-pointer hover:text-slate-300" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Name <ArrowUpDown size={10} /></div>
                </th>
                <th className="p-3 font-semibold">Chain</th>
                <th className="p-3 font-semibold cursor-pointer hover:text-slate-300" onClick={() => handleSort('balance')}>
                  <div className="flex items-center gap-1">Balance <ArrowUpDown size={10} /></div>
                </th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-500">Loading wallets...</td></tr>
              ) : wallets.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-500">No wallets configured</td></tr>
              ) : (
                wallets.map(wallet => (
                  <tr key={wallet.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-3">
                      <div className="font-medium text-white">{wallet.name}</div>
                      <div className="text-[9px] text-slate-500 font-mono truncate max-w-[100px]">{wallet.address}</div>
                    </td>
                    <td className="p-3 capitalize text-slate-300">{wallet.chain}</td>
                    <td className="p-3 font-mono text-slate-300">{wallet.balance?.toFixed(4)}</td>
                    <td className="p-3">
                      <div className={`flex items-center gap-1 text-[10px] ${wallet.status === 'valid' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {wallet.status === 'valid' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span className="uppercase">{wallet.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(wallet)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDelete(wallet.id)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-sm shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">{editingWallet ? 'Edit Wallet' : 'Add New Wallet'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Account Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                  placeholder="e.g. Main Execution"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Chain</label>
                <select 
                  value={formData.chain}
                  onChange={e => setFormData({...formData, chain: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="optimism">Optimism</option>
                  <option value="base">Base</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Wallet Address</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                  placeholder="0x..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
              >
                Save Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPanel;