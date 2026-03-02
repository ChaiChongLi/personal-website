/**
 * Server Entry Point
 *
 * Initializes environment variables, tests database connection,
 * starts the Express server, and handles graceful shutdown.
 */

// Load environment variables from .env file
// Must be called before importing other modules that use process.env
require('dotenv').config();

const app = require('./app');
const { testConnection, closePool } = require('./config/database');
const logger = require('./utils/logger');

// Extract configuration from environment
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start the server
 *
 * Tests database connection, then starts listening for requests.
 * Implements graceful shutdown handling.
 */
const startServer = async () => {
  try {
    // Test database connection before starting server
    logger.info('Testing database connection...');
    await testConnection();
    logger.info('Database connection successful');

    // Start listening on configured port
    const server = app.listen(PORT, () => {
      logger.info(`Server started successfully`);
      logger.info(`Environment: ${NODE_ENV}`);
      logger.info(`Listening on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);
    });

    // ========================================================================
    // GRACEFUL SHUTDOWN HANDLERS
    // ========================================================================

    /**
     * Handle SIGTERM (termination signal from container/process manager)
     * Allows ongoing requests to complete before shutdown
     */
    process.on('SIGTERM', async () => {
      logger.warn('SIGTERM signal received: closing HTTP server');

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connections
        await closePool();

        logger.info('Process terminated');
        process.exit(0);
      });

      // If graceful shutdown takes too long, force exit
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000); // 30 second timeout
    });

    /**
     * Handle SIGINT (Ctrl+C)
     * Allows manual shutdown during development
     */
    process.on('SIGINT', async () => {
      logger.warn('SIGINT signal received: closing HTTP server');

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connections
        await closePool();

        logger.info('Process terminated');
        process.exit(0);
      });

      // Timeout for graceful shutdown
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    });

    /**
     * Handle uncaught exceptions
     * Should rarely happen if error handling is comprehensive
     */
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', {
        message: error.message,
        stack: error.stack
      });

      // Exit process after logging
      process.exit(1);
    });

    /**
     * Handle unhandled promise rejections
     * Should rarely happen if all promises are handled properly
     */
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);

      // Don't exit, but log for monitoring
    });

  } catch (error) {
    logger.error('Failed to start server:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
