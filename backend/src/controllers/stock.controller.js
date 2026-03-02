/**
 * Stock Watchlist Controller
 *
 * Handles stock watchlist CRUD operations and real-time price fetching.
 * Price source is selected based on market:
 *   - KLSE / MY → KLSE Screener (klsescreener.com) — richer data: volume, DY, P/E, NTA
 *   - All others → Google Finance (scraping)
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
const klseScreenerService = require('../services/klseScreener.service');
const logger = require('../utils/logger');

// Markets that should use KLSE Screener instead of Google Finance
const KLSE_MARKETS = new Set(['KLSE', 'MY']);

/**
 * Build an enriched watchlist by merging DB rows with live price data.
 *
 * Malaysia (KLSE/MY) stocks → KLSE Screener (volume, DY, P/E, NTA, market cap available)
 * All other markets       → Google Finance
 *
 * @param {Array} watchlist - Raw DB rows from stock_watchlist table
 * @returns {Promise<Array>} Enriched watchlist with price fields
 */
const enrichWithPrices = async (watchlist) => {
  const klseItems  = watchlist.filter(item => KLSE_MARKETS.has(item.market));
  const otherItems = watchlist.filter(item => !KLSE_MARKETS.has(item.market));

  let klseQuotes  = {};
  let otherQuotes = {};

  // Malaysia stocks — KLSE Screener
  if (klseItems.length > 0) {
    try {
      klseQuotes = await klseScreenerService.getQuotes(klseItems);
    } catch (error) {
      logger.warn(`KLSE Screener fetch failed: ${error.message}`);
    }
  }

  // All other markets — Google Finance
  if (otherItems.length > 0) {
    try {
      otherQuotes = await googleFinanceService.getQuotes(
        otherItems.map(item => ({ symbol: item.symbol, market: item.market }))
      );
    } catch (error) {
      logger.warn(`Google Finance fetch failed: ${error.message}`);
    }
  }

  return watchlist.map(item => {
    const isKlse = KLSE_MARKETS.has(item.market);
    const q = isKlse ? klseQuotes[item.symbol] : otherQuotes[item.symbol];

    return {
      ...item,
      price:            q?.price         ?? null,
      change:           q?.change        ?? null,
      changePercent:    q?.changePercent ?? null,
      // KLSE Screener provides these; Google Finance does not
      volume:           q?.volume        ?? null,
      marketCap:        q?.marketCap     ?? null,
      dy:               isKlse ? (q?.dy  ?? null) : null,
      pe:               isKlse ? (q?.pe  ?? null) : null,
      nta:              isKlse ? (q?.nta ?? null) : null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow:  null,
      lastUpdated:      q?.timestamp     ?? null,
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
 * Update watchlist entry (symbol, market, company name, notes)
 */
const updateStock = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;
    const { symbol, market, company_name, notes } = req.body;

    const stock = await stockModel.getById(id, userId);
    if (!stock) return sendError(res, 'Stock not found', 404);

    // If symbol or market is changing, check the new combination isn't already in the watchlist
    const newSymbol = symbol ? symbol.toUpperCase() : stock.symbol;
    const newMarket = market || stock.market;
    const symbolChanging = newSymbol !== stock.symbol || newMarket !== stock.market;

    if (symbolChanging) {
      const duplicate = await stockModel.getBySymbolAndUserId(newSymbol, userId);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return sendError(res, 'This stock is already in your watchlist', 409);
      }
    }

    const updates = {};
    if (symbol !== undefined)       updates.symbol       = symbol.toUpperCase();
    if (market !== undefined)       updates.market       = market;
    if (company_name !== undefined) updates.company_name = company_name;
    if (notes !== undefined)        updates.notes        = notes;

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
