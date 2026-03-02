/**
 * Stock Watchlist Routes
 *
 * All routes are protected by verifyAccessToken middleware.
 * Handles stock watchlist CRUD operations and price fetching.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const stockController = require('../controllers/stock.controller');

const router = express.Router();

/**
 * GET /stocks/
 * Get user's stock watchlist with current prices
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: number,
 *       user_id: string (UUID),
 *       symbol: string,
 *       market: string (MY|US|SG),
 *       company_name: string,
 *       notes: string,
 *       price: number,
 *       change: number,
 *       changePercent: number,
 *       currency: string,
 *       volume: number,
 *       marketCap: number,
 *       created_at: timestamp,
 *       updated_at: timestamp
 *     }
 *   ]
 * }
 */
router.get('/',
  verifyAccessToken,
  stockController.getWatchlist
);

/**
 * POST /stocks/
 * Add stock to watchlist
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Request body:
 * - symbol: string (required, e.g., 'AAPL')
 * - market: string (required, MY|US|SG)
 * - companyName: string (optional)
 * - notes: string (optional)
 *
 * Response: 201 Created
 * {
 *   success: true,
 *   data: {
 *     id: number,
 *     symbol: string,
 *     market: string,
 *     companyName: string,
 *     notes: string
 *   }
 * }
 */
router.post('/',
  verifyAccessToken,
  body('symbol')
    .trim()
    .isLength({ min: 1, max: 15 })
    .withMessage('Stock symbol is required and must be 1-15 characters'),
  body('market')
    .trim()
    .isIn(['KLSE', 'NASDAQ', 'NYSE', 'SGX', 'HKEX', 'CRYPTO', 'MY', 'US', 'SG'])
    .withMessage('Market must be a valid exchange code (KLSE, NASDAQ, NYSE, SGX, HKEX, CRYPTO)'),
  body('companyName')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim(),
  // Validation error handler
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
  stockController.addStock
);

/**
 * PUT /stocks/:id
 * Update stock watchlist entry
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (stock watchlist ID)
 *
 * Request body (all optional):
 * - notes: string
 * - company_name: string
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {id: number, ...updated fields}
 * }
 */
router.put('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  body('notes')
    .optional()
    .trim(),
  body('company_name')
    .optional()
    .trim(),
  // Validation error handler
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
  stockController.updateStock
);

/**
 * DELETE /stocks/:id
 * Remove stock from watchlist
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * URL Parameters:
 * - id: number (stock watchlist ID)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: {id: number}
 * }
 */
router.delete('/:id',
  verifyAccessToken,
  param('id')
    .isInt()
    .withMessage('ID must be a valid integer'),
  // Validation error handler
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
  stockController.deleteStock
);

/**
 * GET /stocks/refresh
 * Refresh stock prices for entire watchlist
 *
 * Headers:
 * - Authorization: Bearer <accessToken> (required)
 *
 * Response: 200 OK
 * {
 *   success: true,
 *   data: [
 *     {
 *       symbol: string,
 *       shortName: string,
 *       price: number,
 *       change: number,
 *       changePercent: number,
 *       ...market data fields
 *     }
 *   ]
 * }
 */
router.get('/refresh', verifyAccessToken, stockController.refreshPrices);

module.exports = router;
