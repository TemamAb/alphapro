import unittest
import json
import asyncio
from unittest.mock import patch, MagicMock
from src.app import app
from src.apex_optimizer import apex_optimizer

class AppTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')

    def test_optimization_status(self):
        # Mock the async method on the actual instance
        async def mock_status():
            return {
                'metrics': {
                    'gas': {'current': 100, 'optimized': 80}
                }
            }
        
        # We need to patch the method on the instance that app imported
        with patch.object(apex_optimizer, 'get_optimization_status', side_effect=mock_status):
            response = self.app.get('/apex-optimization/status')
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertEqual(data['metrics']['gas']['current'], 100)

if __name__ == '__main__':
    unittest.main()