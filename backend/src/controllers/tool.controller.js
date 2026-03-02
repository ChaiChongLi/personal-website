/**
 * Tools/Bookmarks Controller
 *
 * Handles tool/bookmark management CRUD operations.
 * Supports categorization, favorites, and tag-based filtering.
 *
 * Routes:
 * - GET /: List tools with optional filtering
 * - GET /:id: Get single tool
 * - POST /: Create new tool
 * - PUT /:id: Update tool
 * - DELETE /:id: Delete tool
 * - PATCH /:id/favorite: Toggle favorite flag
 * - GET /categories: Get unique categories
 */

const { sendSuccess, sendError } = require('../utils/response.helper');
const toolModel = require('../models/tool.model');
const logger = require('../utils/logger');

/**
 * Get tools for authenticated user with optional filtering
 *
 * Supports filtering by category and favorite status.
 *
 * @param {Object} req - Express request with query: {category, is_favorite}
 * @param {Object} res - Express response
 */
const getTools = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, is_favorite } = req.query;

    // Build filter object
    const filters = {};
    if (category) filters.category = category;
    if (typeof is_favorite !== 'undefined') filters.is_favorite = is_favorite === 'true';

    // Get tools from database
    const tools = await toolModel.getAllByUserId(userId, filters);

    logger.info(`Retrieved ${tools.length} tools for user: ${userId}`);

    return sendSuccess(
      res,
      tools,
      'Tools retrieved successfully',
      200
    );
  } catch (error) {
    logger.error(`Get tools error: ${error.message}`);
    return sendError(res, 'Failed to retrieve tools', 500);
  }
};

/**
 * Get single tool by ID
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const getToolById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get tool with ownership verification
    const tool = await toolModel.getById(id, userId);

    if (!tool) {
      logger.warn(`User attempted to access non-existent tool: ${id}`);
      return sendError(res, 'Tool not found', 404);
    }

    logger.info(`Tool retrieved: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      tool,
      'Tool retrieved successfully',
      200
    );
  } catch (error) {
    logger.error(`Get tool error: ${error.message}`);
    return sendError(res, 'Failed to retrieve tool', 500);
  }
};

/**
 * Create new tool/bookmark
 *
 * @param {Object} req - Express request with body: {name, github_url, description, tags, category}
 * @param {Object} res - Express response
 */
const createTool = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, github_url, description, tags, category } = req.body;

    if (!name) {
      return sendError(res, 'Name is required', 400);
    }

    // Ensure tags is an array
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);

    // Create tool
    const toolId = await toolModel.create(
      userId,
      name,
      github_url || '',
      description || '',
      tagsArray,
      category || ''
    );

    logger.info(`Tool created: ${toolId} for user: ${userId}`);

    return sendSuccess(
      res,
      { id: toolId, name, github_url, description, tags: tagsArray, category },
      'Tool created successfully',
      201
    );
  } catch (error) {
    logger.error(`Create tool error: ${error.message}`);
    return sendError(res, 'Failed to create tool', 500);
  }
};

/**
 * Update existing tool
 *
 * @param {Object} req - Express request with params: {id} and body with fields to update
 * @param {Object} res - Express response
 */
const updateTool = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    let updates = req.body;

    // Verify tool exists and user owns it
    const tool = await toolModel.getById(id, userId);
    if (!tool) {
      logger.warn(`User attempted to update non-existent tool: ${id}`);
      return sendError(res, 'Tool not found', 404);
    }

    // Ensure tags is an array if provided
    if (updates.tags && !Array.isArray(updates.tags)) {
      updates.tags = [updates.tags];
    }

    // Update tool
    const success = await toolModel.update(id, userId, updates);

    if (!success) {
      logger.warn(`Failed to update tool: ${id}`);
      return sendError(res, 'Failed to update tool', 400);
    }

    logger.info(`Tool updated: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      { id, ...updates },
      'Tool updated successfully',
      200
    );
  } catch (error) {
    logger.error(`Update tool error: ${error.message}`);
    return sendError(res, 'Failed to update tool', 500);
  }
};

/**
 * Delete tool
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const deleteTool = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify tool exists and user owns it
    const tool = await toolModel.getById(id, userId);
    if (!tool) {
      logger.warn(`User attempted to delete non-existent tool: ${id}`);
      return sendError(res, 'Tool not found', 404);
    }

    // Delete tool
    const success = await toolModel.deleteTool(id, userId);

    if (!success) {
      logger.warn(`Failed to delete tool: ${id}`);
      return sendError(res, 'Failed to delete tool', 400);
    }

    logger.info(`Tool deleted: ${id} for user: ${userId}`);

    return sendSuccess(
      res,
      { id },
      'Tool deleted successfully',
      200
    );
  } catch (error) {
    logger.error(`Delete tool error: ${error.message}`);
    return sendError(res, 'Failed to delete tool', 500);
  }
};

/**
 * Toggle favorite flag for a tool
 *
 * @param {Object} req - Express request with params: {id}
 * @param {Object} res - Express response
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify tool exists and user owns it
    const tool = await toolModel.getById(id, userId);
    if (!tool) {
      logger.warn(`User attempted to toggle favorite on non-existent tool: ${id}`);
      return sendError(res, 'Tool not found', 404);
    }

    // Toggle favorite flag
    const success = await toolModel.toggleFavorite(id, userId);

    if (!success) {
      logger.warn(`Failed to toggle favorite on tool: ${id}`);
      return sendError(res, 'Failed to toggle favorite', 400);
    }

    const newFavoriteStatus = !tool.is_favorite;
    logger.info(`Tool ${id} favorite toggled to ${newFavoriteStatus} for user: ${userId}`);

    return sendSuccess(
      res,
      { id, is_favorite: newFavoriteStatus },
      'Favorite toggled successfully',
      200
    );
  } catch (error) {
    logger.error(`Toggle favorite error: ${error.message}`);
    return sendError(res, 'Failed to toggle favorite', 500);
  }
};

/**
 * Get unique categories for user's tools
 *
 * Useful for building category filters in UI.
 *
 * @param {Object} req - Express request with authenticated user
 * @param {Object} res - Express response
 */
const getCategories = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get categories from database
    const categories = await toolModel.getCategories(userId);

    logger.info(`Retrieved ${categories.length} categories for user: ${userId}`);

    return sendSuccess(
      res,
      categories,
      'Categories retrieved successfully',
      200
    );
  } catch (error) {
    logger.error(`Get categories error: ${error.message}`);
    return sendError(res, 'Failed to retrieve categories', 500);
  }
};

module.exports = {
  getTools,
  getToolById,
  createTool,
  updateTool,
  deleteTool,
  toggleFavorite,
  getCategories
};
