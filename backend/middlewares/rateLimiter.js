// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');

// 1. Initialize Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    // Retry connection automatically so when container spins up later, it connects immediately
    reconnectStrategy: (retries) => Math.min(retries * 500, 3000),
  },
});

// Event listener: Log when Redis container is connected and ready
redisClient.on('ready', () => {
  console.log('⚡ Connected to Redis for rate limiting successfully!');
});

// Suppress raw error logs when Redis container is offline
redisClient.on('error', () => {});

// Connect asynchronously on startup
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('⚠️ Redis offline. Rate limiter automatically using in-memory fallback.');
  }
})();

// 2. Auth Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Keep production strict, but do not make local UI testing wait 15 minutes.
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true, // Allow requests through if Redis store is unavailable
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  store: new RedisStore({
    prefix: 'auth:',
    sendCommand: async (...args) => {
      // If Redis is not ready yet, return empty string to prevent store initialization errors
      if (!redisClient.isReady) {
        return '';
      }
      return await redisClient.sendCommand(args);
    },
  }),
});

module.exports = {
  authLimiter,
};
