/**
 * Routes Index
 *
 * Mounts all route modules to their respective paths.
 * All protected routes have verifyAccessToken middleware applied.
 */

const express = require('express');
const { verifyAccessToken } = require('../middleware/auth.middleware');

// Import route modules
const authRoutes = require('./auth.routes');
const stockRoutes = require('./stock.routes');
const newsRoutes = require('./news.routes');
const todoRoutes = require('./todo.routes');
const toolRoutes = require('./tool.routes');
const resumeRoutes = require('./resume.routes');
const techFeedRoutes = require('./techFeed.routes');
const currencyRoutes = require('./currency.routes');

const router = express.Router();

/**
 * API v1 Routes
 *
 * Base path: /api/v1
 */

// Authentication routes - public and protected endpoints
// POST /api/v1/auth/register - public
// POST /api/v1/auth/login - public
// POST /api/v1/auth/refresh - public
// POST /api/v1/auth/logout - protected
// GET /api/v1/auth/profile - protected
// PUT /api/v1/auth/password - protected
router.use('/auth', authRoutes);

// Stock watchlist routes - all protected
// GET /api/v1/stocks/ - get watchlist with prices
// POST /api/v1/stocks/ - add stock
// PUT /api/v1/stocks/:id - update stock
// DELETE /api/v1/stocks/:id - delete stock
// GET /api/v1/stocks/refresh - refresh all prices
router.use('/stocks', stockRoutes);

// Stock news routes - all protected
// GET /api/v1/news/:symbol - get news for symbol
// GET /api/v1/news/watchlist - get news for all watchlist items
// DELETE /api/v1/news/cache - clear cache (admin)
router.use('/news', newsRoutes);

// Todo items routes - all protected
// GET /api/v1/todos/ - list todos with filters
// GET /api/v1/todos/stats - get statistics
// GET /api/v1/todos/:id - get single todo
// POST /api/v1/todos/ - create todo
// PUT /api/v1/todos/:id - update todo
// DELETE /api/v1/todos/:id - delete todo
router.use('/todos', todoRoutes);

// Tools/bookmarks routes - all protected
// GET /api/v1/tools/ - list tools with filters
// GET /api/v1/tools/categories - get unique categories
// GET /api/v1/tools/:id - get single tool
// POST /api/v1/tools/ - create tool
// PUT /api/v1/tools/:id - update tool
// DELETE /api/v1/tools/:id - delete tool
// PATCH /api/v1/tools/:id/favorite - toggle favorite
router.use('/tools', toolRoutes);

// Resume routes - all protected
// GET /api/v1/resume/ - list all resumes
// GET /api/v1/resume/:id - get single resume
// POST /api/v1/resume/ - create resume
// PUT /api/v1/resume/:id - update resume
// DELETE /api/v1/resume/:id - delete resume
// GET /api/v1/resume/:id/download/pdf - download as PDF
// GET /api/v1/resume/:id/download/word - download as Word
router.use('/resume', resumeRoutes);

// Tech feed routes - all protected
// GET /api/v1/tech-feed/         - fetch fresh from all sources
// GET /api/v1/tech-feed/cached   - read DB cache only
// DELETE /api/v1/tech-feed/cache - clear cache (admin)
router.use('/tech-feed', techFeedRoutes);
router.use('/currency', currencyRoutes);

module.exports = router;
