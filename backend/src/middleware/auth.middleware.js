/**
 * Authentication Middleware
 *
 * Verifies JWT access tokens and protects routes that require authentication.
 * Extracts the JWT from the Authorization header, validates it, and attaches
 * the decoded user information to the request object.
 *
 * Expected header format: "Authorization: Bearer <token>"
 */

const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/security');
const { sendError } = require('../utils/response.helper');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT access token
 *
 * Checks for valid JWT in Authorization header. On success, attaches decoded
 * user data to req.user. On failure, returns 401 Unauthorized.
 *
 * Usage: app.use(verifyAccessToken) for protected routes
 * or: router.get('/protected', verifyAccessToken, controller)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyAccessToken = (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Expected format: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Missing Authorization header');
      return sendError(res, 'Authorization header is required', 401);
    }

    // Verify format is "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      logger.warn('Invalid Authorization header format');
      return sendError(res, 'Invalid Authorization header format', 401);
    }

    const token = parts[1];

    // Verify and decode the token
    // jwt.verify will throw if token is invalid or expired
    const decoded = jwt.verify(token, JWT_CONFIG.accessSecret);

    // Attach user data to request object for use in route handlers
    // This allows controllers to access req.user.id, req.user.username, etc.
    req.user = decoded;

    // Call next middleware/route handler
    next();
  } catch (error) {
    // Handle specific JWT errors with appropriate responses
    if (error.name === 'TokenExpiredError') {
      logger.warn('JWT token expired');
      return sendError(
        res,
        'Token has expired, please refresh',
        401
      );
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token:', error.message);
      return sendError(
        res,
        'Invalid token, authentication failed',
        401
      );
    }

    // Unexpected errors (shouldn't happen in normal operation)
    logger.error('Token verification error:', error.message);
    return sendError(
      res,
      'Authentication failed',
      401
    );
  }
};

module.exports = {
  verifyAccessToken
};
