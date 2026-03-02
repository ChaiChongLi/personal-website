/**
 * Database Configuration Module
 *
 * Configures and exports a MySQL2 connection pool for the application.
 * Uses environment variables for secure credential management.
 * Implements connection pooling for improved performance under load.
 *
 * The pool automatically manages connections, reusing them when possible
 * and creating new connections as needed up to the maximum limit.
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Create a connection pool with configurable limits and timeouts
// Pool size balances resource usage with concurrent request handling
const pool = mysql.createPool({
  // Connection credentials from environment variables
  // These should NEVER be hardcoded in production
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'AppPass@123',
  database: process.env.DB_NAME || 'personal_website',

  // Connection pool configuration
  // waitForConnections: Queue requests if no connections available (vs rejecting)
  waitForConnections: true,
  connectionLimit: 10, // Maximum concurrent connections in pool
  queueLimit: 0, // Unlimited queue (0 = unlimited, set higher number to limit)
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,

  // Connection timeout settings (in milliseconds)
  acquireTimeout: 30000, // 30 seconds to acquire connection from pool
  idleTimeout: 60000, // 60 seconds before closing idle connections

  // Connection handling
  multipleStatements: false, // Security: prevent multiple SQL statements per query
  namedPlaceholders: true, // Use ??: and ?: for named parameters
  dateStrings: true, // Return DATE, DATETIME, TIMESTAMP as strings
  supportBigNumbers: true, // Support large numbers
  bigNumberStrings: false, // Return BigInt as Number (set true for precision)

  // SSL Configuration (commented out - enable in production for secure connections)
  // ssl: {
  //   ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
  //   cert: fs.readFileSync(path.join(__dirname, 'client-cert.pem')),
  //   key: fs.readFileSync(path.join(__dirname, 'client-key.pem'))
  // }
});

/**
 * Test the database connection
 *
 * Attempts to acquire a connection from the pool and verify connectivity.
 * This is called on server startup to ensure the database is available
 * before the server starts accepting requests.
 *
 * @returns {Promise<void>}
 * @throws {Error} If connection cannot be established
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    const result = await connection.ping();
    connection.release();
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    throw error;
  }
};

// Graceful pool closing for application shutdown
// Prevents "connection leak" warnings
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error.message);
  }
};

// Export the pool and utility functions
module.exports = {
  pool,
  testConnection,
  closePool,

  // Helper function to execute queries with connection from pool
  // Returns promise that auto-releases connection
  execute: async (query, values) => {
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.execute(query, values);
      return results;
    } finally {
      connection.release();
    }
  }
};
