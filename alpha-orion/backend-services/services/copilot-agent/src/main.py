"""
Alpha-Copilot Agent Service
Self-deploying, self-healing intelligence for Alpha-Orion
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import threading
import logging
import datetime
import jwt
import hashlib
import requests
import sys
import time
import asyncio
from typing import Dict, List, Optional, Any

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

try:
    import psycopg2
    PSYCOPG_AVAILABLE = True
except ImportError:
    PSYCOPG_AVAILABLE = False

# Configure logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        json_log = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "timestamp": self.formatTime(record, self.datefmt),
            "logger": record.name,
            "service": "copilot-agent"
        }
        return json.dumps(json_log)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

app = Flask(__name__)
CORS(app)

# Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'default-secret-change-in-production')
RENDER_API_KEY = os.getenv('RENDER_API_KEY', '')
RENDER_OWNER_ID = os.getenv('RENDER_OWNER_ID', '')
RENDER_SERVICE_IDS = {
    'dashboard': os.getenv('RENDER_DASHBOARD_SERVICE_ID', ''),
    'user-api': os.getenv('RENDER_USER_API_SERVICE_ID', ''),
    'brain-orchestrator': os.getenv('RENDER_BRAIN_SERVICE_ID', ''),
}

# Health check endpoints
HEALTH_ENDPOINTS = {
    'dashboard': os.getenv('DASHBOARD_URL', 'http://localhost:5173'),
    'user-api': os.getenv('USER_API_URL', 'http://localhost:8080'),
    'brain-orchestrator': os.getenv('BRAIN_ORCHESTRATOR_URL', 'http://localhost:8081'),
}

# Circuit breaker state
circuit_breaker_open = False
healing_in_progress = False

# System state
system_state = {
    'mode': 'autonomous',  # autonomous, manual
    'self_healing_enabled': True,
    'profit_mode': 'detecting',  # detecting, active, profitable
    'last_heal': None,
    'last_deploy': None,
    'deploy_count': 0,
    'heal_count': 0,
}

# Deployment logs
deployment_logs: List[Dict] = []

def add_deployment_log(level: str, message: str, service: str = None):
    """Add a log entry to deployment logs"""
    entry = {
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'level': level,
        'message': message,
        'service': service
    }
    deployment_logs.insert(0, entry)
    # Keep last 100 logs
    if len(deployment_logs) > 100:
        deployment_logs.pop()
    logger.info(f"[{level.upper()}] {message}")


# Database & Redis connections
db_conn = None
redis_conn = None


def get_redis_connection():
    """Get Redis connection"""
    global redis_conn
    if redis_conn is None:
        redis_url = os.getenv('REDIS_URL', os.getenv('REDIS_CONNECTION_STRING', ''))
        if not redis_url:
            logger.warning("REDIS_URL not configured - Redis features disabled")
            return None
        try:
            redis_conn = redis.from_url(redis_url)
            redis_conn.ping()
            add_deployment_log('info', 'Connected to Redis')
            logger.info("Connected to Redis")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            redis_conn = None
    return redis_conn


def get_db_connection():
    """Get database connection"""
    global db_conn
    if db_conn is None:
        db_url = os.getenv('DATABASE_URL', os.getenv('DATABASE_CONNECTION_STRING', ''))
        if db_url and PSYCOPG_AVAILABLE:
            try:
                db_conn = psycopg2.connect(db_url)
                add_deployment_log('info', 'Connected to PostgreSQL')
            except Exception as e:
                logger.warning(f"Database connection failed: {e}")
                db_conn = None
    return db_conn


def verify_token(token: str) -> Optional[Dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except Exception:
        return None


def require_auth(f):
    """Authentication decorator"""
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing token'}), 401
        token = auth_header.split(' ')[1]
        user = verify_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        request.user = user
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper


def require_role(role: str):
    """Role-based access decorator"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            if not hasattr(request, 'user') or request.user.get('role') != role:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator


# === Render API Integration ===

