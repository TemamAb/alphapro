const axios = require('axios');
const { ethers } = require('ethers');

class MEVBlockerEngine {
  constructor() {
    this.mevBlockerRpc = process.env.MEV_BLOCKER_RPC || 'https://api.mevblocker.io/rpc';
    this.privateKey = process.env.PRIVATE_KEY;
    this.publicRpc = process.env.ETHEREUM_RPC_URL;
    
    this.publicProvider = null;
    this.mevProvider = null;
    this.wallet = null;
    this.isAvailable = false;

    if (!this.privateKey || !this.publicRpc) {
      console.log('[MEV Blocker] Running in public/gasless mode (No private key provided)');
      return;
    }

    try {
      // Initialize providers
      this.publicProvider = new ethers.JsonRpcProvider(this.publicRpc);
      this.mevProvider = new ethers.JsonRpcProvider(this.mevBlockerRpc);
      this.wallet = new ethers.Wallet(this.privateKey, this.publicProvider);
      this.isAvailable = true;
      console.log('[MEV Blocker] Initialized successfully');
    } catch (err) {
      console.error('[MEV Blocker] Failed to initialize:', err.message);
    }
  }

  async sendPrivateTransaction(transaction) {
    /**
     * Send transaction through MEV-Blocker
     * - Encrypted in mempool
     * - Protected from front-running
     */
    try {
      const tx = {
        to: transaction.to,
        from: this.wallet.address,
        data: transaction.data,
        value: transaction.value || '0',
        gasPrice: (await this.publicProvider.getFeeData()).gasPrice,
      };

      // Estimate gas
      const gasLimit = await this.publicProvider.estimateGas(tx);
      tx.gasLimit = gasLimit;

      // Sign transaction
      const signedTx = await this.wallet.signTransaction(tx);

      // Send to MEV-Blocker
      const { data: responseData } = await axios.post(
        this.mevBlockerRpc,
        {
          jsonrpc: '2.0',
          method: 'eth_sendPrivateTransaction',
          params: [{ tx: signedTx }],
          id: Date.now(),
        }
      );

      if (responseData.error) {
        throw new Error(`[MEV-Blocker] RPC Error: ${responseData.error.message}`);
      }

      return {
        txHash: responseData.result,
        method: 'mev-blocker',
        mevProtected: true,
      };
    } catch (error) {
      console.error('[MEV-Blocker] Failed to send private transaction:', error.message);
      throw error;
    }
  }
}

module.exports = MEVBlockerEngine;