/**
 * KLSE Screener Service
 *
 * Fetches real-time stock prices for Malaysia (Bursa) stocks by scraping klsescreener.com.
 * Used instead of Google Finance for KLSE/MY market stocks because it provides richer data:
 *   - Price, change, change %
 *   - Volume, Dividend Yield (DY), P/E, NTA, Market Cap
 *
 * URL format: https://www.klsescreener.com/v2/stocks/view/{code}
 * where {code} is the numeric Bursa stock code (e.g., 1155 for MAYBANK, 5280 for KIP REIT).
 *
 * NOTE: The symbol stored in stock_watchlist for KLSE stocks must be the numeric Bursa code,
 * not the ticker name. Example: use "1155" not "MAYBANK".
 */

const axios = require('axios');
const logger = require('../utils/logger');

// In-memory price cache — shared across all requests in this process.
// Key: symbol string. Value: { data, cachedAt (ms timestamp) }
const priceCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const klseAxios = axios.create({
  timeout: 15000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }
});

/**
 * Strip HTML tags and trim whitespace from a string.
 */
const stripTags = (str) => str.replace(/<[^>]*>/g, '').trim();

/**
 * Extract a stat value from the stock page's <td>Label</td><td>Value</td> table.
 *
 * @param {string} html - Full page HTML
 * @param {string} label - Label text to find (supports regex escapes)
 * @returns {string|null} Extracted value or null
 */
const getStat = (html, label) => {
  const re = new RegExp(`<td[^>]*>\\s*${label}\\s*<\\/td>\\s*<td[^>]*>([^<]+)<\\/td>`, 'i');
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
};

/**
 * Fetch price and stats for a single Malaysia stock from KLSE Screener.
 *
 * @param {string} symbol - Bursa numeric stock code (e.g., "1155", "5280")
 * @returns {Promise<Object|null>} Quote object or null on failure
 *   {
 *     price: number,
 *     change: number|null,
 *     changePercent: number|null,
 *     volume: string|null,       e.g. "1,234,500"
 *     dy: string|null,           e.g. "6.52%"
 *     pe: string|null,           e.g. "12.34"
 *     nta: string|null,          e.g. "1.23"
 *     marketCap: string|null,    e.g. "RM 2.34B"
 *     timestamp: string          ISO timestamp
 *   }
 */
const getQuote = async (symbol) => {
  // Return cached price if still fresh
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    logger.info(`KLSE cache hit for ${symbol}`);
    return cached.data;
  }

  const url = `https://www.klsescreener.com/v2/stocks/view/${encodeURIComponent(symbol)}`;

  try {
    const { data: html } = await klseAxios.get(url);

    // Price — <span id="price" data-value="0.920">0.920</span>
    const priceMatch = html.match(/<span[^>]*id=["']price["'][^>]*data-value=["']([\d.]+)["']/);
    if (!priceMatch) {
      logger.warn(`KLSE Screener: no price data found for symbol ${symbol}`);
      return null;
    }

    // Change — <span id="change" data-value="-0.010">
    const changeMatch = html.match(/<span[^>]*id=["']change["'][^>]*data-value=["']([+-]?[\d.]+)["']/);
    // Change % — <span id="change_percent" data-value="-1.1">
    const pctMatch = html.match(/<span[^>]*id=["']change_percent["'][^>]*data-value=["']([+-]?[\d.]+)["']/);

    const result = {
      price:         parseFloat(priceMatch[1]),
      change:        changeMatch ? parseFloat(changeMatch[1]) : null,
      changePercent: pctMatch    ? parseFloat(pctMatch[1])   : null,
      volume:        getStat(html, 'Volume'),
      dy:            getStat(html, 'DY'),
      pe:            getStat(html, 'P\\/E'),
      nta:           getStat(html, 'NTA'),
      marketCap:     getStat(html, 'Market Cap'),
      timestamp:     new Date().toISOString(),
    };

    priceCache.set(symbol, { data: result, cachedAt: Date.now() });
    return result;
  } catch (error) {
    logger.error(`KLSE Screener error for ${symbol}: ${error.message}`);
    return null;
  }
};

/**
 * Fetch prices for multiple KLSE stocks.
 * Cached symbols (< 60s old) are returned immediately with no network call.
 * Only stale/new symbols hit the network, sequentially with a polite delay.
 *
 * @param {Array<{symbol: string}>} items - Watchlist items with KLSE market
 * @returns {Promise<Object>} Map of symbol → quote object (or null on failure)
 */
const getQuotes = async (items) => {
  if (!items || items.length === 0) return {};

  const results = {};
  const toFetch = [];

  // Serve cached items immediately, collect what needs a network call
  for (const item of items) {
    const cached = priceCache.get(item.symbol);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      results[item.symbol] = cached.data;
    } else {
      toFetch.push(item);
    }
  }

  if (toFetch.length > 0) {
    logger.info(`KLSE Screener: ${items.length - toFetch.length} cached, ${toFetch.length} to fetch`);
  }

  // Fetch uncached symbols sequentially with polite delay
  for (let i = 0; i < toFetch.length; i++) {
    results[toFetch[i].symbol] = await getQuote(toFetch[i].symbol);
    if (i < toFetch.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return results;
};

module.exports = { getQuote, getQuotes };
