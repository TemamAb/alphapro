from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/orchestrate', methods=['POST'])
def orchestrate():
    # Mock orchestration
    return jsonify({'message': 'Orchestration started', 'status': 'running'})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
