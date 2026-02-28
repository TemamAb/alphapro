-- Alpha-Orion Trades Table Schema
-- Stores execution history with flexible JSONB details for analytics

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain VARCHAR(50) NOT NULL,
    strategy VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'confirmed', 'failed', 'pending'
    profit NUMERIC(20, 8) DEFAULT 0,
    transaction_hash VARCHAR(100),
    gas_cost NUMERIC(20, 8),
    loan_amount NUMERIC(30, 0),
    details JSONB DEFAULT '{}'::jsonb
);

-- Standard Indexes for Filtering
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_chain ON trades(chain);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- JSONB Expression Indexes for Dashboard Analytics
-- These are critical for the "Top Pairs" and "Top DEXes" charts

-- Optimizes: GROUP BY details->>'pair'
CREATE INDEX IF NOT EXISTS idx_trades_details_pair ON trades ((details->>'pair'));

-- Optimizes: GROUP BY details->>'dex'
CREATE INDEX IF NOT EXISTS idx_trades_details_dex ON trades ((details->>'dex'));

-- Optimizes: GROUP BY details->>'exchange' (fallback for some strategies)
CREATE INDEX IF NOT EXISTS idx_trades_details_exchange ON trades ((details->>'exchange'));