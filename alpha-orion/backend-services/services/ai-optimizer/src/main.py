from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import os
import json
import requests
import time

# Optional GCP imports (for local development without credentials)
try:
    import google.generativeai as genai
    from google.cloud import pubsub_v1
    from google.cloud import storage
    from google.cloud import bigquery
    from google.cloud import bigtable
    from google.cloud import secretmanager
    GCP_AVAILABLE = True
except ImportError:
    genai = None
    pubsub_v1 = None
    storage = None
    bigquery = None
    bigtable = None
    secretmanager = None
    GCP_AVAILABLE = False

# Optional OpenAI imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    openai = None
    OPENAI_AVAILABLE = False

import psycopg2
import redis

app = Flask(__name__)
CORS(app)

# Initialize OpenAI (preferred) or Gemini API
openai_api_key = os.getenv('OPENAI_API_KEY')
if openai_api_key and OPENAI_AVAILABLE:
    openai.api_key = openai_api_key
    ai_client = 'openai'
    print("OpenAI initialized successfully")
else:
    # Fallback to Gemini
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if gemini_api_key and GCP_AVAILABLE and genai:
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-pro')
        ai_client = 'gemini'
        print("Gemini API initialized")
    else:
        model = None
        ai_client = None
        print("No AI API key found - using fallback logic")

# GCP Clients (with fallback for local development)
project_id = os.getenv('PROJECT_ID', 'alpha-orion')
try:
    if GCP_AVAILABLE and pubsub_v1:
        publisher = pubsub_v1.PublisherClient()
        storage_client = storage.Client()
        bigquery_client = bigquery.Client()
        bigtable_client = bigtable.Client(project=project_id)
        secret_client = secretmanager.SecretManagerServiceClient()
        gcp_available = True
        print("GCP services initialized successfully")
    else:
        raise Exception("GCP packages not available")
except Exception as e:
    print(f"GCP services not available (expected in local dev): {e}")
    publisher = None
    storage_client = None
    bigquery_client = None
    bigtable_client = None
    secret_client = None
    gcp_available = False

# Connections
db_conn = None
redis_conn = None

def get_db_connection():
    global db_conn
    if db_conn is None:
        db_url = os.getenv('DATABASE_URL')
        db_conn = psycopg2.connect(db_url)
    return db_conn

def get_redis_connection():
    global redis_conn
    if redis_conn is None:
        redis_url = os.getenv('REDIS_URL')
        if not redis_url:
            print("[WARNING] REDIS_URL not configured - Redis features disabled")
            return None
        try:
            redis_conn = redis.from_url(redis_url)
            redis_conn.ping()
            print("[SUCCESS] Connected to Redis")
        except Exception as e:
            print(f"[ERROR] Failed to connect to Redis: {e}")
            redis_conn = None
    return redis_conn

def get_market_data_context():
    """Get current market data for AI analysis using real providers"""
    try:
        # 1. Get latest opportunities from Redis
        redis_conn = get_redis_connection()
        opportunities = []
        if redis_conn:
            opportunities_data = redis_conn.get('latest_opportunities')
            opportunities = json.loads(opportunities_data) if opportunities_data else []

        # 2. Get real-time Gas Price (EthGasStation or PolygonScan)
        gas_price = 50
        try:
            # Polygon PoS Gas Price as proxy
            resp = requests.get('https://gasstation-mainnet.matic.network/v2', timeout=2)
            if resp.status_code == 200:
                gas_price = resp.json().get('fast', {}).get('maxFee', 50)
        except: pass

        # 3. Get Market Volatility & Sentiment (Fear & Greed Index)
        risk_data = {'var_95': 0.05, 'volatility': 0.02}
        market_condition = 'normal'
        try:
            fng_resp = requests.get('https://api.alternative.me/fng/', timeout=2)
            if fng_resp.status_code == 200:
                val = int(fng_resp.json().get('data', [{}])[0].get('value', 50))
                if val < 25: market_condition = 'extreme_fear'
                elif val < 45: market_condition = 'fear'
                elif val > 75: market_condition = 'extreme_greed'
                elif val > 55: market_condition = 'greed'
        except: pass

        return {
            'opportunities_count': len(opportunities),
            'gas_price': gas_price,
            'risk_metrics': risk_data,
            'market_condition': market_condition,
            'timestamp': int(time.time())
        }
    except Exception as e:
        print(f"Error in get_market_data_context: {e}")
        return {
            'opportunities_count': 0,
            'gas_price': 50,
            'risk_metrics': {'var_95': 0.05, 'volatility': 0.02},
            'market_condition': 'normal',
            'timestamp': int(time.time())
        }

