/**
 * Tech Feed Routes
 *
 * All routes are protected by verifyAccessToken middleware.
 *
 * IMPORTANT: /cached and /cache must be defined before any wildcard routes.
 *
 * GET    /api/v1/tech-feed/         → fresh fetch from HN + Dev.to + GitHub Trending
 * GET    /api/v1/tech-feed/cached   → DB-only read, no external fetch
 * DELETE /api/v1/tech-feed/cache    → admin: truncate cache table
 */

const express = require('express');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const techFeedController = require('../controllers/techFeed.controller');

const router = express.Router();

router.get('/', verifyAccessToken, techFeedController.getFeed);
router.get('/cached', verifyAccessToken, techFeedController.getCachedFeed);
router.delete('/cache', verifyAccessToken, techFeedController.clearCache);

module.exports = router;
