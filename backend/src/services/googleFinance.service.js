/**
 * Google Finance Service
 *
 * Fetches real-time stock prices by scraping Google Finance HTML.
 * URL format: https://www.google.com/finance/quote/{SYMBOL}:{EXCHANGE}
 *
 * Examples:
 *   MAYBANK:KLSE  — Bursa Malaysia
 *   AAPL:NASDAQ   — NASDAQ US
 *   D05:SGX       — Singapore Exchange
 *   0700:HKEX     — Hong Kong Exchange
 */

const axios = require('axios');
const logger = require('../utils/logger');

// In-memory price cache — shared across all requests in this process.
// Key: "SYMBOL:EXCHANGE". Value: { data, cachedAt (ms timestamp) }
const priceCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const googleAxios = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }
});

// Backward-compat: map old country codes stored in DB to Google Finance exchange codes
const LEGACY_EXCHANGE_MAP = {
  MY: 'KLSE',
  SG: 'SGX',
  US: 'NASDAQ',
};

const resolveExchange = (market) => LEGACY_EXCHANGE_MAP[market] || market;

/**
 * Fetch price data for a single stock from Google Finance.
 *
 * @param {string} symbol   - Ticker symbol (e.g., MAYBANK, AAPL)
 * @param {string} market   - Exchange code or legacy country code (KLSE, NASDAQ, NYSE, SGX, MY, US, SG)
 * @returns {Promise<Object|null>} { price, change, changePercent, timestamp } or null on failure
 */
const getQuote = async (symbol, market) => {
  const exchange = resolveExchange(market);
  const cacheKey = `${symbol}:${exchange}`;

  // Return cached price if still fresh
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    logger.info(`Google Finance cache hit for ${cacheKey}`);
    return cached.data;
  }

  // Crypto on Google Finance has no exchange suffix — just the pair (e.g. BTC-USD)
  const url = exchange === 'CRYPTO'
    ? `https://www.google.com/finance/quote/${encodeURIComponent(symbol)}`
    : `https://www.google.com/finance/quote/${encodeURIComponent(symbol)}:${encodeURIComponent(exchange)}`;

  try {
    const { data } = await googleAxios.get(url);

    const priceMatch = data.match(/data-last-price="([^"]+)"/);
    const changeMatch = data.match(/data-last-normal-market-change="([^"]+)"/);
    const changePercentMatch = data.match(/data-last-normal-market-change-percent="([^"]+)"/);

    if (!priceMatch) {
      const ref = exchange === 'CRYPTO' ? symbol : `${symbol}:${exchange}`;
      logger.warn(`Google Finance: no price found for ${ref}`);
      return null;
    }

    const result = {
      price: parseFloat(priceMatch[1]),
      change: changeMatch ? parseFloat(changeMatch[1]) : null,
      changePercent: changePercentMatch ? parseFloat(changePercentMatch[1]) : null,
      timestamp: new Date().toISOString(),
    };

    priceCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  } catch (error) {
    const ref = exchange === 'CRYPTO' ? symbol : `${symbol}:${exchange}`;
    logger.error(`Google Finance error for ${ref}: ${error.message}`);
    return null;
  }
};

/**
 * Fetch price data for multiple stocks.
 * Processes in batches of 5 with a small delay to avoid rate limiting.
 *
 * @param {Array<{symbol: string, market: string}>} items - Watchlist items from DB
 * @returns {Promise<Object>} Map of symbol → quote data (or null on failure)
 */
const getQuotes = async (items) => {
  if (!items || items.length === 0) return {};

  const results = {};
  const toFetch = [];

  // Serve cached items immediately, collect what needs a network call
  for (const item of items) {
    const exchange  = resolveExchange(item.market);
    const cacheKey  = `${item.symbol}:${exchange}`;
    const cached    = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      results[item.symbol] = cached.data;
    } else {
      toFetch.push(item);
    }
  }

  if (toFetch.length > 0) {
    logger.info(`Google Finance: ${items.length - toFetch.length} cached, ${toFetch.length} to fetch`);
  }

  // Fetch uncached symbols in batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (item) => {
        results[item.symbol] = await getQuote(item.symbol, item.market);
      })
    );

    if (i + BATCH_SIZE < toFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return results;
};

module.exports = { getQuote, getQuotes };
