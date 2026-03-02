/**
 * Logger Configuration Module
 *
 * Configures Winston logger for the application with:
 * - Console output for development (colorized)
 * - File outputs for error and combined logs (production)
 * - Consistent timestamp and formatting
 *
 * Winston provides structured logging with multiple transports,
 * making it easy to track and analyze application behavior.
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define custom log format with colors
const customFormat = winston.format.combine(
  // Add timestamp to every log entry
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

  // Add error stack traces when logging errors
  winston.format.errors({ stack: true }),

  // Colorize output for console readability
  winston.format.colorize(),

  // Custom format: [timestamp] [level] message
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}] ${message}${stack ? `\n${stack}` : ''}`;
  })
);

// File format (no colors needed for files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}] ${message}${stack ? `\n${stack}` : ''}`;
  })
);

// Create logger instance with multiple transports
const logger = winston.createLogger({
  // Log level threshold
  // Only logs at this level or higher will be recorded
  // Levels: error, warn, info, http, debug, verbose, silly
  level: process.env.LOG_LEVEL || 'info',

  // Configure different transports for different outputs
  transports: [
    // ========================================================================
    // CONSOLE TRANSPORT (for development)
    // ========================================================================
    new winston.transports.Console({
      format: customFormat,
      level: 'debug' // Console shows more verbose output in development
    }),

    // ========================================================================
    // ERROR LOG FILE TRANSPORT
    // ========================================================================
    // Captures only error and warning level logs
    // Useful for quickly identifying issues without reading entire log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error', // Only log errors and warnings
      format: fileFormat,
      maxsize: 10485760, // 10MB max file size before rotation
      maxFiles: 5 // Keep last 5 error log files
    }),

    // ========================================================================
    // COMBINED LOG FILE TRANSPORT
    // ========================================================================
    // Captures all logs at the configured level and above
    // Useful for comprehensive audit trail and debugging
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB max file size before rotation
      maxFiles: 10 // Keep last 10 combined log files
    })
  ]
});

// In production, disable console logging (only write to files)
// This improves performance and reduces stdout clutter in containerized environments
if (process.env.NODE_ENV === 'production') {
  logger.transports[0].silent = true; // Disable console transport
}

// Export logger instance for use throughout the application
module.exports = logger;
