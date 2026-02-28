"""
Dead Letter Queue (DLQ) System for Alpha-Orion Brain Orchestrator

Provides Redis-based message queue with DLQ support for failed tasks.
Implements retry logic with configurable attempts and dead letter storage.
"""

import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
import redis

logger = logging.getLogger(__name__)


class DeadLetterQueue:
    """
    Redis-based queue with Dead Letter Queue support.
    
    Features:
    - Main task queue with FIFO processing
    - Automatic retry with configurable attempts
    - DLQ for permanently failed messages
    - Message TTL for automatic cleanup
    - Priority support
    """
    
    # Queue key prefixes
    MAIN_QUEUE_PREFIX = "alpha:queue:tasks"
    DLQ_PREFIX = "alpha:queue:dlq"
    PROCESSING_PREFIX = "alpha:queue:processing"
    RETRY_COUNT_PREFIX = "alpha:queue:retry"
    
    def __init__(
        self,
        redis_client: redis.Redis,
        max_retries: int = 3,
        retry_delay: float = 5.0,
        message_ttl: int = 86400,  # 24 hours
        dlq_ttl: int = 604800  # 7 days
    ):
        """
        Initialize the Dead Letter Queue system.
        
        Args:
            redis_client: Redis client instance
            max_retries: Maximum retry attempts before moving to DLQ
            retry_delay: Delay between retries in seconds
            message_ttl: Time to live for main queue messages (seconds)
            dlq_ttl: Time to live for DLQ messages (seconds)
        """
        self.redis = redis_client
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.message_ttl = message_ttl
        self.dlq_ttl = dlq_ttl
        
        # Lua script for atomic pop and push to processing
        self._pop_script = """
        local queue = KEYS[1]
        local item = redis.call('LPOP', queue)
        if item then
            redis.call('RPUSH', KEYS[2] .. ':' .. ARGV[1], item)
            redis.call('EXPIRE', KEYS[2] .. ':' .. ARGV[1], ARGV[2])
        end
        return item
        """
        
        logger.info(
            f"DLQ initialized: max_retries={max_retries}, "
            f"retry_delay={retry_delay}s, ttl={message_ttl}s"
        )
    
    def _get_main_queue_key(self, queue_name: str = "default") -> str:
        """Get the main queue key."""
        return f"{self.MAIN_QUEUE_PREFIX}:{queue_name}"
    
    def _get_dlq_key(self) -> str:
        """Get the DLQ key."""
        return self.DLQ_PREFIX
    
    def _get_processing_key(self, worker_id: str) -> str:
        """Get the processing queue key for a worker."""
        return f"{self.PROCESSING_PREFIX}:{worker_id}"
    
    def _get_retry_key(self, message_id: str) -> str:
        """Get the retry count key for a message."""
        return f"{self.RETRY_COUNT_PREFIX}:{message_id}"
    
    def enqueue(
        self,
        message: Dict[str, Any],
        queue_name: str = "default",
        priority: int = 0
    ) -> str:
        """
        Add a message to the main queue.
        
        Args:
            message: Message payload (will be serialized to JSON)
            queue_name: Name of the queue
            priority: Message priority (higher = processed first)
            
        Returns:
            Message ID
        """
        message_id = str(uuid.uuid4())
        
        # Add metadata to message
        envelope = {
            "id": message_id,
            "payload": message,
            "priority": priority,
            "enqueued_at": datetime.utcnow().isoformat(),
            "retry_count": 0,
            "status": "queued"
        }
        
        # Serialize and push to queue
        payload = json.dumps(envelope)
        
        if priority > 0:
            # Use sorted set for priority queue
            self.redis.zadd(
                self._get_main_queue_key(queue_name),
                {payload: -priority}  # Negative for descending order
            )
        else:
            # Use list for FIFO queue
            self.redis.rpush(self._get_main_queue_key(queue_name), payload)
        
        # Set TTL
        self.redis.expire(self._get_main_queue_key(queue_name), self.message_ttl)
        
        logger.debug(f"Enqueued message {message_id} to queue '{queue_name}'")
        
        return message_id
    
    def dequeue(
        self,
        queue_name: str = "default",
        worker_id: str = "worker-1",
        block: bool = True,
        timeout: int = 5
    ) -> Optional[Dict[str, Any]]:
        """
        Get a message from the queue for processing.
        
        Args:
            queue_name: Name of the queue
            worker_id: ID of the worker processing the message
            block: Whether to block waiting for a message
            timeout: Block timeout in seconds
            
        Returns:
            Message envelope or None if queue is empty
        """
        queue_key = self._get_main_queue_key(queue_name)
        
        if block:
            # Use BLPOP for blocking pop
            result = self.redis.blpop(queue_key, timeout=timeout)
            if result:
                _, payload = result
            else:
                return None
        else:
            payload = self.redis.lpop(queue_key)
            if not payload:
                return None
        
        try:
            envelope = json.loads(payload)
            envelope["status"] = "processing"
            envelope["started_at"] = datetime.utcnow().isoformat()
            
            # Move to processing queue for tracking
            processing_key = self._get_processing_key(worker_id)
            self.redis.rpush(processing_key, json.dumps(envelope))
            self.redis.expire(processing_key, self.message_ttl * 2)
            
            logger.debug(f"Dequeued message {envelope['id']} for worker {worker_id}")
            
            return envelope
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode message: {e}")
            return None
    
    def ack(
        self,
        message_id: str,
        worker_id: str = "worker-1"
    ) -> bool:
        """
        Acknowledge successful processing of a message.
        
        Args:
            message_id: ID of the message to acknowledge
            worker_id: ID of the worker that processed the message
            
        Returns:
            True if acknowledged successfully
        """
        processing_key = self._get_processing_key(worker_id)
        
        # Find and remove the message from processing queue
        items = self.redis.lrange(processing_key, 0, -1)
        
        for i, item in enumerate(items):
            try:
                envelope = json.loads(item)
                if envelope.get("id") == message_id:
                    self.redis.lrem(processing_key, 1, item)
                    
                    # Remove retry count
                    self.redis.delete(self._get_retry_key(message_id))
                    
                    logger.info(f"Acknowledged message {message_id}")
                    return True
            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Error processing queue item: {e}")
        
        return False
    
    def nack(
        self,
        message: Dict[str, Any],
        worker_id: str = "worker-1",
        error: Optional[str] = None
    ) -> bool:
        """
        Handle failed message processing - move to retry or DLQ.
        
        Args:
            message: The message envelope
            worker_id: ID of the worker that failed to process
            error: Optional error message
            
        Returns:
            True if message was requeued or moved to DLQ
        """
        message_id = message.get("id")
        retry_count = message.get("retry_count", 0)
        
        # Remove from processing queue
        processing_key = self._get_processing_key(worker_id)
        self.redis.lrem(processing_key, 1, json.dumps(message))
        
        if retry_count >= self.max_retries:
            # Move to DLQ
            return self._move_to_dlq(message, error or "Max retries exceeded")
        else:
            # Requeue with incremented retry count
            return self._requeue_with_retry(message, retry_count + 1)
    
    def _requeue_with_retry(
        self,
        message: Dict[str, Any],
        new_retry_count: int
    ) -> bool:
        """Requeue a message with incremented retry count."""
        message["retry_count"] = new_retry_count
        message["status"] = "queued"
        message["last_retry_at"] = datetime.utcnow().isoformat()
        
        # Store retry count
        self.redis.set(
            self._get_retry_key(message["id"]),
            new_retry_count,
            ex=self.message_ttl
        )
        
        # Requeue with delay (using sorted set for delayed processing)
        queue_key = self._get_main_queue_key("default")
        delay = self.retry_delay * (2 ** (new_retry_count - 1))  # Exponential backoff
        
        score = time.time() + delay
        self.redis.zadd(
            queue_key,
            {json.dumps(message): score}
        )
        
        logger.info(
            f"Message {message['id']} requeued for retry "
            f"(attempt {new_retry_count}/{self.max_retries})"
        )
        
        return True
    
    def _move_to_dlq(
        self,
        message: Dict[str, Any],
        reason: str
    ) -> bool:
        """Move a permanently failed message to the DLQ."""
        message["status"] = "dead_lettered"
        message["failed_at"] = datetime.utcnow().isoformat()
        message["failure_reason"] = reason
        
        dlq_key = self._get_dlq_key()
        
        # Add to DLQ
        self.redis.rpush(dlq_key, json.dumps(message))
        self.redis.expire(dlq_key, self.dlq_ttl)
        
        # Remove retry count
        self.redis.delete(self._get_retry_key(message["id"]))
        
        logger.warning(
            f"Message {message['id']} moved to DLQ: {reason}"
        )
        
        return True
    
    def get_dlq_messages(
        self,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get messages from the DLQ.
        
        Args:
            limit: Maximum number of messages to retrieve
            offset: Offset from the start
            
        Returns:
            List of DLQ messages
        """
        dlq_key = self._get_dlq_key()
        items = self.redis.lrange(dlq_key, offset, offset + limit - 1)
        
        messages = []
        for item in items:
            try:
                messages.append(json.loads(item))
            except json.JSONDecodeError:
                logger.warning("Failed to parse DLQ message")
        
        return messages
    
    def retry_dlq_message(
        self,
        message_id: str,
        queue_name: str = "default"
    ) -> bool:
        """
        Retry a message from the DLQ.
        
        Args:
            message_id: ID of the message to retry
            queue_name: Queue to retry to
            
        Returns:
            True if message was retried successfully
        """
        dlq_messages = self.get_dlq_messages(limit=1000)
        
        for message in dlq_messages:
            if message.get("id") == message_id:
                # Reset message for retry
                message["retry_count"] = 0
                message["status"] = "queued"
                message["retried_at"] = datetime.utcnow().isoformat()
                
                # Remove from DLQ
                dlq_key = self._get_dlq_key()
                self.redis.lrem(dlq_key, 1, json.dumps(message))
                
                # Requeue
                self.enqueue(message["payload"], queue_name)
                
                logger.info(f"DLQ message {message_id} retried")
                return True
        
        return False
    
    def clear_dlq(self) -> int:
        """
        Clear all messages from the DLQ.
        
        Returns:
            Number of messages cleared
        """
        dlq_key = self._get_dlq_key()
        count = self.redis.llen(dlq_key)
        self.redis.delete(dlq_key)
        
        logger.info(f"DLQ cleared: {count} messages removed")
        return count
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """
        Get queue statistics.
        
        Returns:
            Dictionary with queue stats
        """
        stats = {
            "main_queues": {},
            "dlq_size": self.redis.llen(self._get_dlq_key()),
            "processing_queues": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Get all queue keys
        queue_keys = self.redis.keys(f"{self.MAIN_QUEUE_PREFIX}:*")
        for key in queue_keys:
            queue_name = key.decode() if isinstance(key, bytes) else key
            queue_name = queue_name.replace(f"{self.MAIN_QUEUE_PREFIX}:", "")
            stats["main_queues"][queue_name] = self.redis.zcard(key) + self.redis.llen(key)
        
        # Get processing queue keys
        proc_keys = self.redis.keys(f"{self.PROCESSING_PREFIX}:*")
        for key in proc_keys:
            worker_id = key.decode() if isinstance(key, bytes) else key
            worker_id = worker_id.replace(f"{self.PROCESSING_PREFIX}:", "")
            stats["processing_queues"][worker_id] = self.redis.llen(key)
        
        return stats


class DLQProcessor:
    """
    Worker class for processing queue messages with DLQ support.
    """
    
    def __init__(
        self,
        dlq: DeadLetterQueue,
        worker_id: str = "worker-1",
        queue_name: str = "default"
    ):
        self.dlq = dlq
        self.worker_id = worker_id
        self.queue_name = queue_name
        self._running = False
        
    def process_message(
        self,
        handler: Callable[[Dict[str, Any]], bool],
        message: Dict[str, Any]
    ) -> bool:
        """
        Process a message with the given handler.
        
        Args:
            handler: Function to process the message (should return True on success)
            message: Message to process
            
        Returns:
            True if processing succeeded
        """
        message_id = message.get("id")
        payload = message.get("payload", {})
        
        try:
            logger.info(f"Processing message {message_id}")
            
            # Call the handler
            success = handler(payload)
            
            if success:
                self.dlq.ack(message_id, self.worker_id)
                return True
            else:
                # Handler returned False - treat as failure
                return self._handle_failure(message, "Handler returned False")
                
        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}")
            return self._handle_failure(message, str(e))
    
    def _handle_failure(
        self,
        message: Dict[str, Any],
        error: str
    ) -> bool:
        """Handle message processing failure."""
        return self.dlq.nack(message, self.worker_id, error)
    
    def run(
        self,
        handler: Callable[[Dict[str, Any]], bool],
        max_iterations: Optional[int] = None
    ):
        """
        Run the worker loop.
        
        Args:
            handler: Message handler function
            max_iterations: Maximum number of messages to process (None for infinite)
        """
        self._running = True
        iterations = 0
        
        logger.info(f"Starting DLQ processor: worker_id={self.worker_id}")
        
        while self._running:
            if max_iterations and iterations >= max_iterations:
                break
            
            # Try to get a message
            message = self.dlq.dequeue(
                queue_name=self.queue_name,
                worker_id=self.worker_id,
                block=True,
                timeout=5
            )
            
            if message:
                self.process_message(handler, message)
                iterations += 1
            else:
                # No message available, continue polling
                time.sleep(0.1)
        
        logger.info(f"DLQ processor stopped: processed {iterations} messages")
    
    def stop(self):
        """Stop the worker."""
        self._running = False


def create_dlq_from_redis_url(redis_url: str, **kwargs) -> DeadLetterQueue:
    """
    Create a DLQ instance from a Redis URL.
    
    Args:
        redis_url: Redis connection URL
        **kwargs: Additional arguments for DeadLetterQueue
        
    Returns:
        DeadLetterQueue instance
    """
    client = redis.from_url(redis_url)
    return DeadLetterQueue(client, **kwargs)