def check_render_service_status(service_id: str) -> Dict:
    """Check status of a Render service via API"""
    if not RENDER_API_KEY or not service_id:
        return {'status': 'unknown', 'message': 'API not configured'}

    try:
        response = requests.get(
            f'https://api.render.com/v1/services/{service_id}',
            headers={
                'Authorization': f'Bearer {RENDER_API_KEY}',
                'Accept': 'application/json'
            },
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return {
                'status': data.get('state', 'unknown'),
                'serviceId': service_id,
                'message': 'Service is running'
            }
        else:
            return {'status': 'error', 'message': f'API error: {response.status_code}'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


def trigger_render_deploy(service_id: str) -> Dict:
    """Trigger a new deployment on Render"""
    if not RENDER_API_KEY or not service_id:
        return {'success': False, 'message': 'API not configured'}

    try:
        response = requests.post(
            f'https://api.render.com/v1/services/{service_id}/deploys',
            headers={
                'Authorization': f'Bearer {RENDER_API_KEY}',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            json={},
            timeout=30
        )
        if response.status_code in [200, 201]:
            add_deployment_log('success', f'Deployment triggered for {service_id}', service_id)
            return {'success': True, 'message': 'Deployment triggered'}
        else:
            return {'success': False, 'message': f'API error: {response.status_code}'}
    except Exception as e:
        add_deployment_log('error', f'Deploy trigger failed: {e}', service_id)
        return {'success': False, 'message': str(e)}


def restart_render_service(service_id: str) -> Dict:
    """Restart a Render service"""
    if not RENDER_API_KEY or not service_id:
        return {'success': False, 'message': 'API not configured'}

    try:
        # First, get the service to find the latest deploy
        response = requests.get(
            f'https://api.render.com/v1/services/{service_id}',
            headers={
                'Authorization': f'Bearer {RENDER_API_KEY}',
                'Accept': 'application/json'
            },
            timeout=10
        )
        if response.status_code != 200:
            return {'success': False, 'message': 'Could not get service info'}

        # Trigger a new deploy (which effectively restarts)
        return trigger_render_deploy(service_id)
    except Exception as e:
        return {'success': False, 'message': str(e)}


# === Health Monitoring ===

def check_service_health(service_name: str, url: str) -> Dict:
    """Check health of a service"""
    start_time = time.time()
    try:
        response = requests.get(url, timeout=5, allow_redirects=True)
        latency = (time.time() - start_time) * 1000

        return {
            'service': service_name,
            'healthy': response.status_code < 400,
            'status_code': response.status_code,
            'latency_ms': round(latency, 2),
            'url': url,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
    except requests.exceptions.Timeout:
        return {
            'service': service_name,
            'healthy': False,
            'status_code': 0,
            'latency_ms': 0,
            'error': 'Timeout',
            'url': url,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            'service': service_name,
            'healthy': False,
            'status_code': 0,
            'latency_ms': 0,
            'error': str(e),
            'url': url,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }


def perform_system_health_check() -> Dict:
    """Perform comprehensive health check on all services"""
    global circuit_breaker_open

    health_results = []
    healthy_count = 0

    for service_name, url in HEALTH_ENDPOINTS.items():
        result = check_service_health(service_name, url)
        health_results.append(result)
        if result['healthy']:
            healthy_count += 1

    health_percentage = (healthy_count / len(HEALTH_ENDPOINTS)) * 100 if HEALTH_ENDPOINTS else 100

    overall_status = 'healthy'
    if health_percentage < 50:
        overall_status = 'critical'
        if not circuit_breaker_open:
            circuit_breaker_open = True
            add_deployment_log('warning', 'Circuit breaker opened - health below 50%')
    elif health_percentage < 80:
        overall_status = 'degraded'
    else:
        if circuit_breaker_open:
            circuit_breaker_open = False
            add_deployment_log('info', 'Circuit breaker closed - services recovered')

    return {
        'overall_status': overall_status,
        'health_percentage': round(health_percentage, 2),
        'services': health_results,
        'circuit_breaker': 'open' if circuit_breaker_open else 'closed',
        'timestamp': datetime.datetime.utcnow().isoformat()
    }


# === Self-Healing ===

def perform_self_healing() -> Dict:
    """Attempt to heal unhealthy services"""
    global healing_in_progress, system_state

    if healing_in_progress:
        return {'success': False, 'message': 'Healing already in progress'}

    healing_in_progress = True
    system_state['heal_count'] += 1
    system_state['last_heal'] = datetime.datetime.utcnow().isoformat()
    add_deployment_log('info', 'Starting self-healing process')

    try:
        health = perform_system_health_check()
        healing_actions = []

        # Check each service and attempt to heal
        for service in health['services']:
            if not service['healthy']:
                service_name = service['service']
                add_deployment_log('warning', f'Service unhealthy: {service_name}')

                # Map service name to Render service ID
                service_id_map = {
                    'dashboard': 'dashboard',
                    'user-api': 'user-api',
                    'brain-orchestrator': 'brain-orchestrator'
                }

                service_id = RENDER_SERVICE_IDS.get(service_id_map.get(service_name, ''), '')

                if service_id and RENDER_API_KEY:
                    # Try to restart the service
                    result = restart_render_service(service_id)
                    healing_actions.append({
                        'service': service_name,
                        'action': 'restart',
                        'result': result
                    })
                    if result['success']:
                        add_deployment_log('success', f'Restarted service: {service_name}', service_name)
                else:
                    healing_actions.append({
                        'service': service_name,
                        'action': 'notify',
                        'result': {'success': False, 'message': 'Render API not configured'}
                    })

        # Wait for healing to take effect
        time.sleep(10)

        # Re-check health
        new_health = perform_system_health_check()

        healing_result = {
            'success': new_health['health_percentage'] >= 50,
            'health_before': health,
            'health_after': new_health,
            'actions_taken': healing_actions,
            'heal_count': system_state['heal_count'],
            'timestamp': datetime.datetime.utcnow().isoformat()
        }

        if healing_result['success']:
            add_deployment_log('success', 'Self-healing completed successfully')
        else:
            add_deployment_log('warning', 'Self-healing incomplete, services still degraded')

        return healing_result

    finally:
        healing_in_progress = False


# === Profit Detection ===

def check_profit_status() -> Dict:
    """Check if system is generating profit"""
    global system_state

    try:
        # Get profit data from brain orchestrator
        brain_url = HEALTH_ENDPOINTS.get('brain-orchestrator', '')
        if not brain_url:
            return {
                'mode': 'inactive',
                'message': 'Brain orchestrator not available'
            }

        response = requests.get(f'{brain_url}/profit/real-time', timeout=10)

        if response.status_code == 200:
            data = response.json()
            total_pnl = data.get('totalPnl', 0)
            trades = data.get('totalTrades', 0)
            status = data.get('status', 'unknown')

            # Update system state
            if status == 'active' and total_pnl > 0:
                system_state['profit_mode'] = 'profitable'
            elif status == 'active':
                system_state['profit_mode'] = 'active'
            else:
                system_state['profit_mode'] = 'detecting'

            return {
                'mode': system_state['profit_mode'],
                'totalPnl': total_pnl,
                'totalTrades': trades,
                'status': status,
                'timestamp': datetime.datetime.utcnow().isoformat()
            }
        else:
            return {
                'mode': 'inactive',
                'message': f'Brain orchestrator error: {response.status_code}'
            }

    except Exception as e:
        logger.warning(f"Profit check failed: {e}")
        return {
            'mode': 'error',
            'message': str(e)
        }


# === Deployment Automation ===

def trigger_full_deployment() -> Dict:
    """Trigger deployment for all services"""
    global system_state

    system_state['deploy_count'] += 1
    system_state['last_deploy'] = datetime.datetime.utcnow().isoformat()
    add_deployment_log('info', 'Starting full deployment')

    deploy_results = []

    for service_name, service_id in RENDER_SERVICE_IDS.items():
        if service_id:
            result = trigger_render_deploy(service_id)
            deploy_results.append({
                'service': service_name,
                'result': result
            })

    # Wait for deployment to start
    time.sleep(5)

    return {
        'success': True,
        'deployments': deploy_results,
        'deploy_count': system_state['deploy_count'],
        'timestamp': datetime.datetime.utcnow().isoformat()
    }


# === Background Monitoring Thread ===

def start_background_monitoring():
    """Start background threads for monitoring and healing"""
    global system_state

    def monitoring_loop():
        while True:
            try:
                # Perform health check
                health = perform_system_health_check()
                
                # Store in Redis if available
                redis_conn = get_redis_connection()
                if redis_conn:
                    try:
                        redis_conn.set('copilot_health', json.dumps(health), ex=60)
                        redis_conn.set('copilot_state', json.dumps(system_state), ex=60)
                    except Exception as e:
                        logger.warning(f"Redis update failed: {e}")

                # Auto-heal if enabled and services are unhealthy
                if system_state.get('self_healing_enabled') and health['overall_status'] in ['degraded', 'critical']:
                    if not healing_in_progress:
                        add_deployment_log('info', 'Auto-healing triggered by background monitor')
                        perform_self_healing()

                # Check profit status periodically
                profit = check_profit_status()
                if redis_conn:
                    try:
                        redis_conn.set('copilot_profit', json.dumps(profit), ex=60)
                    except Exception:
                        pass

            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")

            # Run every 30 seconds
            time.sleep(30)

    # Start monitoring thread
    monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
    monitor_thread.start()
    logger.info("Background monitoring started")


# === API Routes ===

@app.route('/health', methods=['GET'])
def health():
    """Basic health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'copilot-agent',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })


@app.route('/api/copilot/status', methods=['GET'])
@require_auth
def copilot_status():
    """Get overall copilot status"""
    health = perform_system_health_check()
    profit = check_profit_status()

    return jsonify({
        'mode': system_state['mode'],
        'self_healing_enabled': system_state['self_healing_enabled'],
        'health': health,
        'profit': profit,
        'circuit_breaker': 'open' if circuit_breaker_open else 'closed',
        'state': system_state,
        'timestamp': datetime.datetime.utcnow().isoformat()
    })


@app.route('/api/copilot/deploy', methods=['POST'])
@require_auth
@require_role('admin')
def deploy():
    """Trigger deployment"""
    result = trigger_full_deployment()
    return jsonify(result)


@app.route('/api/copilot/heal', methods=['POST'])
@require_auth
@require_role('admin')
def heal():
    """Trigger self-healing"""
    result = perform_self_healing()
    return jsonify(result)


@app.route('/api/copilot/heal/auto', methods=['POST'])
@require_auth
@require_role('admin')
def toggle_auto_heal():
    """Toggle automatic healing"""
    data = request.get_json() or {}
    enabled = data.get('enabled', not system_state['self_healing_enabled'])
    system_state['self_healing_enabled'] = enabled
    return jsonify({
        'success': True,
        'self_healing_enabled': enabled
    })


@app.route('/api/copilot/health', methods=['GET'])
@require_auth
def health_check():
    """Get system health"""
    return jsonify(perform_system_health_check())


@app.route('/api/copilot/profit', methods=['GET'])
@require_auth
def profit():
    """Get profit status"""
    return jsonify(check_profit_status())


@app.route('/api/copilot/logs', methods=['GET'])
@require_auth
def logs():
    """Get deployment logs"""
    limit = request.args.get('limit', 50, type=int)
    return jsonify({
        'logs': deployment_logs[:limit],
        'count': len(deployment_logs)
    })


@app.route('/api/copilot/service/<service_name>/restart', methods=['POST'])
@require_auth
@require_role('admin')
def restart_service(service_name: str):
    """Restart a specific service"""
    service_id_map = {
        'dashboard': 'dashboard',
        'user-api': 'user-api',
        'brain-orchestrator': 'brain-orchestrator',
    }

    service_id = RENDER_SERVICE_IDS.get(service_id_map.get(service_name, ''), '')

    if not service_id:
        return jsonify({'success': False, 'message': 'Service not found'}), 404

    result = restart_render_service(service_id)
    return jsonify(result)


@app.route('/api/copilot/mode', methods=['POST'])
@require_auth
@require_role('admin')
def set_mode():
    """Set copilot mode (autonomous or manual)"""
    data = request.get_json()
    mode = data.get('mode', 'autonomous')

    if mode not in ['autonomous', 'manual']:
        return jsonify({'error': 'Invalid mode'}), 400

    system_state['mode'] = mode
    return jsonify({
        'success': True,
        'mode': mode
    })


@app.route('/api/copilot/state', methods=['GET'])
@require_auth
def get_state():
    """Get system state"""
    return jsonify(system_state)


# === Initialize ===

if __name__ == '__main__':
    logger.info("Starting Alpha-Copilot Agent Service")
    add_deployment_log('info', 'Alpha-Copilot Agent initializing...')

    # Start background monitoring
    start_background_monitoring()

    # Run Flask app
    app.run(host='0.0.0.0', port=8082, debug=False)
