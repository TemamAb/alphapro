const axios = require('axios');
const { ethers } = require('ethers');

class PimlicoGaslessEngine {
  constructor() {
    this.apiKey = process.env.PIMLICO_API_KEY;
    if (!this.apiKey) {
      throw new Error("Pimlico API Key not configured");
    }

    // Default to Polygon Mainnet (137) or zkEVM (1101) based on config
    this.chainId = parseInt(process.env.CHAIN_ID || '137');
    this.chainKey = this.chainId === 1101 ? 'polygon-zkevm' : 'polygon'; // simplified mapping

    this.rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    if (this.chainId === 1101) {
      this.rpcUrl = process.env.POLYGON_ZKEVM_RPC_URL || 'https://rpc.polygon-zkevm.gateway.fm';
    }

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

    // Pimlico Endpoints
    this.bundlerUrl = `https://api.pimlico.io/v2/${this.chainKey}/rpc?apikey=${this.apiKey}`;
    this.paymasterUrl = `https://api.pimlico.io/v2/${this.chainKey}/rpc?apikey=${this.apiKey}`;
    this.entryPointAddress = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'; // V0.6 EntryPoint
    this.factoryAddress = '0x9406Cc6185a3469062968407C165Df51409CD392'; // SimpleAccountFactory

    this.signer = null;
    this.senderAddress = null;
    this.initCode = null;

    // Auto-init on load
    this.initializeAccount().catch(e => console.error(`[Pimlico] Auto-init failed: ${e.message}`));
  }

  async initializeAccount() {
    if (this.signer && this.senderAddress) return;

    try {
      // 1. Resolve Signer (Owner)
      // Priority: ENV -> Keystore (local) -> Generate New
      if (process.env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      } else {
        const fs = require('fs');
        const path = require('path');
        const keystorePath = path.join(__dirname, '../secure_wallet.json');

        if (fs.existsSync(keystorePath)) {
          const data = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
          this.signer = new ethers.Wallet(data.privateKey, this.provider);
          console.log(`[Pimlico] Loaded Smart Account Owner from ${keystorePath}`);
        } else {
          console.log("[Pimlico] No private key provided. Generating new secure session key for gasless execution...");
          const newWallet = ethers.Wallet.createRandom();
          this.signer = newWallet.connect(this.provider);

          fs.writeFileSync(keystorePath, JSON.stringify({
            address: newWallet.address,
            privateKey: newWallet.privateKey,
            created: new Date().toISOString(),
            note: "DO NOT SHARE. Backup this file to persist your funds."
          }, null, 2));
          console.log(`[Pimlico] New credentials saved to ${keystorePath}`);
        }
      }

      // 2. Resolve Smart Account Address (Sender)
      // We calculate the initCode and valid sender address
      const factoryAbi = ["function createAccount(address owner, uint256 salt) returns (address)"];
      const factory = new ethers.Contract(this.factoryAddress, factoryAbi, this.provider);
      const initCallData = factory.interface.encodeFunctionData('createAccount', [this.signer.address, 0]);
      this.initCode = ethers.concat([this.factoryAddress, initCallData]);

      // Determine Address via EntryPoint view call (revert trick)
      try {
        const entryPoint = new ethers.Contract(this.entryPointAddress, ['function getSenderAddress(bytes initCode)'], this.provider);
        await entryPoint.getSenderAddress.staticCall(this.initCode);
      } catch (e) {
        // The revert data contains the address
        if (e.data || (e.error && e.error.data)) {
          const rawData = e.data || e.error.data;
          const addr = '0x' + rawData.slice(-40);
          this.senderAddress = ethers.getAddress(addr);
          console.log(`[Pimlico] Smart Account Active: ${this.senderAddress}`);
        }
      }

      if (!this.senderAddress) throw new Error("Could not checkmate/resolve sender address");

    } catch (e) {
      console.error(`[Pimlico] Account Init Error: ${e.message}`);
    }
  }

