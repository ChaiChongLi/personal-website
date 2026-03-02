/**
 * Token Service
 *
 * Handles JWT token generation and verification.
 * Manages both access tokens (short-lived) and refresh tokens (long-lived).
 *
 * Access Token Flow:
 * 1. User logs in → generate token pair
 * 2. Access token included in Authorization header for protected requests
 * 3. Access token expires after 15 minutes
 * 4. Client uses refresh token to get new access token
 *
 * Refresh Token Flow:
 * 1. Stored in httpOnly cookie for security
 * 2. Also stored in database for server-side revocation
 * 3. Used to generate new access/refresh token pairs
 * 4. Longer lifetime (7 days) than access tokens
 */

const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/security');
const logger = require('../utils/logger');

/**
 * Generate a short-lived access token
 *
 * Access tokens have a short lifetime (15 minutes) to limit exposure if stolen.
 * If this token is compromised, the attacker has limited time to use it.
 *
 * @param {Object} payload - Data to encode in token
 *   Typically: {id, username, email}
 * @returns {string} Signed JWT access token
 * @throws {Error} If signing fails
 */
const generateAccessToken = (payload) => {
  try {
    const token = jwt.sign(payload, JWT_CONFIG.accessSecret, {
      expiresIn: JWT_CONFIG.accessExpiresIn
    });
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error.message);
    throw error;
  }
};

/**
 * Generate a long-lived refresh token
 *
 * Refresh tokens have a longer lifetime (7 days) and are used to obtain new
 * access tokens without requiring the user to log in again.
 * These are stored in a database and httpOnly cookie for revocation capability.
 *
 * @param {Object} payload - Data to encode in token
 *   Typically: {id, username, email}
 * @returns {string} Signed JWT refresh token
 * @throws {Error} If signing fails
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(payload, JWT_CONFIG.refreshSecret, {
      expiresIn: JWT_CONFIG.refreshExpiresIn
    });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error.message);
    throw error;
  }
};

/**
 * Verify a refresh token
 *
 * Validates the refresh token signature and expiration.
 * Used when the client wants to get a new access token.
 *
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If verification fails (invalid, expired, etc.)
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refreshSecret);
    return decoded;
  } catch (error) {
    logger.warn('Refresh token verification failed:', error.message);
    throw error;
  }
};

/**
 * Generate a complete token pair (access + refresh)
 *
 * Used during login/registration and token refresh operations.
 * Returns both tokens for the client to store and use.
 *
 * @param {string} userId - User UUID
 * @param {string} username - Username
 * @param {string} email - User email address
 * @returns {Promise<Object>} Object with accessToken and refreshToken
 *   Example: {
 *     accessToken: 'eyJhbGc...',
 *     refreshToken: 'eyJhbGc...'
 *   }
 * @throws {Error} If token generation fails
 */
const generateTokenPair = (userId, username, email) => {
  try {
    const payload = {
      id: userId,
      username,
      email
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload)
    };
  } catch (error) {
    logger.error('Error generating token pair:', error.message);
    throw error;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateTokenPair
};
