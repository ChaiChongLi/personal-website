/**
 * Tools/Bookmarks Model
 *
 * Manages user's bookmarked tools and resources with category and favorite support.
 * Uses JSON for flexible tag storage without a separate junction table.
 * All queries use parameterized statements to prevent SQL injection.
 *
 * Methods:
 * - getAllByUserId(userId, filters): get user's tools with optional filtering
 * - getById(id, userId): get single tool with ownership verification
 * - create(userId, name, githubUrl, description, tags, category): create new tool
 * - update(id, userId, updates): modify tool entry
 * - delete(id, userId): remove tool
 * - getCategories(userId): get unique categories for user's tools
 * - toggleFavorite(id, userId): toggle favorite flag
 */

const { pool } = require('../config/database');

/**
 * Get all tools for a user with optional filtering
 *
 * @param {string} userId - User UUID
 * @param {Object} filters - Optional filter object
 *   - category: filter by category name
 *   - is_favorite: filter by favorite status (true/false)
 * @returns {Promise<Array>} Array of tool objects with parsed tags
 * @throws {Error} If database query fails
 */
const getAllByUserId = async (userId, filters = {}) => {
  try {
    let query = `
      SELECT id, user_id, name, github_url, description, tags, category, is_favorite, created_at, updated_at
      FROM tools
      WHERE user_id = ?
    `;
    const params = [userId];

    // Add optional filters
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (typeof filters.is_favorite !== 'undefined') {
      query += ' AND is_favorite = ?';
      params.push(filters.is_favorite ? 1 : 0);
    }

    // Order favorites first, then by creation date
    query += ' ORDER BY is_favorite DESC, created_at DESC';

    const [rows] = await pool.execute(query, params);

    // Parse JSON tags — mysql2 may return JSON columns as already-parsed objects
    return rows.map(tool => ({
      ...tool,
      tags: Array.isArray(tool.tags) ? tool.tags : (tool.tags ? JSON.parse(tool.tags) : [])
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single tool by ID with ownership verification
 *
 * @param {number} id - Tool ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object|null>} Tool object or null if not found
 * @throws {Error} If database query fails
 */
const getById = async (id, userId) => {
  try {
    const query = `
      SELECT id, user_id, name, github_url, description, tags, category, is_favorite, created_at, updated_at
      FROM tools
      WHERE id = ? AND user_id = ?
    `;
    const [rows] = await pool.execute(query, [id, userId]);

    if (rows.length === 0) {
      return null;
    }

    const tool = rows[0];
    return {
      ...tool,
      tags: Array.isArray(tool.tags) ? tool.tags : (tool.tags ? JSON.parse(tool.tags) : [])
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new tool bookmark
 *
 * @param {string} userId - User UUID
 * @param {string} name - Tool name (required)
 * @param {string} githubUrl - GitHub repository URL (optional)
 * @param {string} description - Description of the tool (optional)
 * @param {Array} tags - Array of tag strings for categorization (optional)
 * @param {string} category - Tool category (optional)
 * @returns {Promise<number>} ID of inserted tool
 * @throws {Error} If insertion fails
 */
const create = async (userId, name, githubUrl = '', description = '', tags = [], category = '') => {
  try {
    // Convert tags array to JSON
    const tagsJson = JSON.stringify(tags);

    const query = `
      INSERT INTO tools (user_id, name, github_url, description, tags, category, is_favorite, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const [result] = await pool.execute(query, [userId, name, githubUrl, description, tagsJson, category]);
    return result.insertId;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing tool entry
 *
 * @param {number} id - Tool ID
 * @param {string} userId - User UUID (for ownership verification)
 * @param {Object} updates - Object with fields to update
 *   Supported fields: name, github_url, description, tags, category
 * @returns {Promise<boolean>} true if update successful
 * @throws {Error} If update fails
 */
const update = async (id, userId, updates) => {
  try {
    // Define allowed fields for update
    const allowedFields = ['name', 'github_url', 'description', 'tags', 'category'];
    const updateFields = [];
    const values = [];

    // Build dynamic UPDATE query
    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`);
        // Convert tags array to JSON if present
        if (field === 'tags') {
          values.push(JSON.stringify(updates[field]));
        } else {
          values.push(updates[field]);
        }
      }
    }

    // Always update timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 1) {
      // Only updated_at was set
      return true;
    }

    values.push(id);
    values.push(userId);

    const query = `
      UPDATE tools
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a tool entry
 *
 * @param {number} id - Tool ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<boolean>} true if deletion successful
 * @throws {Error} If deletion fails
 */
const deleteTool = async (id, userId) => {
  try {
    const query = `
      DELETE FROM tools
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all unique categories for a user's tools
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of category strings
 * @throws {Error} If database query fails
 */
const getCategories = async (userId) => {
  try {
    const query = `
      SELECT DISTINCT category
      FROM tools
      WHERE user_id = ? AND category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows.map(row => row.category);
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle favorite flag for a tool
 *
 * @param {number} id - Tool ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<boolean>} true if update successful
 * @throws {Error} If update fails
 */
const toggleFavorite = async (id, userId) => {
  try {
    const query = `
      UPDATE tools
      SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllByUserId,
  getById,
  create,
  update,
  deleteTool,
  getCategories,
  toggleFavorite
};
