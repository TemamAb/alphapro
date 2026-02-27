from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/simulate', methods=['GET'])
def simulate():
    # Mock brain simulation
    simulation = {
        'scenario': 'Market Crash',
        'outcome': random.choice(['Profit', 'Loss', 'Break Even']),
        'pnl': random.uniform(-1000, 1000),
        'confidence': random.uniform(0.5, 0.95)
    }
    return jsonify(simulation)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
