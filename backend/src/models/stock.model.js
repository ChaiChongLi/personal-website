/**
 * Stock Watchlist Model
 *
 * Manages user stock watchlist entries in the database.
 * All queries use parameterized statements to prevent SQL injection.
 *
 * Methods:
 * - getAllByUserId(userId): get user's complete watchlist
 * - getBySymbolAndUserId(symbol, userId): check if symbol exists in watchlist
 * - create(userId, symbol, market, companyName, notes): add stock to watchlist
 * - update(id, userId, updates): modify watchlist entry
 * - delete(id, userId): remove from watchlist
 */

const { pool } = require('../config/database');

/**
 * Get all stocks in user's watchlist
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of stock objects
 * @throws {Error} If database query fails
 */
const getAllByUserId = async (userId) => {
  try {
    const query = `
      SELECT id, user_id, symbol, market, company_name, notes, created_at, updated_at
      FROM stock_watchlist
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a specific stock from user's watchlist
 *
 * Useful for checking if a stock already exists before adding.
 *
 * @param {string} symbol - Stock ticker symbol (e.g., AAPL)
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Stock object or null if not found
 * @throws {Error} If database query fails
 */
const getBySymbolAndUserId = async (symbol, userId) => {
  try {
    const query = `
      SELECT id, user_id, symbol, market, company_name, notes, created_at, updated_at
      FROM stock_watchlist
      WHERE symbol = ? AND user_id = ? AND is_deleted = 0
    `;
    const [rows] = await pool.execute(query, [symbol, userId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get stock by ID and verify ownership
 *
 * @param {number} id - Stock watchlist entry ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<Object|null>} Stock object or null if not found
 * @throws {Error} If database query fails
 */
const getById = async (id, userId) => {
  try {
    const query = `
      SELECT id, user_id, symbol, market, company_name, notes, created_at, updated_at
      FROM stock_watchlist
      WHERE id = ? AND user_id = ? AND is_deleted = 0
    `;
    const [rows] = await pool.execute(query, [id, userId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Add a new stock to user's watchlist
 *
 * @param {string} userId - User UUID
 * @param {string} symbol - Stock ticker symbol
 * @param {string} market - Market code (MY, US, SG)
 * @param {string} companyName - Full company name
 * @param {string} notes - Optional user notes/alias for the stock
 * @returns {Promise<number>} ID of inserted stock entry
 * @throws {Error} If insertion fails (e.g., duplicate entry)
 */
const create = async (userId, symbol, market, companyName, notes = '') => {
  try {
    const query = `
      INSERT INTO stock_watchlist (user_id, symbol, market, company_name, notes, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const [result] = await pool.execute(query, [userId, symbol, market, companyName, notes]);
    return result.insertId;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing stock watchlist entry
 *
 * Only allows updating notes and company_name for security.
 * Symbol and market are immutable (would delete and recreate for changes).
 *
 * @param {number} id - Stock watchlist entry ID
 * @param {string} userId - User UUID (for ownership verification)
 * @param {Object} updates - Object with fields to update
 *   Supported fields: notes, company_name
 * @returns {Promise<boolean>} true if update successful
 * @throws {Error} If update fails
 */
const update = async (id, userId, updates) => {
  try {
    // Build dynamic UPDATE query based on provided fields
    const allowedFields = ['notes', 'company_name'];
    const updateFields = [];
    const values = [];

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 1) {
      // Only updated_at was set
      return true;
    }

    values.push(id);
    values.push(userId);

    const query = `
      UPDATE stock_watchlist
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ? AND is_deleted = 0
    `;

    const [result] = await pool.execute(query, values);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Soft-delete a stock from user's watchlist
 *
 * Sets is_deleted = 1 rather than removing the row permanently.
 *
 * @param {number} id - Stock watchlist entry ID
 * @param {string} userId - User UUID (for ownership verification)
 * @returns {Promise<boolean>} true if deletion successful
 * @throws {Error} If deletion fails
 */
const deleteStock = async (id, userId) => {
  try {
    const query = `
      UPDATE stock_watchlist
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND is_deleted = 0
    `;
    const [result] = await pool.execute(query, [id, userId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllByUserId,
  getBySymbolAndUserId,
  getById,
  create,
  update,
  deleteStock
};
