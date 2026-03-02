/**
 * Tools/Bookmarks Routes
 *
 * All routes are protected by verifyAccessToken middleware.
 * Handles tool/bookmark CRUD operations and categorization.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const toolController = require('../controllers/tool.controller');

const router = express.Router();

/**
 * GET /tools/
 * Get tools for authenticated user with optional filters
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Query Parameters:
 * - category: string (optional, filter by category)
 * - is_favorite: boolean (optional, true|false)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: number,
 *       user_id: string,
 *       name: string,
 *       github_url: string,
 *       description: string,
 *       tags: array,
 *       category: string,
 *       is_favorite: boolean,
 *       created_at: timestamp,
 *       updated_at: timestamp
 *     }
 *   ]
 * }
 */
router.get('/',
  verifyAccessToken,
  query('category')
    .optional()
    .trim(),
  query('is_favorite')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('is_favorite must be true or false'),
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
  toolController.getTools
);

/**
 * GET /tools/categories
 * Get unique categories for user's tools
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: ['Development', 'Deployment', 'Monitoring', ...]
 * }
 */
router.get('/categories', toolController.getCategories);

/**
 * GET /tools/:id
 * Get single tool by ID
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (tool ID)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {id, user_id, name, github_url, description, tags, category, is_favorite, ...}
 * }
 */
router.get('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
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
  toolController.getToolById
);

/**
 * POST /tools/
 * Create new tool
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Request body:
 * - name: string (required)
 * - github_url: string (optional)
 * - description: string (optional)
 * - tags: array (optional, array of strings)
 * - category: string (optional)
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {id, name, github_url, description, tags, category}
 * }
 */
router.post('/',
  verifyAccessToken,
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be 255 characters or less'),
  body('github_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Must be a valid URL'),
  body('description')
    .optional()
    .trim(),
  body('tags')
    .optional()
    .custom(value => {
      if (Array.isArray(value)) {
        return value.every(tag => typeof tag === 'string');
      }
      return false;
    })
    .withMessage('Tags must be an array of strings'),
  body('category')
    .optional()
    .trim(),
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
  toolController.createTool
);

/**
 * PUT /tools/:id
 * Update tool
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (tool ID)
 *
 * Request body (all optional):
 * - name: string
 * - github_url: string
 * - description: string
 * - tags: array
 * - category: string
 *
 * Response: 200 OK
 * {success: true, data: {id, ...updated fields}}
 */
router.put('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Name must be 255 characters or less'),
  body('github_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Must be a valid URL'),
  body('description')
    .optional()
    .trim(),
  body('tags')
    .optional()
    .custom(value => {
      if (Array.isArray(value)) {
        return value.every(tag => typeof tag === 'string');
      }
      return false;
    })
    .withMessage('Tags must be an array of strings'),
  body('category')
    .optional()
    .trim(),
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
  toolController.updateTool
);

/**
 * DELETE /tools/:id
 * Delete tool
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (tool ID)
 *
 * Response: 200 OK
 * {success: true, data: {id}}
 */
router.delete('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
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
  toolController.deleteTool
);

/**
 * PATCH /tools/:id/favorite
 * Toggle favorite flag for a tool
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (tool ID)
 *
 * Response: 200 OK
 * {success: true, data: {id, is_favorite}}
 */
router.patch('/:id/favorite',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
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
  toolController.toggleFavorite
);

module.exports = router;
