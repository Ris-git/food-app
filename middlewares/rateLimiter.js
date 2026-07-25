// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');

// 1. Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 3) return new Error('Redis connection retries exhausted');
      return 500;
    },
  },
});

// Suppress unhandled error logs when Redis container is not running
redisClient.on('error', () => {});

// Connect asynchronously on startup
(async () => {
  try {
    await redisClient.connect();
    console.log('⚡ Connected to Redis for rate limiting successfully!');
  } catch (err) {
    console.warn('⚠️ Redis offline. Rate limiter automatically using in-memory fallback.');
  }
})();

// 2. Auth Limiter (Uses RedisStore if connected, otherwise defaults to in-memory store)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  ...(redisClient.isOpen && {
    store: new RedisStore({
      prefix: 'auth:',
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
  }),
});

module.exports = {
  authLimiter,
};

//question - what if redis is not up , do i create a fallback logic for it like using in memory store..