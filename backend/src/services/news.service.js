/**
 * News Service
 *
 * Fetches and caches stock-related news articles.
 * Uses Google News RSS feed for reliability and simplicity.
 * Implements caching to minimize API calls (30-minute TTL).
 *
 * Features:
 * - Fetch news by symbol
 * - Cache management (store and retrieve from DB)
 * - XML RSS parsing
 * - HTML tag stripping from snippets
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Create axios instance for news requests
const newsAxios = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// Cache TTL in milliseconds (30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Strip HTML tags from text
 *
 * Removes common HTML tags to clean up article descriptions.
 * Simple regex-based approach suitable for RSS snippets.
 *
 * @param {string} html - HTML string with tags
 * @returns {string} Text with HTML tags removed
 */
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
};

/**
 * Parse RSS XML feed
 *
 * Converts XML RSS feed into JavaScript objects.
 * Extracts title, link, publication date, and description.
 *
 * @param {string} xmlData - Raw RSS XML from Google News
 * @returns {Promise<Array>} Array of parsed news items
 * @throws {Error} If XML parsing fails
 */
const parseRSSFeed = async (xmlData) => {
  try {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);

    const newsItems = [];
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Navigate RSS structure: rss -> channel -> item
    if (result.rss && result.rss.channel && result.rss.channel[0].item) {
      const items = result.rss.channel[0].item;

      for (const item of items) {
        // Extract fields with fallback values
        const title = item.title ? item.title[0] : '';
        const link = item.link ? item.link[0] : '';
        const pubDate = item.pubDate ? new Date(item.pubDate[0]) : null;
        const description = item.description ? item.description[0] : '';

        // Skip articles older than 24 hours
        if (!pubDate || pubDate < cutoff) continue;

        // Clean up description - strip HTML tags
        const snippet = stripHtmlTags(description).substring(0, 500);

        // Extract source from description if available
        let source = 'Google News';
        const sourceMatch = description.match(/<a href=".*?">(.*?)<\/a>/);
        if (sourceMatch && sourceMatch[1]) {
          source = stripHtmlTags(sourceMatch[1]);
        }

        newsItems.push({
          headline: title,
          url: link,
          source: source,
          published_at: pubDate,
          snippet: snippet
        });
      }
    }

    logger.info(`Parsed ${newsItems.length} news items from RSS feed (last 24h)`);
    return newsItems;
  } catch (error) {
    logger.error(`Error parsing RSS feed: ${error.message}`);
    throw error;
  }
};

/**
 * Get cached news for a symbol if available and fresh
 *
 * Checks if we have recent news cached in the database.
 * Only returns cache if it's less than 30 minutes old.
 *
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Array|null>} Array of news items or null if cache expired/missing
 * @throws {Error} If database query fails
 */
const getCachedNews = async (symbol) => {
  try {
    const query = `
      SELECT headline, source, url, published_at, snippet
      FROM news_cache
      WHERE symbol = ?
        AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        AND published_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY headline, published_at
      ORDER BY published_at DESC
      LIMIT 50
    `;

    const [rows] = await pool.execute(query, [symbol]);

    if (rows.length === 0) {
      logger.info(`No cached news found for ${symbol}`);
      return null;
    }

    logger.info(`Found ${rows.length} cached news items for ${symbol}`);
    return rows;
  } catch (error) {
    logger.error(`Error retrieving cached news: ${error.message}`);
    return null; // Return null on cache retrieval error, fall back to fresh fetch
  }
};

/**
 * Save news items to cache database
 *
 * Stores fetched news items with automatic expiration after 30 minutes.
 * Prevents duplicate entries for the same symbol.
 *
 * @param {string} symbol - Stock ticker symbol
 * @param {Array} newsItems - Array of news objects to cache
 * @returns {Promise<void>}
 */
const saveToCache = async (symbol, newsItems) => {
  try {
    // Insert new news items (no delete — rows accumulate, old ones expire naturally)
    for (const item of newsItems) {
      const insertQuery = `
        INSERT INTO news_cache (symbol, headline, source, url, published_at, snippet, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
      `;

      await pool.execute(insertQuery, [
        symbol,
        item.headline,
        item.source,
        item.url,
        item.published_at,
        item.snippet
      ]);
    }

    logger.info(`Cached ${newsItems.length} news items for ${symbol}`);
  } catch (error) {
    logger.error(`Error saving news to cache: ${error.message}`);
    // Don't throw - graceful degradation if caching fails
  }
};

