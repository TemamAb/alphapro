const { createClient } = require('redis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  logger.warn('REDIS_URL not configured - Redis features will be disabled');
} else {
  const maskedUrl = REDIS_URL.replace(/\/\/([^:]+):([^@]+)@/, '//***:****@');
  logger.info({ url: maskedUrl }, 'Redis URL configuration detected');
}

let redisClient = null;
let redisSubscriber = null;

if (REDIS_URL && REDIS_URL.trim() !== '') {
  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Max reconnection attempts reached');
          return Math.min(retries * 200, 3000);
        },
        connectTimeout: 10000,
        commandTimeout: 5000
      }
    });

    redisSubscriber = redisClient.duplicate();

    redisClient.on('error', (err) => logger.error({ err }, 'Redis Client Error'));
    redisSubscriber.on('error', (err) => logger.error({ err }, 'Redis Subscriber Error'));

    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready and connected');
    });

    redisClient.on('disconnected', () => {
      logger.warn({}, 'Redis disconnected but application continues');
    });
  } catch (createErr) {
    logger.error({ err: createErr }, 'Failed to create Redis clients');
    redisClient = null;
    redisSubscriber = null;
  }
} else {
  logger.warn('Skipping Redis initialization due to missing/invalid REDIS_URL');
}

const connectRedis = async () => {
  if (!REDIS_URL || !redisClient) {
    logger.info('Skipping Redis connection - REDIS_URL not configured');
    return false;
  }

  try {
    if (redisClient.isOpen) {
      logger.info('Redis already connected');
      return true;
    }

    await redisClient.connect();

    if (redisSubscriber && !redisSubscriber.isOpen) {
      await redisSubscriber.connect();
    }

    logger.info('Successfully connected to Redis');
    return true;
  } catch (e) {
    logger.error({ err: e }, 'Failed to connect to Redis - continuing without Redis');
    redisClient = null;
    redisSubscriber = null;
    return false;
  }
};

module.exports = { redisClient, redisSubscriber, connectRedis };
