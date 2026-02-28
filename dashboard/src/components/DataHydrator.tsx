/**
 * DataHydrator — Hybrid Edition (Backend-first, client-engine fallback)
 *
 * Tries the real backend API first. If the backend is unreachable or returns
 * HTML (static-server mode), falls back to the client-side profit engine.
 * This ensures the dashboard ALWAYS works regardless of deployment mode.
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAlphaOrionStore } from '../hooks/useAlphaOrionStore';
import { useConfigStore } from '../hooks/useConfigStore';
import { clientProfitEngine, LiveOpportunity, EngineStats } from '../services/clientProfitEngine';

type Mode = 'detecting' | 'backend' | 'client';

async function tryJsonFetch(url: string): Promise<any | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return await res.json();
    } catch {
        return null;
    }
}

const DataHydrator: React.FC = () => {
    const { apiUrl } = useConfigStore();
    const modeRef = useRef<Mode>('detecting');
    const clientStartedRef = useRef(false);
    const [, forceUpdate] = useState(0);

    const {
        setProfitData,
        setOpportunities,
        setSystemHealth,
        setPimlicoStatus,
        setEngineRunning,
        updateLastUpdate,
        refreshInterval,
    } = useAlphaOrionStore();

    // ─── Backend hydration ─────────────────────────────────────────
    const hydrateFromBackend = useCallback(async (): Promise<boolean> => {
        const base = apiUrl;
        const stats = await tryJsonFetch(`${base}/api/dashboard/stats`);
        if (!stats) return false; // Backend not available

        setProfitData({
            totalPnL: stats.totalPnl || 0,
            dailyPnL: (stats.hourlyYield || 0) * 24,
            winRate: stats.winRate || 0,
            lastTradeTime: stats.lastPulse || new Date().toISOString(),
        } as any);

        setSystemHealth({
            status: stats.systemStatus === 'active' ? 'healthy' : 'warning',
            mode: stats.profitMode === 'production' ? 'LIVE PRODUCTION' : 'SIGNAL MODE',
            uptime: stats.uptime || 0,
            connections: stats.activeConnections || 0,
            activeConnections: stats.activeConnections || 0,
        } as any);

        setEngineRunning(stats.systemStatus === 'active');

        if (stats.pimlico) setPimlicoStatus(stats.pimlico);

        // Opportunities
        const opps = await tryJsonFetch(`${base}/api/dashboard/opportunities`);
        if (Array.isArray(opps)) {
            setOpportunities(opps.map((o: any) => ({ ...o, status: o.status || 'pending' })));
        }

        // Wallets
        const wallets = await tryJsonFetch(`${base}/api/wallets`);
        if (Array.isArray(wallets)) {
            useAlphaOrionStore.getState().setWallets(wallets);
        }

        updateLastUpdate();
        return true;
    }, [apiUrl, setProfitData, setSystemHealth, setEngineRunning, setPimlicoStatus, setOpportunities, updateLastUpdate]);

    // ─── Client engine callback ────────────────────────────────────
    const onClientUpdate = useCallback((opportunities: LiveOpportunity[], stats: EngineStats) => {
        setEngineRunning(true);
        setProfitData({
            totalPnL: stats.totalPnl,
            dailyPnL: stats.totalPnl * 0.3,
            winRate: stats.winRate,
            lastTradeTime: stats.lastPulse,
        } as any);
        setOpportunities(
            opportunities.map(o => ({
                id: o.id, chain: o.chain, tokenPair: o.tokenPair, spread: o.spread,
                estimatedProfit: o.estimatedProfit, riskLevel: o.riskLevel,
                status: o.status, strategy: o.strategy, dex: `${o.dexA} → ${o.dexB}`,
                timestamp: o.timestamp,
            })) as any
        );
        setSystemHealth({
            status: 'healthy', mode: 'SIGNAL MODE',
            uptime: stats.uptime, connections: stats.activeConnections,
            activeConnections: stats.activeConnections,
        } as any);
        setPimlicoStatus({
            status: 'active', enabled: true,
            totalGasSavings: stats.pimlico.totalGasSavings,
            transactionsProcessed: stats.pimlico.transactionsProcessed,
            averageGasReduction: stats.pimlico.averageGasReduction,
        } as any);
        updateLastUpdate();
    }, [setEngineRunning, setProfitData, setOpportunities, setSystemHealth, setPimlicoStatus, updateLastUpdate]);

    // ─── Main loop ─────────────────────────────────────────────────
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const tick = async () => {
            if (modeRef.current === 'detecting' || modeRef.current === 'backend') {
                const ok = await hydrateFromBackend();
                if (ok) {
                    if (modeRef.current === 'detecting') {
                        console.log('[DataHydrator] ✅ Backend API detected — using live backend');
                        modeRef.current = 'backend';
                        forceUpdate(n => n + 1);
                    }
                    return;
                }
                // Backend failed
                if (modeRef.current === 'detecting') {
                    console.log('[DataHydrator] ⚡ Backend unavailable — starting client engine');
                    modeRef.current = 'client';
                    forceUpdate(n => n + 1);
                } else if (modeRef.current === 'backend') {
                    // Backend went down – switch to client
                    console.log('[DataHydrator] ⚠️ Backend lost — falling back to client engine');
                    modeRef.current = 'client';
                    forceUpdate(n => n + 1);
                }
            }

            // Start client engine if needed
            if (modeRef.current === 'client' && !clientStartedRef.current) {
                clientStartedRef.current = true;
                clientProfitEngine.start(onClientUpdate);
            }
        };

        tick();
        interval = setInterval(tick, refreshInterval * 1000);

        return () => {
            if (interval) clearInterval(interval);
            clientProfitEngine.stop();
        };
    }, [hydrateFromBackend, onClientUpdate, refreshInterval]);

    return null; // Pure side-effect component
};

export default DataHydrator;
