from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/orders', methods=['GET'])
def orders():
    # Mock order management
    orders = [
        {'id': 'order-1', 'type': 'buy', 'asset': 'ETH', 'amount': random.uniform(0.1, 1.0), 'status': 'pending'},
        {'id': 'order-2', 'type': 'sell', 'asset': 'USDC', 'amount': random.uniform(100, 500), 'status': 'executed'}
    ]
    return jsonify({'orders': orders})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
