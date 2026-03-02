/**
 * User Model
 *
 * Provides database access methods for user management.
 * All queries use parameterized statements to prevent SQL injection.
 *
 * Methods:
 * - findByEmail(email): lookup user by email
 * - findById(id): lookup user by UUID
 * - create(username, email, passwordHash): insert new user
 * - updateRefreshToken(userId, refreshToken): store refresh token
 * - clearRefreshToken(userId): remove refresh token (logout)
 * - findByRefreshToken(refreshToken): lookup user by refresh token
 */

const { pool } = require('../config/database');

/**
 * Find user by email address
 *
 * @param {string} email - User email to search for
 * @returns {Promise<Object|null>} User object or null if not found
 * @throws {Error} If database query fails
 */
const findByEmail = async (email) => {
  try {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await pool.execute(query, [email]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Find user by UUID
 *
 * @param {string} id - User UUID
 * @returns {Promise<Object|null>} User object or null if not found
 * @throws {Error} If database query fails
 */
const findById = async (id) => {
  try {
    const query = 'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new user account
 *
 * Inserts a new user with the provided credentials.
 * Password should already be hashed by the calling code using bcrypt.
 *
 * @param {string} id - UUID for the user
 * @param {string} username - Unique username
 * @param {string} email - Unique email address
 * @param {string} passwordHash - Bcrypt hashed password (from bcryptjs.hash())
 * @returns {Promise<Object>} The created user object
 * @throws {Error} If insertion fails (e.g., duplicate email/username)
 */
const create = async (id, username, email, passwordHash) => {
  try {
    const query = `
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    await pool.execute(query, [id, username, email, passwordHash]);

    // Return the created user (without password hash)
    return findById(id);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user's refresh token
 *
 * Stores the refresh token in the database for security purposes.
 * This allows the server to invalidate tokens on logout or when compromised.
 *
 * @param {string} userId - User UUID
 * @param {string} refreshToken - JWT refresh token to store
 * @returns {Promise<boolean>} true if update successful
 * @throws {Error} If database query fails
 */
const updateRefreshToken = async (userId, refreshToken) => {
  try {
    const query = `
      UPDATE users
      SET refresh_token = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [refreshToken, userId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Clear user's refresh token (logout)
 *
 * Removes the stored refresh token, effectively logging out the user.
 * This prevents the old token from being used to refresh sessions.
 *
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} true if update successful
 * @throws {Error} If database query fails
 */
const clearRefreshToken = async (userId) => {
  try {
    const query = `
      UPDATE users
      SET refresh_token = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [userId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Find user by refresh token
 *
 * Used when validating refresh token requests.
 * Ensures token exists and belongs to a real user.
 *
 * @param {string} refreshToken - JWT refresh token to search for
 * @returns {Promise<Object|null>} User object or null if not found
 * @throws {Error} If database query fails
 */
const findByRefreshToken = async (refreshToken) => {
  try {
    const query = `
      SELECT id, username, email, created_at, updated_at
      FROM users
      WHERE refresh_token = ?
    `;
    const [rows] = await pool.execute(query, [refreshToken]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  findByEmail,
  findById,
  create,
  updateRefreshToken,
  clearRefreshToken,
  findByRefreshToken
};
