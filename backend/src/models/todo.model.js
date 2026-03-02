/**
 * Todo Items Model
 *
 * Manages todo/task items for users with support for filtering by status and priority.
 * All queries use parameterized statements to prevent SQL injection.
 *
 * Methods:
 * - getAllByUserId(userId, filters): get user's todos with optional filtering
 * - getById(id, userId): get single todo with ownership verification
 * - create(userId, title, description, priority, dueDate): create new todo
 * - update(id, userId, updates): modify todo item
 * - delete(id, userId): remove todo
 * - getStats(userId): get todo counts by status
 */

const { pool } = require('../config/database');

/**
 * Get all todos for a user with optional filtering
 *
 * @param {string} userId - User UUID
 * @param {Object} filters - Optional filter object
 *   - status: 'pending', 'in_progress', or 'done'
 *   - priority: 'low', 'medium', or 'high'
 * @returns {Promise<Array>} Array of todo objects
 * @throws {Error} If database query fails
 */
const getAllByUserId = async (userId, filters = {}) => {
  try {
    let query = `
      SELECT id, user_id, title, description, priority, status, due_date, created_at, updated_at
      FROM todo_items
      WHERE user_id = ? AND is_deleted = 0
    `;
    const params = [userId];

    // Add optional filters
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    // Order by priority (high first) then due date
    query += ' ORDER BY FIELD(priority, "high", "medium", "low"), due_date ASC, created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single todo by ID with ownership verification
 *
 * @param {number} id - Todo item ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object|null>} Todo object or null if not found
 * @throws {Error} If database query fails
 */
const getById = async (id, userId) => {
  try {
    const query = `
      SELECT id, user_id, title, description, priority, status, due_date, created_at, updated_at
      FROM todo_items
      WHERE id = ? AND user_id = ? AND is_deleted = 0
    `;
    const [rows] = await pool.execute(query, [id, userId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new todo item
 *
 * @param {string} userId - User UUID
 * @param {string} title - Todo title (required)
 * @param {string} description - Detailed description (optional)
 * @param {string} priority - Priority level: 'low', 'medium', or 'high'
 * @param {string} dueDate - Due date in YYYY-MM-DD format (optional)
 * @returns {Promise<number>} ID of inserted todo
 * @throws {Error} If insertion fails
 */
const create = async (userId, title, description = '', priority = 'medium', dueDate = null) => {
  try {
    const query = `
      INSERT INTO todo_items (user_id, title, description, priority, status, due_date, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const [result] = await pool.execute(query, [userId, title, description, priority, dueDate]);
    return result.insertId;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing todo item
 *
 * @param {number} id - Todo item ID
 * @param {string} userId - User UUID (for ownership verification)
 * @param {Object} updates - Object with fields to update
 *   Supported fields: title, description, priority, status, due_date
 * @returns {Promise<boolean>} true if update successful
 * @throws {Error} If update fails
 */
const update = async (id, userId, updates) => {
  try {
    // Define allowed fields for update (security: prevent updating user_id, etc.)
    const allowedFields = ['title', 'description', 'priority', 'status', 'due_date'];
    const updateFields = [];
    const values = [];

    // Build dynamic UPDATE query
    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
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
      UPDATE todo_items
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
 * Delete a todo item
 *
 * @param {number} id - Todo item ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<boolean>} true if deletion successful
 * @throws {Error} If deletion fails
 */
const deleteTodo = async (id, userId) => {
  try {
    const query = `
      UPDATE todo_items
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND is_deleted = 0
    `;
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Get statistics about todo items for a user
 *
 * Returns counts of todos broken down by status.
 * Useful for dashboard displays showing task progress.
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Object with counts for each status
 *   Example: { pending: 5, in_progress: 2, done: 12, total: 19 }
 * @throws {Error} If database query fails
 */
const getStats = async (userId) => {
  try {
    const query = `
      SELECT
        status,
        COUNT(*) as count
      FROM todo_items
      WHERE user_id = ? AND is_deleted = 0
      GROUP BY status
    `;
    const [rows] = await pool.execute(query, [userId]);

    // Build stats object
    const stats = {
      pending: 0,
      in_progress: 0,
      done: 0,
      total: 0
    };

    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }

    return stats;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllByUserId,
  getById,
  create,
  update,
  deleteTodo,
  getStats
};
