/**
 * Tech Feed Controller
 *
 * Handles fetching and caching of developer tech news from
 * Hacker News, Dev.to, and GitHub Trending.
 *
 * Routes:
 * - GET /       → getFeed        (fresh fetch from all sources)
 * - GET /cached → getCachedFeed  (DB only, no external fetch)
 * - DELETE /cache → clearCache   (admin only)
 */

const { sendSuccess, sendError } = require('../utils/response.helper');
const techFeedService = require('../services/techFeed.service');
const logger = require('../utils/logger');

/**
 * Fetch fresh tech feed from all three sources.
 * Results are cached in-memory and in the DB for 60 minutes.
 */
const getFeed = async (req, res) => {
  try {
    const items = await techFeedService.fetchAll();
    return sendSuccess(
      res,
      { sources: ['hackernews', 'devto', 'github'], items, total: items.length },
      'Tech feed loaded',
      200
    );
  } catch (error) {
    logger.error(`Tech feed getFeed error: ${error.message}`);
    return sendError(res, 'Failed to fetch tech feed', 500);
  }
};

/**
 * Return cached tech feed from DB without any external fetch.
 * Used on page open to immediately show existing data.
 */
const getCachedFeed = async (req, res) => {
  try {
    const items = await techFeedService.getAllCachedFromDb();
    return sendSuccess(
      res,
      { sources: ['hackernews', 'devto', 'github'], items, total: items.length },
      'Tech feed cache loaded',
      200
    );
  } catch (error) {
    logger.error(`Tech feed getCachedFeed error: ${error.message}`);
    return sendError(res, 'Failed to fetch cached tech feed', 500);
  }
};

/**
 * Clear the tech feed cache (admin only).
 */
const clearCache = async (req, res) => {
  try {
    if (req.user?.username !== 'admin') {
      logger.warn(`Non-admin attempted to clear tech feed cache: ${req.user?.username}`);
      return sendError(res, 'Unauthorized', 403);
    }

    await techFeedService.clearCache();
    return sendSuccess(res, null, 'Tech feed cache cleared', 200);
  } catch (error) {
    logger.error(`Tech feed clearCache error: ${error.message}`);
    return sendError(res, 'Failed to clear tech feed cache', 500);
  }
};

module.exports = { getFeed, getCachedFeed, clearCache };