def generate_ai_optimization(prompt, market_context):
    """Generate AI-powered optimization using OpenAI (preferred) or Gemini"""
    
    full_prompt = f"""
    You are an expert quantitative trader specializing in DeFi arbitrage strategies.
    Analyze the following arbitrage opportunity and provide optimization recommendations:

    User Query: {prompt}

    Market Context:
    - Current Opportunities: {market_context.get('opportunities_count', 0)}
    - Gas Price: {market_context.get('gas_price', 50)} gwei
    - Market Risk (VaR 95%): {market_context.get('risk_metrics', {}).get('var_95', 0.05)*100}%
    - Market Volatility: {market_context.get('volatility', 0.02)*100}%
    - Market Condition: {market_context.get('market_condition', 'normal')}

    Please provide:
    1. Optimal arbitrage strategy (triangular, cross-DEX, statistical)
    2. Recommended parameters (leverage, slippage, position size)
    3. Risk assessment and mitigation strategies
    4. Expected profit potential
    5. Execution timing recommendations

    Format your response as a JSON object with keys: strategy, parameters, riskAssessment, expectedProfit, executionAdvice
    """

    if ai_client == 'openai' and OPENAI_AVAILABLE:
        try:
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a DeFi arbitrage optimization expert. Return only JSON."},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.7,
                response_format={ "type": "json_object" }
            )
            ai_result = json.loads(response.choices[0].message.content)
            return {
                'suggestion': ai_result.get('strategy', 'Triangular Arbitrage'),
                'confidence': 0.92,
                'expectedProfit': ai_result.get('expectedProfit', 2.5),
                'parameters': ai_result.get('parameters', {}),
                'aiPowered': True,
                'riskAssessment': ai_result.get('riskAssessment', 'Low'),
                'executionAdvice': ai_result.get('executionAdvice', 'Immediate execution recommended')
            }
        except Exception as e:
            print(f"OpenAI API error: {e}")
            return generate_fallback_optimization(prompt, market_context)

    elif ai_client == 'gemini':
        try:
            response = model.generate_content(full_prompt)
            response_text = response.text.strip()

            # Try to parse JSON response
            try:
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]

                ai_result = json.loads(response_text)
                return {
                    'suggestion': ai_result.get('strategy', 'Triangular Arbitrage'),
                    'confidence': 0.85,
                    'expectedProfit': ai_result.get('expectedProfit', 2.5),
                    'parameters': ai_result.get('parameters', {}),
                    'aiPowered': True,
                    'riskAssessment': ai_result.get('riskAssessment', 'Medium'),
                    'executionAdvice': ai_result.get('executionAdvice', 'Execute during low volatility')
                }
            except json.JSONDecodeError:
                return {
                    'suggestion': 'AI-Optimized Arbitrage Strategy',
                    'confidence': 0.8,
                    'expectedProfit': 2.0,
                    'parameters': {'leverage': 1.5, 'maxSlippage': 0.003, 'positionSize': 0.15},
                    'aiPowered': True,
                    'riskAssessment': 'Medium',
                    'executionAdvice': response_text[:200] + '...'
                }
        except Exception as e:
            print(f"Gemini API error: {e}")
            return generate_fallback_optimization(prompt, market_context)

    return generate_fallback_optimization(prompt, market_context)

def generate_fallback_optimization(prompt, market_context):
    """Fallback optimization when AI is unavailable"""
    return {
        'suggestion': 'Conservative Arbitrage Strategy',
        'confidence': 0.6,
        'expectedProfit': 1.5,
        'parameters': {
            'leverage': 1.2,
            'maxSlippage': 0.005,
            'positionSize': 0.1
        },
        'aiPowered': False,
        'riskAssessment': 'Low',
        'executionAdvice': 'Use during stable market conditions'
    }

@app.route('/optimize', methods=['GET', 'POST'])
def optimize():
    """AI-powered arbitrage strategy optimization"""
    try:
        if request.method == 'GET':
            prompt = request.args.get('prompt', 'Optimize arbitrage strategy for current market conditions')
        else:
            data = request.get_json()
            prompt = data.get('prompt', 'Optimize arbitrage strategy for current market conditions')

        # Get market context
        market_context = get_market_data_context()

        # Generate AI optimization
        optimization = generate_ai_optimization(prompt, market_context)

        # Store optimization result in BigQuery for analysis
        if gcp_available and bigquery_client:
            try:
                dataset_id = 'flash_loan_historical_data'
                table_id = 'ai_optimizations'
                table_ref = bigquery_client.dataset(dataset_id).table(table_id)
                from datetime import datetime

                row = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'prompt': prompt,
                    'optimization': json.dumps(optimization),
                    'market_context': json.dumps(market_context)
                }

                bigquery_client.insert_rows_json(table_ref, [row])
            except Exception as e:
                print(f"BigQuery logging error: {e}")

        return jsonify(optimization)

    except Exception as e:
        return jsonify({
            'error': 'Optimization failed',
            'details': str(e),
            'fallback': generate_fallback_optimization('error recovery', get_market_data_context())
        }), 500

@app.route('/predict/opportunity', methods=['POST'])
def predict_opportunity():
    """Predict the success probability of a specific arbitrage opportunity"""
    try:
        data = request.get_json()
        features = data.get('features', {})
        
        # In production, this would use a loaded ML model (PyTorch/TF)
        # For now, we use AI-powered heuristic optimization
        market_context = get_market_data_context()
        prompt = f"Predict success for arbitrage: {json.dumps(features)}"
        prediction = generate_ai_optimization(prompt, market_context)
        
        return jsonify({
            'successProbability': prediction.get('confidence', 0.85),
            'expectedReturn': prediction.get('expectedProfit', 2.5),
            'risk': 0.1,
            'confidence': prediction.get('confidence', 0.85)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'ai_client': ai_client,
        'gcp_available': gcp_available
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
