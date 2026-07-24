const rateLimit = require('express-rate-limit');

// 1. General Limiter for standard API routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// 2. Strict Limiter for sensitive Auth routes (login, signup, refresh-token)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // Limit each IP to only 10 failed/successful auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login/signup attempts from this IP. Please try again after 15 minutes for security reasons.'
  }
});

module.exports = {
  globalLimiter,
  authLimiter
};