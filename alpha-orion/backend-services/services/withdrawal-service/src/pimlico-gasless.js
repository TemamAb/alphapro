const axios = require('axios');
const { ethers } = require('ethers');

class PimlicoGaslessEngine {
  constructor() {
    this.apiKey = process.env.PIMLICO_API_KEY;
    // Default to Polygon Mainnet (137) or zkEVM (1101) based on config
    this.chainId = parseInt(process.env.CHAIN_ID || '137');
    this.chainKey = this.chainId === 1101 ? 'polygon-zkevm' : 'polygon'; // simplified mapping

    this.rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    if (this.chainId === 1101) {
      this.rpcUrl = process.env.POLYGON_ZKEVM_RPC_URL || 'https://rpc.polygon-zkevm.gateway.fm';
    }

    this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);

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
          console.log("[Pimlico] No wallet found. Generating new secure trading credentials...");
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
      this.initCode = ethers.utils.hexConcat([this.factoryAddress, initCallData]);

      // Determine Address via EntryPoint view call (revert trick)
      try {
        const entryPoint = new ethers.Contract(this.entryPointAddress, ['function getSenderAddress(bytes initCode)'], this.provider);
        await entryPoint.callStatic.getSenderAddress(this.initCode);
      } catch (e) {
        // The revert data contains the address
        if (e.data || (e.error && e.error.data)) {
          const rawData = e.data || e.error.data;
          const addr = '0x' + rawData.slice(-40);
          this.senderAddress = ethers.utils.getAddress(addr);
          console.log(`[Pimlico] Smart Account Active: ${this.senderAddress}`);
        }
      }

      if (!this.senderAddress) throw new Error("Could not checkmate/resolve sender address");

    } catch (e) {
      console.error(`[Pimlico] Account Init Error: ${e.message}`);
    }
  }

  async executeGaslessWithdrawal(amount, destinationAddress, tokenAddress = '0xA8CE8aee21bC2A48a5EF670afCc9274C7bbC681C') {
    await this.initializeAccount();
    console.log(`[Pimlico] Initiating gasless withdrawal of ${amount} ${tokenAddress} to ${destinationAddress}`);

    try {
      if (!this.apiKey) throw new Error("Pimlico API Key not configured");
      if (!this.signer) throw new Error("Signer not initialized");

      const sender = this.senderAddress;

      const code = await this.provider.getCode(sender);
      const isDeployed = code !== '0x';
      const actualInitCode = isDeployed ? '0x' : this.initCode;

      const erc20Abi = [
        "function transfer(address to, uint256 amount)",
        "function decimals() view returns (uint8)"
      ];
      const erc20 = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      const decimals = await erc20.decimals();
      const transferAmount = ethers.utils.parseUnits(amount.toString(), decimals);

      const callData = erc20.interface.encodeFunctionData("transfer", [destinationAddress, transferAmount]);

      // 1. Get Nonce
      const nonce = await this.getNonce(sender);

      const userOp = {
        sender,
        nonce: ethers.utils.hexlify(nonce),
        initCode: actualInitCode,
        callData,
        callGasLimit: ethers.utils.hexlify(150000), // Standard transfer limit
        verificationGasLimit: ethers.utils.hexlify(300000),
        preVerificationGas: ethers.utils.hexlify(50000),
        maxFeePerGas: ethers.utils.hexlify(ethers.utils.parseUnits('300', 'gwei')),
        maxPriorityFeePerGas: ethers.utils.hexlify(ethers.utils.parseUnits('50', 'gwei')),
        paymasterAndData: '0x',
        signature: '0x'
      };

      // 2. Request Paymaster sponsorship
      console.log("[Pimlico] Requesting Paymaster Sponsorship...");
      const paymasterResponse = await axios.post(this.paymasterUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_sponsorUserOperation',
        params: [userOp, {
          entryPoint: this.entryPointAddress
        }]
      });

      if (paymasterResponse.data.error) throw new Error(paymasterResponse.data.error.message);

      const pmResult = paymasterResponse.data.result;
      userOp.paymasterAndData = pmResult.paymasterAndData;
      userOp.callGasLimit = pmResult.callGasLimit;
      userOp.preVerificationGas = pmResult.preVerificationGas;
      userOp.verificationGasLimit = pmResult.verificationGasLimit;

      if (pmResult.maxFeePerGas) userOp.maxFeePerGas = pmResult.maxFeePerGas;
      if (pmResult.maxPriorityFeePerGas) userOp.maxPriorityFeePerGas = pmResult.maxPriorityFeePerGas;

      // 3. Sign the UserOperation
      console.log("[Pimlico] Signing Withdrawal UserOp...");
      const userOpHash = await this.getUserOpHash(userOp, this.entryPointAddress, this.chainId);
      userOp.signature = await this.signer.signMessage(ethers.utils.arrayify(userOpHash));

      // 4. Send to bundler
      console.log("[Pimlico] Submitting to Bundler...");
      const bundlerResponse = await axios.post(this.bundlerUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, this.entryPointAddress]
      });

      if (bundlerResponse.data.error) throw new Error(bundlerResponse.data.error.message);

      return {
        success: true,
        userOpHash: bundlerResponse.data.result,
        timestamp: Date.now(),
        status: 'SUBMITTED_TO_BUNDLER'
      };
    } catch (error) {
      console.error(`[Pimlico] Gasless withdrawal failed:`, error.message);
      throw new Error(`Gasless withdrawal failed: ${error.message}`);
    }
  }

  // Calculate standard ERC-4337 UserOp Hash (V0.6)
  async getUserOpHash(userOp, entryPoint, chainId) {
    const packed = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
      [
        userOp.sender,
        userOp.nonce,
        ethers.utils.keccak256(userOp.initCode),
        ethers.utils.keccak256(userOp.callData),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        ethers.utils.keccak256(userOp.paymasterAndData)
      ]
    );

    const enc = ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'address', 'uint256'],
      [ethers.utils.keccak256(packed), entryPoint, chainId]
    );

    return ethers.utils.keccak256(enc);
  }

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