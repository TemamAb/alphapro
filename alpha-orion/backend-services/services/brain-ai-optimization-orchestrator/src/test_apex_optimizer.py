import pytest
import asyncio
from unittest.mock import MagicMock, patch

# Add src to path to import ApexOptimizer
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from apex_optimizer import ApexOptimizer, OptimizationAction

@pytest.fixture
def optimizer():
    """Fixture to create an ApexOptimizer instance with mocked clients."""
    # Mock all external connections during initialization
    with patch('apex_optimizer.psycopg2.connect'), \
         patch('apex_optimizer.redis.from_url'), \
         patch('apex_optimizer.bigquery.Client'):
        
        optimizer_instance = ApexOptimizer()
        # Mock the database connection object after initialization
        optimizer_instance.db_conn = MagicMock()
        return optimizer_instance

@pytest.mark.asyncio
async def test_identifies_high_latency_and_recommends_scaling(optimizer):
    """
    Verify that the optimizer correctly identifies high latency from trade data
    and recommends an infrastructure scaling action.
    """
    # Mock the database cursor to simulate a high average latency (e.g., 2500ms)
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = (2500.0,)
    
    # The cursor is used within a 'with' statement, so we mock the context manager
    mock_context_manager = MagicMock()
    mock_context_manager.__enter__.return_value = mock_cursor
    mock_context_manager.__exit__.return_value = None
    
    optimizer.db_conn.cursor.return_value = mock_context_manager

    # Run the specific analysis method
    action = await optimizer._analyze_infrastructure_optimization()

    # --- Assertions ---
    assert action is not None, "An OptimizationAction should have been returned for high latency"
    assert isinstance(action, OptimizationAction)
    assert action.action_type == 'infrastructure'
    assert action.target == 'instance_type'
    assert action.current_value == 'n2-standard-4'
    assert action.proposed_value == 'n2-standard-8', "Should propose scaling up"
    assert action.confidence >= 0.9

    # Verify the correct SQL query was executed
    mock_cursor.execute.assert_called_once()
    query_string = mock_cursor.execute.call_args[0][0]
    assert "details->>'executionTimeMs'" in query_string
    assert "INTERVAL '15 minute'" in query_string

@pytest.mark.asyncio
async def test_does_not_recommend_scaling_for_low_latency(optimizer):
    """
    Verify that the optimizer does not recommend scaling when latency is within
    the acceptable threshold.
    """
    # Mock the database cursor to simulate low average latency (e.g., 500ms)
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = (500.0,)
    
    mock_context_manager = MagicMock()
    mock_context_manager.__enter__.return_value = mock_cursor
    mock_context_manager.__exit__.return_value = None
    
    optimizer.db_conn.cursor.return_value = mock_context_manager

    # Run the analysis
    action = await optimizer._analyze_infrastructure_optimization()

    # --- Assertions ---
    assert action is None, "No action should be recommended for low latency"
    mock_cursor.execute.assert_called_once()