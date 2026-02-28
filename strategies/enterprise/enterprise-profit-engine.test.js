const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');

// Import the main engine and individual strategies
const {
  EnterpriseProfitEngine,
  LVRRebalancingStrategy,
  TriangularArbitrageStrategy,
  FlashLoanYieldFarmingStrategy,
  OptionsArbitrageStrategy,
} = require('./enterprise-profit-engine');

describe('EnterpriseProfitEngine V2 (Modular)', () => {
    let profitEngine;
    let mockMultiChainEngine;
    let mockMevRouter;
    let mockRiskEngine;

    beforeEach(() => {
        // Mock dependencies
        mockMultiChainEngine = {
            chains: {
                ethereum: { name: 'Ethereum', dexes: ['uniswap', 'sushiswap'] },
                polygon: { name: 'Polygon', dexes: ['quickswap'] }
            },
            providers: {
                ethereum: sinon.stub(),
                polygon: sinon.stub()
            },
            optimizeGasPrice: sinon.stub().resolves(ethers.utils.parseUnits('20', 'gwei')),
            executeArbitrage: sinon.stub().resolves({ status: 'success' })
        };

        mockMevRouter = {
            routeTransaction: sinon.stub().resolves({ status: 'success' })
        };

        mockRiskEngine = {
            evaluateTradeOpportunity: sinon.stub().returns({ approved: true }),
            calculateOptimalPositionSize: sinon.stub().callsFake(opp => opp.loanAmount || ethers.utils.parseUnits('10', 'ether'))
        };

        // Instantiate the engine with mocks
        profitEngine = new EnterpriseProfitEngine(mockMultiChainEngine, mockMevRouter);
        profitEngine.setRiskEngine(mockRiskEngine);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should initialize all 16 strategy modules in the constructor', () => {
        const strategyKeys = Object.keys(profitEngine.strategies);
        expect(strategyKeys).to.have.lengthOf(16);
        expect(profitEngine.strategies.LVR_REBALANCING).to.be.an.instanceOf(LVRRebalancingStrategy);
        expect(profitEngine.strategies.TRIANGULAR_ARBITRAGE).to.be.an.instanceOf(TriangularArbitrageStrategy);
        expect(profitEngine.strategies.FLASH_LOAN_YIELD_FARMING).to.be.an.instanceOf(FlashLoanYieldFarmingStrategy);
        expect(profitEngine.strategies.OPTIONS_ARBITRAGE).to.be.an.instanceOf(OptionsArbitrageStrategy);
        expect(profitEngine.strategies.STATISTICAL_ARBITRAGE).to.not.be.undefined;
    });

    describe('generateProfitOpportunities', () => {
        it('should call findOpportunities on all strategies and aggregate the results', async () => {
            // Stub each strategy's findOpportunities method
            const lvrOpp = { id: 'lvr-1', strategy: 'LVR_REBALANCING', potentialProfit: 100 };
            const triOpp = { id: 'tri-1', strategy: 'TRIANGULAR_ARBITRAGE', potentialProfit: 50 };

            sinon.stub(profitEngine.strategies.LVR_REBALANCING, 'findOpportunities').resolves([lvrOpp]);
            sinon.stub(profitEngine.strategies.ORACLE_LATENCY, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.JIT_LIQUIDITY, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.TRIANGULAR_ARBITRAGE, 'findOpportunities').resolves([triOpp]);
            sinon.stub(profitEngine.strategies.CROSS_DEX_ARBITRAGE, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.CROSS_CHAIN_ARBITRAGE, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.LIQUIDITY_POOL_ARBITRAGE, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.MEV_EXTRACTION, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.STATISTICAL_ARBITRAGE, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.ORDER_FLOW_ARBITRAGE, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.FLASH_LOAN_YIELD_FARMING, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.OPTIONS_ARBITRAGE, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.PERPETUALS_ARBITRAGE, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.GAMMA_SCALPING, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.DELTA_NEUTRAL, 'findOpportunities').resolves([]);
            sinon.stub(profitEngine.strategies.BATCH_AUCTION_ARBITRAGE, 'findOpportunities').resolves([]);

            // Mock the filtering to just pass through for this test
            sinon.stub(profitEngine, 'filterAndRankOpportunities').callsFake(async (opps) => opps);

            const opportunities = await profitEngine.generateProfitOpportunities();

            expect(opportunities).to.have.lengthOf(2);
            expect(opportunities).to.deep.include(lvrOpp);
            expect(opportunities).to.deep.include(triOpp);

            // Check that all findOpportunities methods were called
            for (const strategy of Object.values(profitEngine.strategies)) {
                expect(strategy.findOpportunities.calledOnce).to.be.true;
            }
        });
    });

    describe('filterAndRankOpportunities', () => {
        const opportunities = [
            { id: 'opp-1', potentialProfit: 100, riskLevel: 'LOW', complexity: 'LOW' },
            { id: 'opp-2', potentialProfit: 200, riskLevel: 'MEDIUM', complexity: 'MEDIUM' },
            { id: 'opp-3', potentialProfit: 0.0005, riskLevel: 'LOW', complexity: 'LOW' }, // Too low profit
            { id: 'opp-4', potentialProfit: 500, riskLevel: 'VERY_HIGH', complexity: 'HIGH' }, // Too high risk
            { id: 'opp-5', potentialProfit: 600, riskLevel: 'HIGH', complexity: 'VERY_HIGH' }, // Too high complexity
        ];

        it('should use rule-based filtering when ML model is not available', async () => {
            profitEngine.mlModels.arbitrageOpportunity = null; // Ensure no ML model

            const filtered = await profitEngine.filterAndRankOpportunities(opportunities);

            expect(filtered).to.have.lengthOf(2);
            // It should filter out opp-3, opp-4, and opp-5
            expect(filtered.map(o => o.id)).to.deep.equal(['opp-2', 'opp-1']); // Sorted by profit desc
        });

        it('should use ML-based filtering when model is available', async () => {
            // Mock the ML model
            profitEngine.mlModels.arbitrageOpportunity = {
                predict: sinon.stub().callsFake(async (features) => {
                    if (features.potentialProfit === 100) { // opp-1
                        return { successProbability: 0.8, expectedReturn: 90, risk: 0.1 };
                    }
                    if (features.potentialProfit === 200) { // opp-2
                        return { successProbability: 0.7, expectedReturn: 150, risk: 0.2 };
                    }
                    // Others fail the probability check
                    return { successProbability: 0.5, expectedReturn: 0, risk: 1 };
                })
            };

            const filtered = await profitEngine.filterAndRankOpportunities(opportunities);

            expect(filtered).to.have.lengthOf(2);
            // opp-1 risk-adjusted return: 90 / 0.1 = 900
            // opp-2 risk-adjusted return: 150 / 0.2 = 750
            // So opp-1 should be first
            expect(filtered.map(o => o.id)).to.deep.equal(['opp-1', 'opp-2']);
            expect(filtered[0]).to.have.property('riskAdjustedReturn', 900);
        });
    });

    describe('executeOptimizedTrade', () => {
        it('should call pre-check, calculate position size, and execute via multi-chain engine', async () => {
            const opportunity = {
                id: 'exec-opp-1',
                strategy: 'TEST',
                chain: 'ethereum',
                potentialProfit: 100,
                loanAmount: ethers.utils.parseUnits('10', 'ether')
            };

            const result = await profitEngine.executeOptimizedTrade(opportunity);

            // Verify the flow
            expect(mockRiskEngine.evaluateTradeOpportunity.calledOnceWith(opportunity)).to.be.true;
            expect(mockRiskEngine.calculateOptimalPositionSize.calledOnceWith(opportunity)).to.be.true;
            expect(mockMultiChainEngine.optimizeGasPrice.calledOnceWith('ethereum')).to.be.true;
            expect(mockMultiChainEngine.executeArbitrage.calledOnce).to.be.true;

            // Check that the final call to executeArbitrage contains all the calculated parameters
            const executionArgs = mockMultiChainEngine.executeArbitrage.firstCall.args[0];
            expect(executionArgs).to.have.property('id', 'exec-opp-1');
            expect(executionArgs).to.have.property('loanAmount');
            expect(executionArgs).to.have.property('gasPrice');
            expect(executionArgs).to.have.property('slippageTolerance', 0.005);

            expect(result).to.deep.equal({ status: 'success' });
        });

        it('should throw an error if pre-execution check fails', async () => {
            mockRiskEngine.evaluateTradeOpportunity.returns({ approved: false, reason: 'High VaR' });

            const opportunity = { id: 'exec-opp-2', potentialProfit: 100 };

            try {
                await profitEngine.executeOptimizedTrade(opportunity);
                expect.fail('Expected executeOptimizedTrade to throw');
            } catch (error) {
                expect(error.message).to.equal('Pre-execution check failed: High VaR');
                expect(mockMultiChainEngine.executeArbitrage.notCalled).to.be.true;
            }
        });
    });
});