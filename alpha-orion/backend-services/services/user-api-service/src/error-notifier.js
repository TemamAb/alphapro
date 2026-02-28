/**
 * Error Notification Module for Alpha-Orion
 * Sends real-time error alerts via Telegram, Discord, or custom webhooks.
 * Lightweight - uses built-in http/https modules, no external dependencies.
 */

const http = require('http');
const https = require('https');
const os = require('os');
const { URL } = require('url');

class ErrorNotifier {
  constructor() {
    // Load configuration from environment variables
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    this.customWebhookUrl = process.env.ERROR_WEBHOOK_URL;
    
    // Check if any notifications are configured
    this.enabled = !!(
      (this.telegramBotToken && this.telegramChatId) ||
      this.discordWebhookUrl ||
      this.customWebhookUrl
    );
    
    // Async notification settings
    this.async = process.env.ERROR_NOTIFIER_ASYNC !== 'false';
    
    // Track notifications for logging
    this.hostname = os.hostname();
    
    if (this.enabled) {
      console.log('✅ Error Notifier initialized - notifications enabled');
      if (this.telegramBotToken && this.telegramChatId) {
        console.log('   📱 Telegram notifications enabled');
      }
      if (this.discordWebhookUrl) {
        console.log('   💬 Discord notifications enabled');
      }
      if (this.customWebhookUrl) {
        console.log('   🌐 Custom webhook notifications enabled');
      }
    } else {
      console.log('ℹ️  Error Notifier initialized - no webhook URLs configured (notifications disabled)');
    }
  }
  
