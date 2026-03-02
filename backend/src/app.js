/**
 * Express Application Configuration
 *
 * Configures the Express app with comprehensive security middleware,
 * logging, rate limiting, and route mounting.
 *
 * Security Features:
 * - Helmet for HTTP headers
 * - CORS with whitelist
 * - Rate limiting (general and auth)
 * - Body size limits
 * - HPP (HTTP Parameter Pollution)
 * - Compression for responses
 * - Request logging with Morgan
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const morgan = require('morgan');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const { CORS_CONFIG, CSP_POLICY } = require('./config/security');
const routes = require('./routes/index');
const logger = require('./utils/logger');

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE STACK (in correct order)
// ============================================================================

// 1. Helmet - Set secure HTTP headers including CSP, X-Frame-Options, etc.
app.use(helmet({
  contentSecurityPolicy: {
    directives: CSP_POLICY
  },
  // Protect against clickjacking
  frameguard: { action: 'deny' },
  // Prevent browsers from MIME-type sniffing
  noSniff: true,
}));

// 2. CORS - Restrict requests to allowed origins
app.use(cors({
  origin: CORS_CONFIG.origin,
  methods: CORS_CONFIG.methods,
  allowedHeaders: CORS_CONFIG.allowedHeaders,
  exposedHeaders: CORS_CONFIG.exposedHeaders,
  credentials: CORS_CONFIG.credentials,
  maxAge: CORS_CONFIG.maxAge
}));

// 3. General Rate Limiting - Apply to all routes
// Limit: 100 requests per 15 minutes
app.use(generalLimiter);

// 4. Body Parser - Parse JSON and URL-encoded request bodies
// Limit body size to prevent abuse
app.use(express.json({ limit: '10kb' })); // 10KB limit for JSON
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// 5. Cookie Parser - Parse cookies from request headers
app.use(cookieParser());

// 6. HPP (HTTP Parameter Pollution) - Prevent parameter pollution attacks
// Sanitizes query strings and POST parameters
app.use(hpp({
  whitelist: [
    'sort', 'order', 'page', 'limit', // Common query params
    'status', 'priority', 'category', 'is_favorite' // Filter params
  ]
}));

// 7. Compression - Compress response bodies for faster transfer
// Gzip compress responses larger than 1KB
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: '1kb' // Only compress responses > 1KB
}));

// ============================================================================
// REQUEST LOGGING
// ============================================================================

// Morgan logger - Log HTTP requests
// Skip logging in test environment
const skipLogs = process.env.NODE_ENV === 'test';
app.use(morgan('combined', {
  skip: () => skipLogs,
  // Custom token for user ID if authenticated
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

// Simple health check for load balancers and monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROUTES
// ============================================================================

// Mount all API routes under /api/v1
app.use('/api/v1', routes);

// ============================================================================
// 404 HANDLER
// ============================================================================

// Handle 404 Not Found errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`
  });
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

// Must be registered last to catch errors from all other middleware/routes
// Error handlers must have 4 parameters (err, req, res, next)
app.use(errorHandler);

module.exports = app;