/**
 * Fetch news for a specific stock symbol
 *
 * Checks cache first, then fetches fresh news from Google News RSS if not cached.
 * Automatically caches results for future requests.
 *
 * @param {string} symbol - Stock ticker symbol
 * @param {string} companyName - Full company name for search
 * @returns {Promise<Array>} Array of news items
 * @throws {Error} If both cache and API call fail
 */
const fetchNewsBySymbol = async (symbol, companyName) => {
  try {
    // Check for cached news first
    const cachedNews = await getCachedNews(symbol);
    if (cachedNews) {
      return cachedNews;
    }

    // Not in cache or expired, fetch fresh news
    logger.info(`Fetching fresh news for ${symbol}`);

    // Google News RSS endpoint
    const rssUrl = 'https://news.google.com/rss/search';
    const response = await newsAxios.get(rssUrl, {
      params: {
        q: `${companyName}`, // Search query
        hl: 'en-US',
        gl: 'US',
        ceid: 'US:en'
      }
    });

    // Parse RSS XML
    const newsItems = await parseRSSFeed(response.data);

    // Cache the results
    await saveToCache(symbol, newsItems);

    return newsItems;
  } catch (error) {
    logger.error(`Error fetching news for ${symbol}:`, error.message);

    // Fallback to cached news even if expired
    const staleCache = await pool.execute(
      'SELECT headline, source, url, published_at, snippet FROM news_cache WHERE symbol = ? LIMIT 10',
      [symbol]
    );

    if (staleCache[0].length > 0) {
      logger.warn(`Using stale cached news for ${symbol}`);
      return staleCache[0];
    }

    throw error;
  }
};

/**
 * Get news for all stocks in a user's watchlist
 *
 * Batch fetches news for multiple symbols.
 * Returns aggregated results organized by symbol.
 *
 * @param {Array} watchlistItems - Array of watchlist objects with {symbol, company_name}
 * @returns {Promise<Object>} Object mapping symbols to news arrays
 */
const getNewsForWatchlist = async (watchlistItems) => {
  const results = {};

  // Fetch news for each watchlist item in parallel
  const promises = watchlistItems.map(async (item) => {
    try {
      const news = await fetchNewsBySymbol(item.symbol, item.company_name);
      results[item.symbol] = news;
    } catch (error) {
      logger.error(`Failed to fetch news for ${item.symbol}:`, error.message);
      results[item.symbol] = [];
    }
  });

  await Promise.all(promises);
  return results;
};

/**
 * Clear all news from cache
 *
 * Admin function to manually clear the entire news cache.
 * Used for testing or when cache becomes corrupted.
 *
 * @returns {Promise<number>} Number of cache entries deleted
 * @throws {Error} If database operation fails
 */
const clearCache = async () => {
  try {
    const [result] = await pool.execute('TRUNCATE TABLE news_cache');
    logger.info('News cache cleared');
    return 0;
  } catch (error) {
    logger.error(`Error clearing news cache: ${error.message}`);
    throw error;
  }
};

/**
 * Read all cached news for a symbol from DB (no TTL check, no external fetch)
 * Used for loading existing data on page open.
 */
const readAllCachedForSymbol = async (symbol) => {
  try {
    const [rows] = await pool.execute(`
      SELECT headline, source, url, published_at, snippet, MAX(created_at) AS created_at
      FROM news_cache
      WHERE symbol = ?
        AND published_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY headline, published_at
      ORDER BY published_at DESC
    `, [symbol]);
    return rows;
  } catch (error) {
    logger.error(`Error reading cached news for ${symbol}: ${error.message}`);
    return [];
  }
};

module.exports = {
  fetchNewsBySymbol,
  parseRSSFeed,
  getCachedNews,
  saveToCache,
  getNewsForWatchlist,
  readAllCachedForSymbol,
  clearCache,
  stripHtmlTags
};