  /**
   * Make HTTP/HTTPS request
   */
  _makeRequest(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(data)),
          ...headers
        },
        timeout: 10000
      };
      
      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, body });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(JSON.stringify(data));
      req.end();
    });
  }
  
  /**
   * Format error details into a structured message
   */
  _formatErrorMessage(error, context = null) {
    const timestamp = new Date().toISOString() + 'Z';
    
    const message = {
      timestamp,
      hostname: this.hostname,
      error_type: error.constructor.name,
      error_message: error.message,
      stack_trace: error.stack || 'No stack trace available'
    };
    
    if (context) {
      message.context = context;
    }
    
    return message;
  }
  
  /**
   * Send notification to Telegram
   */
  async _sendTelegram(message) {
    if (!this.telegramBotToken || !this.telegramChatId) {
      return false;
    }
    
    try {
      // Format message for Telegram (markdown)
      let text = `🚨 *Alpha-Orion Error Alert*\n\n`;
      text += `*Time:* \`${message.timestamp}\`\n`;
      text += `*Host:* \`${message.hostname}\`\n`;
      text += `*Type:* \`${message.error_type}\`\n`;
      text += `*Message:* \`${message.error_message}\`\n`;
      
      if (message.context) {
        text += `\n*Context:*\n`;
        for (const [key, value] of Object.entries(message.context)) {
          text += `  - ${key}: \`${value}\`\n`;
        }
      }
      
      // Truncate if too long
      if (text.length > 4000) {
        text = text.substring(0, 3990) + '```\n(truncated)';
      }
      
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      const data = {
        chat_id: this.telegramChatId,
        text: text,
        parse_mode: 'Markdown'
      };
      
      await this._makeRequest(url, data);
      return true;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error.message);
      return false;
    }
  }
  
  /**
   * Send notification to Discord via webhook
   */
  async _sendDiscord(message) {
    if (!this.discordWebhookUrl) {
      return false;
    }
    
    try {
      // Build Discord embed
      const embed = {
        title: '🚨 Alpha-Orion Error Alert',
        color: 16711680, // Red
        timestamp: message.timestamp,
        fields: [
          {
            name: 'Host',
            value: `\`${message.hostname}\``,
            inline: true
          },
          {
            name: 'Error Type',
            value: `\`\`\`${message.error_type}\`\`\``,
            inline: true
          },
          {
            name: 'Message',
            value: `\`\`\`${message.error_message.substring(0, 1000)}\`\`\``,
            inline: false
          }
        ],
        footer: {
          text: 'Alpha-Orion Trading System'
        }
      };
      
      if (message.context) {
        const contextStr = Object.entries(message.context)
          .map(([k, v]) => `**${k}:** ${v}`)
          .join('\n');
        embed.fields.push({
          name: 'Context',
          value: `\`\`\`${contextStr.substring(0, 1000)}\`\`\``,
          inline: false
        });
      }
      
      // Add stack trace as additional field (truncated)
      if (message.stack_trace) {
        let stack = message.stack_trace;
        if (stack.length > 1000) {
          stack = stack.substring(0, 997) + '...';
        }
        embed.fields.push({
          name: 'Stack Trace',
          value: `\`\`\`${stack}\`\`\``,
          inline: false
        });
      }
      
      const payload = {
        embeds: [embed],
        username: 'Alpha-Orion Error Alert'
      };
      
      await this._makeRequest(this.discordWebhookUrl, payload);
      return true;
    } catch (error) {
      console.error('Failed to send Discord notification:', error.message);
      return false;
    }
  }
  
  /**
   * Send notification to custom HTTP webhook
   */
  async _sendCustomWebhook(message) {
    if (!this.customWebhookUrl) {
      return false;
    }
    
    try {
      await this._makeRequest(this.customWebhookUrl, message);
      return true;
    } catch (error) {
      console.error('Failed to send custom webhook notification:', error.message);
      return false;
    }
  }
  
  /**
   * Send error notification to all configured channels
   * Runs asynchronously by default to not block the main thread
   */
  notify(error, context = null) {
    if (!this.enabled) {
      return;
    }
    
    const message = this._formatErrorMessage(error, context);
    
    if (this.async) {
      // Run in background without waiting
      setImmediate(() => this._sendNotifications(message));
    } else {
      this._sendNotifications(message);
    }
  }
  
  /**
   * Send notifications to all configured channels (async)
   */
  async _sendNotifications(message) {
    const results = [];
    
    // Send to Telegram
    if (this.telegramBotToken && this.telegramChatId) {
      try {
        const result = await this._sendTelegram(message);
        results.push(['Telegram', result]);
      } catch (e) {
        results.push(['Telegram', false]);
      }
    }
    
    // Send to Discord
    if (this.discordWebhookUrl) {
      try {
        const result = await this._sendDiscord(message);
        results.push(['Discord', result]);
      } catch (e) {
        results.push(['Discord', false]);
      }
    }
    
    // Send to custom webhook
    if (this.customWebhookUrl) {
      try {
        const result = await this._sendCustomWebhook(message);
        results.push(['Custom Webhook', result]);
      } catch (e) {
        results.push(['Custom Webhook', false]);
      }
    }
    
    // Log results
    for (const [channel, success] of results) {
      if (success) {
        console.log(`✅ Error notification sent via ${channel}`);
      } else {
        console.error(`❌ Failed to send error notification via ${channel}`);
      }
    }
  }
  
  /**
   * Send error notification synchronously (blocking)
   * Use this when you need to ensure the notification is sent before continuing
   */
  async notifySync(error, context = null) {
    if (!this.enabled) {
      return;
    }
    
    const message = this._formatErrorMessage(error, context);
    await this._sendNotifications(message);
  }
}

// Singleton instance
let errorNotifierInstance = null;

/**
 * Get or create the global ErrorNotifier instance
 */
function getErrorNotifier() {
  if (!errorNotifierInstance) {
    errorNotifierInstance = new ErrorNotifier();
  }
  return errorNotifierInstance;
}

/**
 * Convenience function to send error notification
 * Usage: notifyError(new Error('message'), { endpoint: '/api/trade' })
 */
function notifyError(error, context = null) {
  const notifier = getErrorNotifier();
  notifier.notify(error, context);
}

/**
 * Convenience function to send error notification synchronously
 */
async function notifyErrorSync(error, context = null) {
  const notifier = getErrorNotifier();
  await notifier.notifySync(error, context);
}

/**
 * Express error handler middleware
 * Use at the end of your middleware chain
 * 
 * Usage:
 *   const { errorHandlerMiddleware } = require('./error-notifier');
 *   app.use(errorHandlerMiddleware);
 */
function errorHandlerMiddleware(err, req, res, next) {
  // Log the error first
  console.error('Error:', err.message);
  
  // Send notification
  const context = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  };
  
  notifyError(err, context);
  
  // Let the existing error handler deal with the response
  next(err);
}

module.exports = {
  ErrorNotifier,
  getErrorNotifier,
  notifyError,
  notifyErrorSync,
  errorHandlerMiddleware
};
