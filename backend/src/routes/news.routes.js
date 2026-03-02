/**
 * Stock News Routes
 *
 * All routes are protected by verifyAccessToken middleware.
 * Fetches and manages stock-related news articles.
 *
 * IMPORTANT: Specific paths (/cached, /cache) MUST be defined before /:symbol
 * to prevent the wildcard route from capturing them.
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const newsController = require('../controllers/news.controller');

const router = express.Router();

/**
 * GET /news/
 * Fetch fresh news for all stocks in user's watchlist from Google News.
 * Results are cached in DB for 30 minutes.
 */
router.get('/',
  verifyAccessToken,
  newsController.getNewsForWatchlist
);

/**
 * GET /news/cached
 * Read cached news from DB for all watchlist stocks — no external fetch.
 * Used to load existing data on page open without hitting Google.
 */
router.get('/cached',
  verifyAccessToken,
  newsController.getFromCache
);

/**
 * DELETE /news/cache
 * Clear news cache (admin only).
 */
router.delete('/cache',
  verifyAccessToken,
  newsController.clearNewsCache
);

/**
 * GET /news/:symbol
 * Get news articles for a specific stock symbol.
 * MUST be defined last — wildcard captures any path not matched above.
 */
router.get('/:symbol',
  verifyAccessToken,
  param('symbol')
    .trim()
    .isLength({ min: 1, max: 15 })
    .withMessage('Symbol must be 1-15 characters'),
  query('companyName')
    .optional()
    .trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
      });
    }
    next();
  },
  newsController.getNewsBySymbol
);

module.exports = router;
