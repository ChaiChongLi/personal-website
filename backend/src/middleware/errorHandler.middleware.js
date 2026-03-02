/**
 * Global Error Handler Middleware
 *
 * Catches all errors from routes and other middleware, providing consistent
 * error responses throughout the application. Never exposes sensitive details
 * (like stack traces or database errors) to clients in production.
 *
 * This must be the last middleware registered in the Express app to catch
 * errors from all other middleware and routes.
 *
 * Usage: app.use(errorHandler) - MUST be registered after all other middleware
 */

const { sendError } = require('../utils/response.helper');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 *
 * Express error handlers must have 4 parameters (err, req, res, next)
 * even if next is not used. This is how Express identifies them as error handlers.
 *
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (unused but required)
 */
const errorHandler = (err, req, res, next) => {
  // Log all errors for debugging and monitoring
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Extract error status code if available, default to 500
  const statusCode = err.statusCode || err.status || 500;

  // ========================================================================
  // INPUT VALIDATION ERRORS (from express-validator)
  // ========================================================================
  if (err.array && typeof err.array === 'function') {
    // This is an express-validator error
    const validationErrors = err.array().map(error => ({
      field: error.param,
      message: error.msg
    }));

    return sendError(
      res,
      'Validation failed',
      400,
      validationErrors
    );
  }

  // ========================================================================
  // SYNTAX ERRORS (malformed JSON, etc.)
  // ========================================================================
  if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON in request body
    return sendError(
      res,
      'Invalid JSON in request body',
      400
    );
  }

  // ========================================================================
  // DATABASE ERRORS
  // ========================================================================
  if (err.code && err.code.startsWith('ER_')) {
    // MySQL error - don't expose database details to client
    logger.error('Database error details:', {
      code: err.code,
      sqlState: err.sqlState,
      message: err.message
    });

    // Return generic message to client
    if (err.code === 'ER_DUP_ENTRY') {
      return sendError(res, 'This record already exists', 409);
    }

    if (err.code === 'ER_NO_REFERENCED_ROW') {
      return sendError(res, 'Referenced record not found', 404);
    }

    // Generic database error message
    return sendError(
      res,
      'Database operation failed',
      500
    );
  }

  // ========================================================================
  // JWT ERRORS
  // ========================================================================
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token expired', 401);
  }

  // ========================================================================
  // CUSTOM APPLICATION ERRORS
  // ========================================================================
  if (err.isCustomError) {
    return sendError(
      res,
      err.message,
      err.statusCode || 400
    );
  }

  // ========================================================================
  // GENERIC ERROR RESPONSE
  // ========================================================================
  // In production, never expose stack traces or implementation details
  const message = process.env.NODE_ENV === 'production'
    ? 'An error occurred processing your request'
    : err.message || 'Internal server error';

  return sendError(
    res,
    message,
    statusCode
  );
};

module.exports = errorHandler;
