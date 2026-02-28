import time
import json
import random
import redis
import uuid
from datetime import datetime

# Configuration
REDIS_HOST = "localhost"
REDIS_PORT = 6379

# Channels identified from architecture docs and tests
# 'blockchain_stream' is used by the Dashboard/User API
# 'arbitrage_events' is referenced in blockchain-monitor tests
CHANNELS = ["blockchain_stream", "arbitrage_events"]
HISTORY_LIST = "blockchain_activity_stream"

def connect_redis():
    """Connects to the local Redis instance."""
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        r.ping() # Test connection
        return r
    except Exception as e:
        print(f"❌ Failed to connect to Redis at {REDIS_HOST}:{REDIS_PORT}")
        print(f"   Error: {e}")
        print("   Ensure Docker stack is running: 'docker-compose up -d'")
        exit(1)

def generate_mock_event():
    """Generates a realistic arbitrage opportunity or execution event."""
    dexes = ["Uniswap V3", "Sushiswap", "Balancer", "Curve", "PancakeSwap"]
    pairs = ["WETH/USDC", "WBTC/USDT", "WETH/DAI", "LINK/ETH", "MATIC/USDC"]
    strategies = ["Triangular Arbitrage", "Flash Loan", "Spatial Arbitrage", "JIT Liquidity", "MEV Protection"]
    
    # 80% Opportunity detection, 20% Execution reports
    event_type = random.choices(["OPPORTUNITY_DETECTED", "ARBITRAGE_EXECUTED"], weights=[0.8, 0.2])[0]
    
    base_data = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "source": "simulation_engine",
        "type": event_type,
    }

    if event_type == "OPPORTUNITY_DETECTED":
        base_data.update({
            "strategy": random.choice(strategies),
            "dex": random.choice(dexes),
            "pair": random.choice(pairs),
            "profit_potential_eth": round(random.uniform(0.05, 2.5), 4),
            "gas_cost_eth": round(random.uniform(0.005, 0.02), 4),
            "confidence_score": round(random.uniform(0.8, 0.99), 2)
        })
    elif event_type == "ARBITRAGE_EXECUTED":
        base_data.update({
            "txHash": f"0x{uuid.uuid4().hex}",
            "tokenIn": "0xC02aa...756Cc2", # WETH
            "tokenOut": "0xA0b86...e7935", # USDC
            "profit": str(round(random.uniform(0.1, 1.5) * 1e18)), # Wei
            "gasUsed": str(random.randint(150000, 400000)),
            "status": "SUCCESS"
        })
    
    return base_data

def run_simulation():
    r = connect_redis()
    print(f"🚀 Starting Alpha-Orion Traffic Simulation")
    print(f"📡 Connected to Redis. Broadcasting to: {', '.join(CHANNELS)}")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            event = generate_mock_event()
            message = json.dumps(event)

            # 1. Publish to Pub/Sub (Real-time stream for Brain & Dashboard)
            for channel in CHANNELS:
                r.publish(channel, message)

            # 2. Push to List (History for persistence)
            r.lpush(HISTORY_LIST, message)
            r.ltrim(HISTORY_LIST, 0, 99) # Keep last 100 events

            # Log to console
            if event["type"] == "OPPORTUNITY_DETECTED":
                print(f"✨ [OPPORTUNITY] {event['strategy']} on {event['dex']} ({event['pair']}) | Profit: {event['profit_potential_eth']} ETH")
            elif event["type"] == "ARBITRAGE_EXECUTED":
                print(f"💰 [EXECUTED] Tx: {event['txHash'][:10]}... | Gas: {event['gasUsed']}")
            
            # Random delay to simulate market conditions
            time.sleep(random.uniform(0.5, 2.0))

    except KeyboardInterrupt:
        print("\n🛑 Simulation stopped.")

if __name__ == "__main__":
    run_simulation()