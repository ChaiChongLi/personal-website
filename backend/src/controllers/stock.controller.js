/**
 * Stock Watchlist Controller
 *
 * Handles stock watchlist CRUD operations and real-time price fetching.
 * Integrates with Google Finance for market data (HTML scraping).
 *
 * Routes:
 * - GET /: Get user's complete watchlist with current prices
 * - POST /: Add stock to watchlist
 * - PUT /:id: Update stock entry
 * - DELETE /:id: Remove stock from watchlist
 * - GET /refresh: Refresh prices for all watchlist items
 */

const { sendSuccess, sendError } = require('../utils/response.helper');
const stockModel = require('../models/stock.model');
const googleFinanceService = require('../services/googleFinance.service');
const logger = require('../utils/logger');

/**
 * Build an enriched watchlist by merging DB rows with live Google Finance prices.
 *
 * @param {Array} watchlist - Raw DB rows from stock_watchlist table
 * @returns {Promise<Array>} Enriched watchlist with price fields
 */
const enrichWithPrices = async (watchlist) => {
  let quotes = {};
  try {
    quotes = await googleFinanceService.getQuotes(
      watchlist.map(item => ({ symbol: item.symbol, market: item.market }))
    );
  } catch (error) {
    logger.warn(`Failed to fetch Google Finance quotes: ${error.message}`);
    // Continue with DB data — price fields will be null
  }

  return watchlist.map(item => {
    const q = quotes[item.symbol];
    return {
      ...item,
      price: q?.price ?? null,
      change: q?.change ?? null,
      changePercent: q?.changePercent ?? null,
      // Google Finance scraping does not provide these fields
      volume: null,
      marketCap: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      lastUpdated: q?.timestamp ?? null,
    };
  });
};

/**
 * Get user's stock watchlist with current market prices
 */
const getWatchlist = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const watchlist = await stockModel.getAllByUserId(userId);

    if (watchlist.length === 0) {
      return sendSuccess(res, [], 'Empty watchlist', 200);
    }

    const enriched = await enrichWithPrices(watchlist);

    logger.info(`Watchlist retrieved for user: ${userId} (${enriched.length} items)`);
    return sendSuccess(res, enriched, 'Watchlist retrieved successfully', 200);
  } catch (error) {
    logger.error(`Get watchlist error: ${error.message}`);
    return sendError(res, 'Failed to retrieve watchlist', 500);
  }
};

/**
 * Add a stock to user's watchlist.
 * No longer validates via finance API — duplicate check only.
 */
const addStock = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { symbol, market, companyName, notes } = req.body;

    if (!symbol || !market) {
      return sendError(res, 'Symbol and market are required', 400);
    }

    // Prevent duplicates for the same user
    const existing = await stockModel.getBySymbolAndUserId(symbol.toUpperCase(), userId);
    if (existing) {
      logger.warn(`Duplicate stock attempt: ${symbol} for user ${userId}`);
      return sendError(res, 'Stock already in watchlist', 409);
    }

    const stockId = await stockModel.create(userId, symbol.toUpperCase(), market, companyName || '', notes || '');

    logger.info(`Stock added: ${symbol} (${market}) for user: ${userId}`);
    return sendSuccess(
      res,
      { id: stockId, symbol: symbol.toUpperCase(), market, companyName, notes },
      'Stock added to watchlist',
      201
    );
  } catch (error) {
    logger.error(`Add stock error: ${error.message}`);
    return sendError(res, 'Failed to add stock', 500);
  }
};

/**
 * Update watchlist entry (notes and company name only)
 */
const updateStock = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;
    const { notes, company_name } = req.body;

    const stock = await stockModel.getById(id, userId);
    if (!stock) {
      return sendError(res, 'Stock not found', 404);
    }

    const updates = {};
    if (notes !== undefined) updates.notes = notes;
    if (company_name !== undefined) updates.company_name = company_name;

    const success = await stockModel.update(id, userId, updates);
    if (!success) return sendError(res, 'Failed to update stock', 400);

    logger.info(`Stock updated: ${id} for user: ${userId}`);
    return sendSuccess(res, { id, ...updates }, 'Stock updated successfully', 200);
  } catch (error) {
    logger.error(`Update stock error: ${error.message}`);
    return sendError(res, 'Failed to update stock', 500);
  }
};

/**
 * Delete stock from watchlist
 */
const deleteStock = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;

    const stock = await stockModel.getById(id, userId);
    if (!stock) return sendError(res, 'Stock not found', 404);

    const success = await stockModel.deleteStock(id, userId);
    if (!success) return sendError(res, 'Failed to delete stock', 400);

    logger.info(`Stock deleted: ${id} for user: ${userId}`);
    return sendSuccess(res, { id }, 'Stock removed from watchlist', 200);
  } catch (error) {
    logger.error(`Delete stock error: ${error.message}`);
    return sendError(res, 'Failed to delete stock', 500);
  }
};

/**
 * Refresh prices for all watchlist stocks.
 * Returns the same enriched format as getWatchlist.
 */
const refreshPrices = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const watchlist = await stockModel.getAllByUserId(userId);

    if (watchlist.length === 0) {
      return sendSuccess(res, [], 'No stocks to refresh', 200);
    }

    const enriched = await enrichWithPrices(watchlist);

    logger.info(`Prices refreshed for ${enriched.length} stocks for user: ${userId}`);
    return sendSuccess(res, enriched, 'Prices refreshed successfully', 200);
  } catch (error) {
    logger.error(`Refresh prices error: ${error.message}`);
    return sendError(res, 'Failed to refresh prices', 500);
  }
};

module.exports = {
  getWatchlist,
  addStock,
  updateStock,
  deleteStock,
  refreshPrices
};
