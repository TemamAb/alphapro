from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/agent', methods=['GET'])
def agent():
    # Mock AI agent actions
    actions = [
        {'action': 'buy', 'asset': 'ETH', 'amount': random.uniform(0.1, 1.0)},
        {'action': 'sell', 'asset': 'USDC', 'amount': random.uniform(100, 1000)}
    ]
    return jsonify({'actions': actions})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
