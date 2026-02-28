const { ethers } = require('ethers');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle');

class FlashbotsEngine {
    constructor() {
        this.publicProvider = null;
        this.privateKey = process.env.PRIVATE_KEY;
        this.flashbotsRelay = process.env.FLASHBOTS_RELAY || 'https://relay.flashbots.net';
        this.bundleProvider = null;
        this.isAvailable = false;

        const rpcUrl = process.env.ETHEREUM_RPC_URL;
        
        if (!rpcUrl) {
            console.warn('[Flashbots] ETHEREUM_RPC_URL not set - Flashbots disabled');
            return;
        }

        if (!this.privateKey) {
            console.log('[Flashbots] Running in public/gasless mode (No private key provided)');
            return;
        }

        try {
            this.publicProvider = new ethers.JsonRpcProvider(rpcUrl);
            this.isAvailable = true;
            console.log('[Flashbots] Initialized successfully');
        } catch (err) {
            console.error('[Flashbots] Failed to initialize:', err.message);
        }
    }

    async initialize() {
        if (this.bundleProvider) return;
        // The authSigner is a separate key for signing Flashbots requests, not transactions.
        const authSigner = ethers.Wallet.createRandom();
        // Initialize Flashbots bundle provider
        this.bundleProvider = await FlashbotsBundleProvider.create(
            this.publicProvider,
            authSigner,
            this.flashbotsRelay
        );
    }

    async submitBundle(transactions) {
        /**
         * Submit bundle to Flashbots Relay for MEV protection and atomic execution.
         */
        await this.initialize();
        try {
            const targetBlock = (await this.publicProvider.getBlockNumber()) + 1;

            const signedBundle = await this.bundleProvider.signBundle(transactions);

            const simulation = await this.bundleProvider.simulate(
                signedBundle,
                targetBlock
            );

            if ('error' in simulation) {
                console.error(`[Flashbots] Simulation failed on block ${targetBlock}:`, simulation.error.message);
                return { status: 'failed', error: simulation.error.message };
            }

            console.log('[Flashbots] Simulation successful');

            // Submit bundle
            const bundleSubmission = await this.bundleProvider.sendBundle(
                signedBundle,
                targetBlock
            );

            const receipt = await bundleSubmission.wait();

            return { status: 'success', receipt, targetBlock, method: 'flashbots', mevProtected: true };
        } catch (error) {
            console.error('[Flashbots] Bundle submission failed:', error);
            throw error;
        }
    }
}

module.exports = FlashbotsEngine;