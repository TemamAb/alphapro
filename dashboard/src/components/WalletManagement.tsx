import React, { useState, useEffect } from 'react';
import { alphaOrionAPI } from '../services/api';

interface Wallet {
  id: string;
  name: string;
  chain: 'Ethereum' | 'Polygon' | 'Arbitrum';
  balance: number;
  status: 'valid' | 'invalid' | 'pending';
  address: string;
}

interface NewWallet {
  name: string;
  address: string;
  chain: 'Ethereum' | 'Polygon' | 'Arbitrum';
}

const WalletManagement = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [newWallet, setNewWallet] = useState<NewWallet>({ name: '', address: '', chain: 'Ethereum' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        setIsLoading(true);
        const client = alphaOrionAPI.getClient();
        const response = await client.get<Wallet[]>('/api/wallets');
        setWallets(response.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch wallets.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWallets();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewWallet(prev => ({ ...prev, [name]: value as any }));
  };

  const handleAddWallet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newWallet.name || !newWallet.address) {
      alert('Please fill in all fields.');
      return;
    }
    try {
      const client = alphaOrionAPI.getClient();
      const response = await client.post<{ status: string; wallet: Wallet }>('/api/wallets', newWallet);
      if (response.data.status === 'success') {
        setWallets(prev => [...prev, response.data.wallet]);
        setNewWallet({ name: '', address: '', chain: 'Ethereum' });
      }
    } catch (err) {
      setError('Failed to add wallet.');
    }
  };

  const totalBalance = wallets.reduce((acc, wallet) => acc + (wallet.balance || 0), 0);

  if (isLoading) return <div className="text-center p-8">Loading wallets...</div>;
  if (error) return <div className="text-center p-8 text-red-400">{error}</div>;

  return (
    <div className="wallet-management-container p-4 bg-gray-800 text-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Wallet Management</h2>
      
      <form onSubmit={handleAddWallet} className="mb-6 flex flex-wrap gap-2 items-center">
        <input 
          type="text" name="name" value={newWallet.name} onChange={handleInputChange} placeholder="Wallet Name" 
          className="bg-gray-700 p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input 
          type="text" name="address" value={newWallet.address} onChange={handleInputChange} placeholder="Wallet Address" 
          className="bg-gray-700 p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow"
        />
        <select 
          name="chain" value={newWallet.chain} onChange={handleInputChange}
          className="bg-gray-700 p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Ethereum">Ethereum</option>
          <option value="Polygon">Polygon</option>
          <option value="Arbitrum">Arbitrum</option>
        </select>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
          Add Wallet
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-900 rounded-lg">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Chain</th>
              <th className="p-3 text-left">Address</th>
              <th className="p-3 text-right">Balance</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map(wallet => (
              <tr key={wallet.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                <td className="p-3">{wallet.name}</td>
                <td className="p-3">{wallet.chain}</td>
                <td className="p-3 font-mono text-sm">{wallet.address}</td>
                <td className="p-3 text-right">{wallet.balance?.toFixed(4) ?? '0.0000'}</td>
                <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${wallet.status === 'valid' ? 'bg-green-200 text-green-900' : 'bg-red-300 text-red-900'}`}>{wallet.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="text-xl mt-4 font-bold">Total Balance: ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
    </div>
  );
};

export default WalletManagement;
