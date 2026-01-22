from flask import Flask, jsonify
from flask_cors import CORS
import random
import time

app = Flask(__name__)
CORS(app)

@app.route('/scan', methods=['GET'])
def scan():
    # Mock scanning for opportunities
    opportunities = []
    for i in range(random.randint(1, 5)):
        opp = {
            'id': f'opp-{int(time.time())}-{i}',
            'assets': ['ETH', 'USDC'],
            'exchanges': ['Uniswap', 'Sushiswap'],
            'potentialProfit': random.uniform(50, 1500),
            'riskLevel': random.choice(['Low', 'Medium', 'High']),
            'timestamp': int(time.time() * 1000)
        }
        opportunities.append(opp)
    return jsonify(opportunities)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
