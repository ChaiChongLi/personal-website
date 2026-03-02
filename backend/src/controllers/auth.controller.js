/**
 * Authentication Controller
 *
 * Handles user registration, login, logout, and session management.
 * Implements JWT token-based authentication with refresh token rotation.
 *
 * Routes:
 * - POST /register: Create new user account
 * - POST /login: Authenticate user and issue tokens
 * - POST /logout: Invalidate refresh token
 * - POST /refresh: Issue new token pair
 * - GET /profile: Get authenticated user info
 * - PUT /password: Change password
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/response.helper');
const { BCRYPT_CONFIG, COOKIE_OPTIONS } = require('../config/security');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const logger = require('../utils/logger');

/**
 * Register a new user account
 *
 * Validates input, hashes password with bcrypt, creates user, generates tokens.
 * Sets refresh token in httpOnly cookie for security.
 *
 * @param {Object} req - Express request with validated body: {username, email, password}
 * @param {Object} res - Express response
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      logger.warn(`Registration attempt with existing email: ${email}`);
      return sendError(res, 'Email already registered', 409);
    }
    // Hash password with bcrypt (12 rounds = ~250ms, good security/speed balance)
    const passwordHash = await bcrypt.hash(password, BCRYPT_CONFIG.rounds);

    // Generate UUID for new user
    const userId = uuidv4();

    // Create user in database
    const user = await userModel.create(userId, username, email, passwordHash);

    if (!user) {
      logger.error('Failed to create user:', { username, email });
      return sendError(res, 'Failed to create user account', 500);
    }

    // Generate token pair
    const tokens = tokenService.generateTokenPair(userId, username, email);

    // Store refresh token in database for revocation capability
    await userModel.updateRefreshToken(userId, tokens.refreshToken);

    // Set refresh token in httpOnly cookie (secure: browser can't access, HTTPS only in prod)
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    logger.info(`User registered successfully: ${email}`);

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        accessToken: tokens.accessToken
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    logger.error('Registration error:', error.message);
    return sendError(res, 'Registration failed', 500);
  }
};

/**
 * Login user
 *
 * Validates credentials, generates token pair, sets refresh token cookie.
 *
 * @param {Object} req - Express request with validated body: {email, password}
 * @param {Object} res - Express response
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userModel.findByEmail(email);
    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return sendError(res, 'Invalid email or password', 401);
    }
    // Compare provided password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      logger.warn(`Failed login attempt for user: ${email}`);
      return sendError(res, 'Invalid email or password', 401);
    }

    // Generate new token pair
    const tokens = tokenService.generateTokenPair(user.id, user.username, user.email);

    // Store refresh token in database
    await userModel.updateRefreshToken(user.id, tokens.refreshToken);

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

    logger.info(`User logged in successfully: ${email}`);

    return sendSuccess(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        accessToken: tokens.accessToken
      },
      'Logged in successfully',
      200
    );
  } catch (error) {
    logger.error('Login error:', error.message);
    return sendError(res, 'Login failed', 500);
  }
};

/**
 * Logout user
 *
 * Invalidates refresh token by clearing it from database.
 * Also clears refresh token cookie.
 *
 * @param {Object} req - Express request with authenticated user
 * @param {Object} res - Express response
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Clear refresh token from database (invalidate all refresh tokens for this user)
    await userModel.clearRefreshToken(userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    logger.info(`User logged out: ${userId}`);

    return sendSuccess(res, null, 'Logged out successfully', 200);
  } catch (error) {
    logger.error('Logout error:', error.message);
    return sendError(res, 'Logout failed', 500);
  }
};

/**
 * Refresh access token
 *
 * Uses refresh token from cookie to generate new access token pair.
 * Validates token exists in database (prevents use of old tokens after logout).
 *
 * @param {Object} req - Express request with refreshToken cookie
 * @param {Object} res - Express response
 */
const refreshToken = async (req, res, next) => {
  try {
    // Extract refresh token from cookie
    const token = req.cookies.refreshToken;

    if (!token) {
      logger.warn('Refresh attempt without token');
      return sendError(res, 'Refresh token required', 401);
    }

    try {
      // Verify refresh token signature
      const decoded = tokenService.verifyRefreshToken(token);

      // Verify token exists in database (check it wasn't revoked)
      const user = await userModel.findByRefreshToken(token);
      if (!user) {
        logger.warn('Refresh token not found in database (revoked?)', { userId: decoded.id });
        return sendError(res, 'Refresh token invalid', 401);
      }

      // Generate new token pair
      const tokens = tokenService.generateTokenPair(user.id, user.username, user.email);

      // Update refresh token in database
      await userModel.updateRefreshToken(user.id, tokens.refreshToken);

      // Set new refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      logger.info(`Token refreshed for user: ${user.id}`);

      return sendSuccess(
        res,
        {
          accessToken: tokens.accessToken
        },
        'Token refreshed successfully',
        200
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Refresh token expired');
        return sendError(res, 'Refresh token expired', 401);
      }
      throw error;
    }
  } catch (error) {
    logger.error('Token refresh error:', error.message);
    return sendError(res, 'Token refresh failed', 401);
  }
};

/**
 * Get authenticated user profile
 *
 * Returns information about the currently authenticated user.
 *
 * @param {Object} req - Express request with authenticated user
 * @param {Object} res - Express response
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch fresh user data from database
    const user = await userModel.findById(userId);

    if (!user) {
      logger.warn('User profile not found:', userId);
      return sendError(res, 'User not found', 404);
    }

    logger.info(`Profile retrieved for user: ${userId}`);

    return sendSuccess(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      'Profile retrieved successfully',
      200
    );
  } catch (error) {
    logger.error('Get profile error:', error.message);
    return sendError(res, 'Failed to retrieve profile', 500);
  }
};

/**
 * Change user password
 *
 * Validates old password, hashes new password, updates in database.
 *
 * @param {Object} req - Express request with authenticated user and body: {oldPassword, newPassword}
 * @param {Object} res - Express response
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    // Fetch user from database
    const user = await userModel.findById(userId);

    if (!user) {
      logger.warn('User not found for password change:', userId);
      return sendError(res, 'User not found', 404);
    }

    // Verify old password matches
    const passwordMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!passwordMatch) {
      logger.warn(`Invalid old password for user: ${userId}`);
      return sendError(res, 'Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_CONFIG.rounds);

    // Update password in database
    // Note: This would require adding an update method to user.model.js
    // For now, we'll use direct query
    const query = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await require('../config/database').pool.execute(query, [newPasswordHash, userId]);

    logger.info(`Password changed for user: ${userId}`);

    return sendSuccess(
      res,
      null,
      'Password changed successfully',
      200
    );
  } catch (error) {
    logger.error('Change password error:', error.message);
    return sendError(res, 'Password change failed', 500);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  changePassword
};
