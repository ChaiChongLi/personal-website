/**
 * News Controller
 *
 * Handles stock news fetching and caching.
 * Supports news retrieval by individual symbol or for entire watchlist.
 *
 * Routes:
 * - GET /:symbol: Get news for a specific stock
 * - GET /watchlist: Get news for all user's watchlist stocks
 * - DELETE /cache: Clear news cache (admin only)
 */

const { sendSuccess, sendError } = require('../utils/response.helper');
const newsService = require('../services/news.service');
const stockModel = require('../models/stock.model');
const logger = require('../utils/logger');

/**
 * Get news articles for a specific stock symbol
 *
 * Fetches news from Google News RSS feed.
 * Checks cache first, fetches fresh if cache expired.
 *
 * @param {Object} req - Express request with params: {symbol} and query: {companyName}
 * @param {Object} res - Express response
 */
const getNewsBySymbol = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { companyName } = req.query;

    if (!symbol) {
      return sendError(res, 'Symbol is required', 400);
    }

    // Use provided company name or just the symbol for search
    const searchTerm = companyName || symbol;

    logger.info(`Fetching news for symbol: ${symbol}`);

    // Fetch news (from cache or fresh from Google News)
    const news = await newsService.fetchNewsBySymbol(symbol, searchTerm);

    logger.info(`Retrieved ${news.length} news articles for ${symbol}`);

    return sendSuccess(
      res,
      {
        symbol,
        articles: news,
        count: news.length
      },
      'News retrieved successfully',
      200
    );
  } catch (error) {
    logger.error('Get news error:', error.message);
    return sendError(res, 'Failed to retrieve news', 500);
  }
};

/**
 * Get aggregated news for all stocks in user's watchlist
 *
 * Batch fetches news for each watchlist item.
 * Returns news organized by symbol.
 *
 * @param {Object} req - Express request with authenticated user
 * @param {Object} res - Express response
 */
const getNewsForWatchlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's watchlist
    const watchlist = await stockModel.getAllByUserId(userId);

    if (watchlist.length === 0) {
      logger.info(`Empty watchlist for user: ${userId}`);
      return sendSuccess(res, {}, 'Empty watchlist', 200);
    }

    logger.info(`Fetching news for ${watchlist.length} watchlist items`);

    // Batch fetch news for all watchlist items
    const newsData = await newsService.getNewsForWatchlist(watchlist);

    // Organize response
    const aggregatedNews = {
      totalSymbols: watchlist.length,
      symbols: newsData
    };

    logger.info(`Retrieved news for ${watchlist.length} symbols`);

    return sendSuccess(
      res,
      aggregatedNews,
      'Watchlist news retrieved successfully',
      200
    );
  } catch (error) {
    logger.error('Get watchlist news error:', error.message);
    return sendError(res, 'Failed to retrieve watchlist news', 500);
  }
};

/**
 * Clear news cache (admin only)
 *
 * Administrative endpoint to manually clear the news cache.
 * Useful for testing or when cache becomes corrupted.
 *
 * @param {Object} req - Express request with authenticated admin user
 * @param {Object} res - Express response
 */
const clearNewsCache = async (req, res, next) => {
  try {
    // Verify admin access
    if (req.user.username !== 'admin') {
      logger.warn(`Non-admin user attempted to clear cache: ${req.user.username}`);
      return sendError(res, 'Unauthorized', 403);
    }

    logger.warn('Clearing news cache');

    // Clear cache
    await newsService.clearCache();

    return sendSuccess(
      res,
      null,
      'News cache cleared successfully',
      200
    );
  } catch (error) {
    logger.error('Clear cache error:', error.message);
    return sendError(res, 'Failed to clear cache', 500);
  }
};

/**
 * Get cached news from DB for all watchlist stocks — no external fetch.
 * Used to load existing data on page open without hitting Google.
 */
const getFromCache = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const watchlist = await stockModel.getAllByUserId(userId);

    if (watchlist.length === 0) {
      return sendSuccess(res, { totalSymbols: 0, symbols: {} }, 'No watchlist stocks', 200);
    }

    const symbols = {};
    for (const item of watchlist) {
      symbols[item.symbol] = await newsService.readAllCachedForSymbol(item.symbol);
    }

    return sendSuccess(res, { totalSymbols: watchlist.length, symbols }, 'Cached news retrieved', 200);
  } catch (error) {
    logger.error(`Get cached news error: ${error.message}`);
    return sendError(res, 'Failed to retrieve cached news', 500);
  }
};

module.exports = {
  getNewsBySymbol,
  getNewsForWatchlist,
  getFromCache,
  clearNewsCache
};
