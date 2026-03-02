/**
 * Authentication Routes
 *
 * Defines all authentication-related endpoints:
 * - User registration with validation
 * - User login with credentials
 * - Token refresh for session management
 * - Logout for session termination
 * - Profile management
 * - Password changes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { PASSWORD_RULES } = require('../config/security');
const authController = require('../controllers/auth.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const errorHandler = require('../middleware/errorHandler.middleware');

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user account
 *
 * Request body:
 * - username: string (required, unique, 3-50 chars)
 * - email: string (required, valid email, unique)
 * - password: string (required, strong password)
 *   Must contain: uppercase, lowercase, number, special character, min 8 chars
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {
 *     user: {id, username, email},
 *     accessToken: string
 *   }
 * }
 */
router.post('/register',
  // Rate limit: 5 attempts per 15 minutes
  authLimiter,
  // Validation middleware
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: PASSWORD_RULES.minLength })
    .withMessage(`Password must be at least ${PASSWORD_RULES.minLength} characters`)
    .matches(PASSWORD_RULES.regex)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  authController.register
);

/**
 * POST /auth/login
 * Authenticate user with email and password
 *
 * Request body:
 * - email: string (required, valid email)
 * - password: string (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     user: {id, username, email},
 *     accessToken: string
 *   }
 * }
 *
 * Cookie set:
 * - refreshToken: httpOnly, secure, sameSite=Lax
 */
router.post('/login',
  // Rate limit: 5 attempts per 15 minutes
  authLimiter,
  // Validation
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  authController.login
);

/**
 * POST /auth/logout
 * Logout user and invalidate refresh token
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Response: 200 OK
 * {success: true, data: null, message: 'Logged out successfully'}
 */
router.post('/logout',
  verifyAccessToken,
  authController.logout
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token from cookie
 *
 * Cookies:
 * - refreshToken: httpOnly cookie containing refresh token (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {accessToken: string}
 * }
 *
 * Cookie updated:
 * - refreshToken: new token with updated expiration
 */
router.post('/refresh',
  authController.refreshToken
);

/**
 * GET /auth/profile
 * Get authenticated user's profile information
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     id: string (UUID),
 *     username: string,
 *     email: string,
 *     created_at: timestamp,
 *     updated_at: timestamp
 *   }
 * }
 */
router.get('/profile',
  verifyAccessToken,
  authController.getProfile
);

/**
 * PUT /auth/password
 * Change user's password
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Request body:
 * - oldPassword: string (required, current password)
 * - newPassword: string (required, must meet password rules)
 *
 * Response: 200 OK
 * {success: true, data: null, message: 'Password changed successfully'}
 */
router.put('/password',
  verifyAccessToken,
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: PASSWORD_RULES.minLength })
    .withMessage(`Password must be at least ${PASSWORD_RULES.minLength} characters`)
    .matches(PASSWORD_RULES.regex)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  authController.changePassword
);

module.exports = router;
