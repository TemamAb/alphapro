# Error Notification Setup Guide

Alpha-Orion uses a free, API-based error notification system that sends real-time alerts via Telegram, Discord, or custom webhooks. This replaces Sentry with a more immediate notification system better suited for trading systems.

## Configuration

Add these environment variables to your Render dashboard or `.env` file:

### Telegram Setup (Free)

1. **Create a Telegram Bot:**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` to create a new bot
   - Follow the prompts and get your **Bot Token** (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Get Your Chat ID:**
   - Search for `@userinfobot` in Telegram
   - Send `/start` to get your **Chat ID** (e.g., `123456789`)

3. **Configure in Render:**
   ```
   TELEGRAM_BOT_TOKEN = your_bot_token_here
   TELEGRAM_CHAT_ID = your_chat_id_here
   ```

### Discord Setup (Free)

1. **Create a Discord Webhook:**
   - Open your Discord Server Settings
   - Go to **Integrations** > **Webhooks**
   - Click **New Webhook**
   - Choose a channel and give it a name
   - Copy the **Webhook URL** (e.g., `https://discord.com/api/webhooks/123456789/abcdef...`)

2. **Configure in Render:**
   ```
   DISCORD_WEBHOOK_URL = your_webhook_url_here
   ```

### Custom Webhook Setup

You can use any HTTP endpoint that accepts JSON POST requests:

1. **Configure in Render:**
   ```
   ERROR_WEBHOOK_URL = https://your-endpoint.com/webhook
   ```

2. **Payload Format:**
   ```json
   {
     "timestamp": "2025-01-01T12:00:00.000Z",
     "hostname": "your-server",
     "error_type": "Exception",
     "error_message": "Error message here",
     "stack_trace": "Full stack trace...",
     "context": {
       "endpoint": "/api/trade",
       "user": "admin"
     }
   }
   ```

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | No | Telegram Bot API token |
| `TELEGRAM_CHAT_ID` | No | Telegram Chat ID to send alerts to |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook URL |
| `ERROR_WEBHOOK_URL` | No | Custom HTTP webhook endpoint |
| `ERROR_NOTIFIER_ASYNC` | No | Set to `false` for sync notifications (default: `true`) |

## Notification Features

- **Real-time alerts**: Errors are sent immediately when they occur
- **Rich formatting**: Telegram and Discord messages include error type, message, timestamp, and stack trace
- **Optional**: Notifications only send if webhook URLs are configured
- **Async by default**: Notifications don't block the main application thread
- **Multiple channels**: Can send to Telegram, Discord, AND custom webhook simultaneously

## Testing

To test your notifications, trigger an error in the application or use the API endpoint. You should receive real-time messages in your configured channels.

## Security Notes

- Never commit webhook URLs or bot tokens to version control
- Use Render's secret management for production credentials
- The notifications include stack traces - ensure your channels are private if handling sensitive data