  async getUserOperationReceipt(userOpHash) {
    try {
      const { data } = await axios.post(this.bundlerUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getUserOperationReceipt',
        params: [userOpHash]
      }, { headers: { 'Content-Type': 'application/json' } });

      if (data.error) throw new Error(data.error.message);
      return data.result;
    } catch (error) {
      console.error(`[Pimlico] Failed to get receipt for ${userOpHash}:`, error.message);
      return null;
    }
  }

  // CORE: Execute Arbitrage via UserOperation
  async executeArbitrageUserOp(targetAddress, callData) {
    await this.initializeAccount();
    console.log(`[Pimlico] Constructing Gasless Arbitrage UserOp for target: ${targetAddress}`);

    try {
      if (!this.apiKey) throw new Error("Pimlico API Key not configured");
      if (!this.signer) throw new Error("Signer not initialized");

      const sender = this.senderAddress;

      // Determine if account is deployed to set initCode
      const code = await this.provider.getCode(sender);
      const isDeployed = code !== '0x';
      const actualInitCode = isDeployed ? '0x' : this.initCode;

      // 1. Get Nonce from EntryPoint
      const nonce = await this.getNonce(sender);

      // 2. Build UserOperation
      const userOp = {
        sender,
        nonce: ethers.hexlify(nonce),
        initCode: actualInitCode,
        callData,
        callGasLimit: ethers.hexlify(2500000),
        verificationGasLimit: ethers.hexlify(800000),
        preVerificationGas: ethers.hexlify(100000),
        maxFeePerGas: ethers.hexlify(ethers.parseUnits('300', 'gwei')),
        maxPriorityFeePerGas: ethers.hexlify(ethers.parseUnits('5', 'gwei')),
        paymasterAndData: '0x',
        signature: '0x'
      };

      // 3. Request Paymaster Sponsorship
      console.log("[Pimlico] Requesting Paymaster Sponsorship...");
      const pmResponse = await axios.post(this.paymasterUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_sponsorUserOperation',
        params: [userOp, {
          entryPoint: this.entryPointAddress
        }]
      });

      if (pmResponse.data.error) {
        throw new Error(`Paymaster Error: ${pmResponse.data.error.message}`);
      }

      const pmResult = pmResponse.data.result;
      userOp.paymasterAndData = pmResult.paymasterAndData;
      userOp.callGasLimit = pmResult.callGasLimit;
      userOp.preVerificationGas = pmResult.preVerificationGas;
      userOp.verificationGasLimit = pmResult.verificationGasLimit;

      // Update gas fees if paymaster suggests them (often they do in the result)
      if (pmResult.maxFeePerGas) userOp.maxFeePerGas = pmResult.maxFeePerGas;
      if (pmResult.maxPriorityFeePerGas) userOp.maxPriorityFeePerGas = pmResult.maxPriorityFeePerGas;

      // 4. Sign UserOperation
      console.log("[Pimlico] Signing UserOperation (Owner)...");
      const userOpHash = await this.getUserOpHash(userOp, this.entryPointAddress, this.chainId);
      userOp.signature = await this.signer.signMessage(ethers.getBytes(userOpHash));

      // 5. Submit to Bundler
      console.log("[Pimlico] Submitting to Bundler...");
      const bundleRes = await axios.post(this.bundlerUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, this.entryPointAddress]
      });

      if (bundleRes.data.error) {
        throw new Error(`Bundler Error: ${bundleRes.data.error.message}`);
      }

      const txHash = bundleRes.data.result;
      console.log(`[Pimlico] UserOp Submitted! Hash: ${txHash}`);
      return txHash;

    } catch (e) {
      console.error(`[Pimlico] Execution Failed: ${e.message}`);
      if (e.response) console.error("API Response:", e.response.data);
      throw e;
    }
  }

  // Calculate standard ERC-4337 UserOp Hash (V0.6)
  async getUserOpHash(userOp, entryPoint, chainId) {
    const packed = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
      [
        userOp.sender,
        userOp.nonce,
        ethers.keccak256(userOp.initCode),
        ethers.keccak256(userOp.callData),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        ethers.keccak256(userOp.paymasterAndData)
      ]
    );

    const enc = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'uint256'],
      [ethers.keccak256(packed), entryPoint, chainId]
    );

    return ethers.keccak256(enc);
  }

  // Get Nonce from EntryPoint Contract
  async getNonce(sender) {
    try {
      const abi = ["function getNonce(address sender, uint192 key) view returns (uint256)"];
      const entryPoint = new ethers.Contract(this.entryPointAddress, abi, this.provider);
      const nonce = await entryPoint.getNonce(sender, 0); // Key 0
      return nonce;
    } catch (e) {
      console.error(`[Pimlico] Failed to fetch nonce: ${e.message}`);
      throw e;
    }
  }
}

module.exports = PimlicoGaslessEngine;