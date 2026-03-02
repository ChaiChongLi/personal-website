/**
 * Rate Limiter Middleware
 *
 * Implements rate limiting using express-rate-limit to prevent abuse:
 * - General limiter: 100 requests per 15 minutes (DDoS protection)
 * - Auth limiter: 5 attempts per 15 minutes (brute force protection)
 *
 * Rate limiting is essential for security and prevents:
 * - Brute force password attacks
 * - API scraping and abuse
 * - DoS attacks
 * - Excessive resource consumption
 */

const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_CONFIG } = require('../config/security');
const logger = require('../utils/logger');

/**
 * General Rate Limiter
 *
 * Applied to all API endpoints to prevent overall API abuse.
 * Allows 100 requests per 15 minutes per IP address.
 *
 * Configuration:
 * - windowMs: 15 minute time window
 * - max: 100 requests maximum
 * - message: Response message when limit exceeded
 * - standardHeaders: Include rate limit info in response headers
 * - legacyHeaders: Don't include legacy X-RateLimit-* headers
 */
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.general.windowMs,
  max: RATE_LIMIT_CONFIG.general.max,
  message: RATE_LIMIT_CONFIG.general.message,
  standardHeaders: RATE_LIMIT_CONFIG.general.standardHeaders,
  legacyHeaders: RATE_LIMIT_CONFIG.general.legacyHeaders,
  // Handler called when rate limit is exceeded
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      statusCode: 429,
      message: RATE_LIMIT_CONFIG.general.message
    });
  },
  // Skip rate limiting for health check endpoints
  skip: (req) => {
    return req.path === '/health';
  }
});

/**
 * Authentication Rate Limiter
 *
 * Applied to login and registration endpoints to prevent brute force attacks.
 * Much stricter limit: 5 attempts per 15 minutes per IP address.
 *
 * This protects against:
 * - Password guessing attacks
 * - Credential stuffing with leaked passwords
 * - Account enumeration attempts
 */
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.auth.windowMs,
  max: RATE_LIMIT_CONFIG.auth.max,
  message: RATE_LIMIT_CONFIG.auth.message,
  standardHeaders: RATE_LIMIT_CONFIG.auth.standardHeaders,
  legacyHeaders: RATE_LIMIT_CONFIG.auth.legacyHeaders,
  // Handler for auth rate limit exceeded
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, username: ${req.body.username || 'unknown'}`);
    return res.status(429).json({
      success: false,
      statusCode: 429,
      message: RATE_LIMIT_CONFIG.auth.message
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter
};
