/**
 * Response Helper Module
 *
 * Provides utility functions for sending consistent JSON responses throughout
 * the application. Ensures all API responses follow the same format, making
 * it easy for frontend developers to parse and handle responses.
 *
 * All responses include:
 * - success: boolean indicating success or failure
 * - statusCode: HTTP status code
 * - message: human-readable message
 * - data: response payload (if applicable)
 * - errors: validation errors array (if applicable)
 */

const logger = require('./logger');

/**
 * Send a successful response to the client
 *
 * @param {Object} res - Express response object
 * @param {*} data - Response payload (can be any type: object, array, null, etc.)
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data
  });
};

/**
 * Send an error response to the client
 *
 * Includes optional validation errors array for client-side form error handling.
 * Error details are not exposed to clients in production (sensitive data protection).
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message to display to user
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {Array} errors - Optional validation errors array
 *   Format: [{field: 'email', message: 'Invalid email'}]
 */
const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    statusCode,
    message,
    ...(errors && { errors }) // Only include errors array if provided
  };

  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 *
 * Used for list endpoints that return multiple items with pagination information.
 * Frontend can use total and pageCount for implementing pagination UI.
 *
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items for current page
 * @param {number} total - Total number of items across all pages
 * @param {number} page - Current page number (1-indexed)
 * @param {number} limit - Number of items per page
 * @param {string} message - Success message (default: 'Success')
 */
const sendPaginated = (res, data, total, page, limit, message = 'Success') => {
  // Calculate total number of pages
  const pageCount = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      pageCount,
      // Helpful flags for frontend pagination UI
      hasNextPage: page < pageCount,
      hasPreviousPage: page > 1
    }
  });
};

// Export all helper functions
module.exports = {
  sendSuccess,
  sendError,
  sendPaginated
};
