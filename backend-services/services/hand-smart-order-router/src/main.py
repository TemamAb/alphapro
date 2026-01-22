from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/route', methods=['GET'])
def route():
    # Mock smart order routing
    routing = {
        'bestExchange': random.choice(['Uniswap', 'Sushiswap', 'PancakeSwap']),
        'estimatedFee': random.uniform(0.001, 0.01),
        'slippage': random.uniform(0.001, 0.005)
    }
    return jsonify(routing)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
