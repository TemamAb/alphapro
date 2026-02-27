from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

@app.route('/proxy', methods=['GET'])
def proxy():
    # Mock blockchain proxy data
    data = {
        'blockNumber': random.randint(1000000, 2000000),
        'gasPrice': random.uniform(10, 100),
        'transactions': random.randint(100, 1000)
    }
    return jsonify(data)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
