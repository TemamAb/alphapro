from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/scrape', methods=['GET'])
def scrape():
    # Mock scraped benchmarking data
    data = {
        'benchmarks': [
            {'strategy': 'Arbitrage', 'performance': random.uniform(0.5, 2.0)},
            {'strategy': 'Yield Farming', 'performance': random.uniform(0.1, 1.5)}
        ]
    }
    return jsonify(data)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
