// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
let redisStore;
if (process.env.USE_REDIS_RATE_LIMITER === 'true') {
  const { RedisStore } = require('rate-limit-redis');
  const { createClient } = require('redis');
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    socket: { reconnectStrategy: (retries) => retries > 3 ? false : Math.min(retries * 500, 1500) },
  });
  redisClient.on('ready', () => console.log('Connected to Redis for rate limiting.'));
  redisClient.on('error', (error) => console.warn('Redis rate limiter error:', error.message));
  redisClient.connect().catch((error) => console.warn('Redis rate limiter unavailable:', error.message));
  redisStore = new RedisStore({ prefix: 'auth:', sendCommand: (...args) => redisClient.sendCommand(args) });
}

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
  ...(redisStore ? { store: redisStore } : {}),
});

module.exports = {
  authLimiter,
};
