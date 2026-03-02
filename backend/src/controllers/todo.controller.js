/**
 * Todo Items Controller
 *
 * Handles todo/task management CRUD operations.
 * Supports filtering by status and priority, statistics generation.
 *
 * Routes:
 * - GET /: List todos with optional filters
 * - GET /:id: Get single todo
 * - POST /: Create new todo
 * - PUT /:id: Update todo
 * - DELETE /:id: Delete todo
 * - GET /stats: Get todo statistics
 */

const { sendSuccess, sendError, sendPaginated } = require('../utils/response.helper');
const todoModel = require('../models/todo.model');
const logger = require('../utils/logger');

/**
 * Get todos for authenticated user with optional filtering
 *
 * Supports pagination and filtering by status/priority.
 * Results are ordered by priority and due date.
 *
 * @param {Object} req - Express request with query: {status, priority, page, limit}
 * @param {Object} res - Express response
 */
const getTodos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, priority, page = 1, limit = 20 } = req.query;

    // Build filter object
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    // Get todos from database
    const todos = await todoModel.getAllByUserId(userId, filters);

    // Implement simple pagination
    const total = todos.length;
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedTodos = todos.slice(startIdx, endIdx);

    logger.info(`Retrieved ${paginatedTodos.length} todos for user: ${userId}`);

    return sendPaginated(
      res,
      paginatedTodos,
      total,
      parseInt(page),
      parseInt(limit),
      'Todos retrieved successfully'
    );
  } catch (error) {
    logger.error('Get todos error:', error.message);
    return sendError(res, 'Failed to retrieve todos', 500);
  }
};

/**
 * Get single todo by ID
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const getTodoById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get todo with ownership verification
    const todo = await todoModel.getById(id, userId);

    if (!todo) {
      logger.warn(`User attempted to access non-existent todo: ${id}`);
      return sendError(res, 'Todo not found', 404);
    }

    logger.info(`Todo retrieved: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      todo,
      'Todo retrieved successfully',
      200
    );
  } catch (error) {
    logger.error('Get todo error:', error.message);
    return sendError(res, 'Failed to retrieve todo', 500);
  }
};

/**
 * Create new todo
 *
 * @param {Object} req - Express request with body: {title, description, priority, due_date}
 * @param {Object} res - Express response
 */
const createTodo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, description, priority, due_date } = req.body;

    if (!title) {
      return sendError(res, 'Title is required', 400);
    }

    // Create todo
    const todoId = await todoModel.create(userId, title, description || '', priority || 'medium', due_date || null);

    logger.info(`Todo created: ${todoId} for user: ${userId}`);

    return sendSuccess(
      res,
      { id: todoId, title, description, priority, due_date, status: 'pending' },
      'Todo created successfully',
      201
    );
  } catch (error) {
    logger.error('Create todo error:', error.message);
    return sendError(res, 'Failed to create todo', 500);
  }
};

/**
 * Update existing todo
 *
 * @param {Object} req - Express request with params: {id} and body with fields to update
 * @param {Object} res - Express response
 */
const updateTodo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Verify todo exists and user owns it
    const todo = await todoModel.getById(id, userId);
    if (!todo) {
      logger.warn(`User attempted to update non-existent todo: ${id}`);
      return sendError(res, 'Todo not found', 404);
    }

    // Update todo
    const success = await todoModel.update(id, userId, updates);

    if (!success) {
      logger.warn(`Failed to update todo: ${id}`);
      return sendError(res, 'Failed to update todo', 400);
    }

    logger.info(`Todo updated: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      { id, ...updates },
      'Todo updated successfully',
      200
    );
  } catch (error) {
    logger.error('Update todo error:', error.message);
    return sendError(res, 'Failed to update todo', 500);
  }
};

/**
 * Delete todo
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const deleteTodo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify todo exists and user owns it
    const todo = await todoModel.getById(id, userId);
    if (!todo) {
      logger.warn(`User attempted to delete non-existent todo: ${id}`);
      return sendError(res, 'Todo not found', 404);
    }

    // Delete todo
    const success = await todoModel.deleteTodo(id, userId);

    if (!success) {
      logger.warn(`Failed to delete todo: ${id}`);
      return sendError(res, 'Failed to delete todo', 400);
    }

    logger.info(`Todo deleted: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      { id },
      'Todo deleted successfully',
      200
    );
  } catch (error) {
    logger.error('Delete todo error:', error.message);
    return sendError(res, 'Failed to delete todo', 500);
  }
};

/**
 * Get todo statistics
 *
 * Returns count of todos grouped by status.
 * Useful for dashboard displays.
 *
 * @param {Object} req - Express request with authenticated user
 * @param {Object} res - Express response
 */
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get stats from database
    const stats = await todoModel.getStats(userId);

    logger.info(`Stats retrieved for user: ${userId}`, stats);

    return sendSuccess(
      res,
      stats,
      'Todo statistics retrieved successfully',
      200
    );
  } catch (error) {
    logger.error('Get stats error:', error.message);
    return sendError(res, 'Failed to retrieve statistics', 500);
  }
};

module.exports = {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  getStats
};
