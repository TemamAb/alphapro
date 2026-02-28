"""
Error Notification Module for Alpha-Orion
Sends real-time error alerts via Telegram, Discord, or custom webhooks.
Lightweight with no external dependencies beyond requests.
"""

import os
import json
import logging
import threading
import datetime
import traceback
from typing import Optional, Dict, Any

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

logger = logging.getLogger(__name__)


class ErrorNotifier:
    """
    Sends error notifications to Telegram, Discord, or custom HTTP webhooks.
    Only sends notifications if webhook URLs are configured in environment variables.
    """
    
    def __init__(self):
        # Load configuration from environment variables
        self.telegram_bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.telegram_chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.discord_webhook_url = os.getenv('DISCORD_WEBHOOK_URL')
        self.custom_webhook_url = os.getenv('ERROR_WEBHOOK_URL')
        
        # Check if any notifications are configured
        self.enabled = any([
            self.telegram_bot_token and self.telegram_chat_id,
            self.discord_webhook_url,
            self.custom_webhook_url
        ])
        
        # Async notification settings
        self._async = os.getenv('ERROR_NOTIFIER_ASYNC', 'true').lower() == 'true'
        
        if self.enabled:
            logger.info("✅ Error Notifier initialized - notifications enabled")
            if self.telegram_bot_token and self.telegram_chat_id:
                logger.info("   📱 Telegram notifications enabled")
            if self.discord_webhook_url:
                logger.info("   💬 Discord notifications enabled")
            if self.custom_webhook_url:
                logger.info("   🌐 Custom webhook notifications enabled")
        else:
            logger.info("ℹ️  Error Notifier initialized - no webhook URLs configured (notifications disabled)")
    
    def _format_error_message(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Format error details into a structured message."""
        timestamp = datetime.datetime.utcnow().isoformat() + 'Z'
        
        message = {
            "timestamp": timestamp,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "stack_trace": traceback.format_exc(),
        }
        
        if context:
            message["context"] = context
        
        return message
    
    def _send_telegram(self, message: Dict[str, Any]) -> bool:
        """Send notification to Telegram."""
        if not self.telegram_bot_token or not self.telegram_chat_id:
            return False
        
        if not REQUESTS_AVAILABLE:
            logger.warning("requests library not available - cannot send Telegram notification")
            return False
        
        try:
            # Format message for Telegram (markdown)
            text = f"🚨 *Alpha-Orion Error Alert*\n\n"
            text += f"*Time:* `{message['timestamp']}`\n"
            text += f"*Type:* `{message['error_type']}`\n"
            text += f"*Message:* `{message['error_message']}`\n"
            
            if message.get('context'):
                text += f"\n*Context:*\n"
                for key, value in message['context'].items():
                    text += f"  - {key}: `{value}`\n"
            
            # Truncate if too long
            if len(text) > 4000:
                text = text[:3990] + "```\n(truncated)"
            
            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
            data = {
                "chat_id": self.telegram_chat_id,
                "text": text,
                "parse_mode": "Markdown"
            }
            
            response = requests.post(url, json=data, timeout=10)
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return False
    
    def _send_discord(self, message: Dict[str, Any]) -> bool:
        """Send notification to Discord via webhook."""
        if not self.discord_webhook_url:
            return False
        
        if not REQUESTS_AVAILABLE:
            logger.warning("requests library not available - cannot send Discord notification")
            return False
        
        try:
            # Build Discord embed
            embed = {
                "title": "🚨 Alpha-Orion Error Alert",
                "color": 16711680,  # Red
                "timestamp": message['timestamp'],
                "fields": [
                    {
                        "name": "Error Type",
                        "value": f"```{message['error_type']}```",
                        "inline": True
                    },
                    {
                        "name": "Message",
                        "value": f"```{message['error_message'][:1000]}```",
                        "inline": False
                    }
                ],
                "footer": {
                    "text": "Alpha-Orion Trading System"
                }
            }
            
            if message.get('context'):
                context_str = "\n".join([f"**{k}:** {v}" for k, v in message['context'].items()])
                embed["fields"].append({
                    "name": "Context",
                    "value": f"```{context_str[:1000]}```",
                    "inline": False
                })
            
            # Add stack trace as additional field (truncated)
            if message.get('stack_trace'):
                stack = message['stack_trace']
                if len(stack) > 1000:
                    stack = stack[:997] + "..."
                embed["fields"].append({
                    "name": "Stack Trace",
                    "value": f"```{stack}```",
                    "inline": False
                })
            
            payload = {
                "embeds": [embed],
                "username": "Alpha-Orion Error Alert"
            }
            
            response = requests.post(
                self.discord_webhook_url,
                json=payload,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            return response.status_code in [200, 204]
            
        except Exception as e:
            logger.error(f"Failed to send Discord notification: {e}")
            return False
    
    def _send_custom_webhook(self, message: Dict[str, Any]) -> bool:
        """Send notification to custom HTTP webhook."""
        if not self.custom_webhook_url:
            return False
        
        if not REQUESTS_AVAILABLE:
            logger.warning("requests library not available - cannot send custom webhook notification")
            return False
        
        try:
            response = requests.post(
                self.custom_webhook_url,
                json=message,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            return response.status_code in [200, 201, 204]
            
        except Exception as e:
            logger.error(f"Failed to send custom webhook notification: {e}")
            return False
    
    def notify(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Send error notification to all configured channels.
        Runs asynchronously by default to not block the main thread.
        """
        if not self.enabled:
            return
        
        message = self._format_error_message(error, context)
        
        if self._async:
            thread = threading.Thread(
                target=self._send_notifications,
                args=(message,),
                daemon=True
            )
            thread.start()
        else:
            self._send_notifications(message)
    
    def _send_notifications(self, message: Dict[str, Any]) -> None:
        """Send notifications to all configured channels."""
        results = []
        
        # Send to Telegram
        if self.telegram_bot_token and self.telegram_chat_id:
            result = self._send_telegram(message)
            results.append(("Telegram", result))
        
        # Send to Discord
        if self.discord_webhook_url:
            result = self._send_discord(message)
            results.append(("Discord", result))
        
        # Send to custom webhook
        if self.custom_webhook_url:
            result = self._send_custom_webhook(message)
            results.append(("Custom Webhook", result))
        
        # Log results
        for channel, success in results:
            if success:
                logger.info(f"✅ Error notification sent via {channel}")
            else:
                logger.warning(f"❌ Failed to send error notification via {channel}")
    
    def notify_sync(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Send error notification synchronously (blocking).
        Use this when you need to ensure the notification is sent before continuing.
        """
        if not self.enabled:
            return
        
        message = self._format_error_message(error, context)
        self._send_notifications(message)


# Global instance for easy import
_error_notifier = None


def get_error_notifier() -> ErrorNotifier:
    """Get or create the global ErrorNotifier instance."""
    global _error_notifier
    if _error_notifier is None:
        _error_notifier = ErrorNotifier()
    return _error_notifier


def notify_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
    """
    Convenience function to send error notification.
    Usage: notify_error(exception, {"endpoint": "/api/trade"})
    """
    notifier = get_error_notifier()
    notifier.notify(error, context)


# Decorator for automatic error notification
def with_error_notification(context: Optional[Dict[str, Any]] = None):
    """
    Decorator to automatically send error notifications when a function raises an exception.
    
    Usage:
        @with_error_notification({"service": "trading"})
        def my_function():
            ...
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Add function name to context
                ctx = context or {}
                ctx["function"] = func.__name__
                notify_error(e, ctx)
                raise  # Re-raise the exception after notification
        return wrapper
    return decorator
