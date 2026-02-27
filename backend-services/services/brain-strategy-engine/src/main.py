from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/strategy', methods=['GET'])
def strategy():
    # Mock strategy engine
    strategy = {
        'name': 'Dynamic Arbitrage',
        'parameters': {
            'leverage': random.uniform(1, 5),
            'riskTolerance': random.choice(['Low', 'Medium', 'High'])
        }
    }
    return jsonify(strategy)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
