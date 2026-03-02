/**
 * Todo Items Routes
 *
 * All routes are protected by verifyAccessToken middleware.
 * Handles todo/task CRUD operations and statistics.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const todoController = require('../controllers/todo.controller');

const router = express.Router();

/**
 * GET /todos/
 * Get todos for authenticated user with optional filters
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Query Parameters:
 * - status: string (optional, pending|in_progress|done)
 * - priority: string (optional, low|medium|high)
 * - page: number (optional, default 1)
 * - limit: number (optional, default 20)
 *
 * Response: 200 OK (with pagination info)
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: number,
 *       user_id: string,
 *       title: string,
 *       description: string,
 *       priority: string,
 *       status: string,
 *       due_date: date,
 *       created_at: timestamp,
 *       updated_at: timestamp
 *     }
 *   ],
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     pageCount: number,
 *     hasNextPage: boolean,
 *     hasPreviousPage: boolean
 *   }
 * }
 */
router.get('/',
  verifyAccessToken,
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'done'])
    .withMessage('Status must be pending, in_progress, or done'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
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
  todoController.getTodos
);

/**
 * GET /todos/stats
 * Get todo statistics (count by status)
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {
 *     pending: number,
 *     in_progress: number,
 *     done: number,
 *     total: number
 *   }
 * }
 */
router.get('/stats', verifyAccessToken, todoController.getStats);

/**
 * GET /todos/:id
 * Get single todo by ID
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (todo ID)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {id, user_id, title, description, priority, status, due_date, created_at, updated_at}
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
  todoController.getTodoById
);

/**
 * POST /todos/
 * Create new todo
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Request body:
 * - title: string (required)
 * - description: string (optional)
 * - priority: string (optional, default 'medium', low|medium|high)
 * - due_date: string (optional, YYYY-MM-DD format)
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {id, title, description, priority, due_date, status}
 * }
 */
router.post('/',
  verifyAccessToken,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be 255 characters or less'),
  body('description')
    .optional()
    .trim(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in YYYY-MM-DD format'),
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
  todoController.createTodo
);

/**
 * PUT /todos/:id
 * Update todo
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (todo ID)
 *
 * Request body (all optional):
 * - title: string
 * - description: string
 * - priority: string (low|medium|high)
 * - status: string (pending|in_progress|done)
 * - due_date: string (YYYY-MM-DD)
 *
 * Response: 200 OK
 * {success: true, data: {id, ...updated fields}}
 */
router.put('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Title must be 255 characters or less'),
  body('description')
    .optional()
    .trim(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'done'])
    .withMessage('Status must be pending, in_progress, or done'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in YYYY-MM-DD format'),
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
  todoController.updateTodo
);

/**
 * DELETE /todos/:id
 * Delete todo
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (todo ID)
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
  todoController.deleteTodo
);

module.exports = router;
