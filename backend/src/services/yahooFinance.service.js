/**
 * Yahoo Finance Service
 *
 * Fetches real-time stock market data from Yahoo Finance API.
 * Provides stock quotes, historical data, and market statistics.
 *
 * API Endpoints:
 * - /v8/finance/quote: Real-time quotes for multiple symbols
 * - /v8/finance/chart: Historical price data for charts
 *
 * Includes error handling, retries, and per-symbol error reporting.
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Create axios instance with default configuration
const yahooAxios = axios.create({
  timeout: 8000, // 8 second timeout for API calls
  // Set User-Agent to avoid bot detection
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
  }
});

/**
 * Format market data from Yahoo Finance response
 *
 * Normalizes the raw API response into a consistent format.
 * Extracts relevant fields and handles missing data gracefully.
 *
 * @param {Object} quote - Raw quote object from Yahoo Finance API
 * @returns {Object} Formatted quote object with common fields
 */
const formatMarketData = (quote) => {
  return {
    symbol: quote.symbol,
    shortName: quote.shortName || 'N/A',
    price: quote.regularMarketPrice || 0,
    change: quote.regularMarketChange || 0,
    changePercent: quote.regularMarketChangePercent || 0,
    currency: quote.currency || 'USD',
    volume: quote.regularMarketVolume || 0,
    marketCap: quote.marketCap || null,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
    timestamp: new Date().toISOString()
  };
};

/**
 * Fetch real-time stock quotes for multiple symbols
 *
 * Calls Yahoo Finance quote API for current prices and market data.
 * Supports batch requests for multiple symbols in one call (comma-separated).
 *
 * @param {Array<string>} symbols - Array of stock ticker symbols (e.g., ['AAPL', 'MSFT', 'GOOGL'])
 * @returns {Promise<Object>} Object mapping symbols to quote data
 *   Example: {
 *     AAPL: {symbol, shortName, price, change, changePercent, ...},
 *     MSFT: {...},
 *     ERROR: [{symbol: 'INVALID', error: 'message'}]
 *   }
 * @throws {Error} If API call fails completely
 */
const getQuotes = async (symbols) => {
  try {
    if (!symbols || symbols.length === 0) {
      return {};
    }

    // Yahoo Finance expects comma-separated symbols
    const symbolsStr = symbols.join(',');

    logger.info(`Fetching quotes for symbols: ${symbolsStr}`);

    // Make API call to Yahoo Finance
    const response = await yahooAxios.get('https://query1.finance.yahoo.com/v7/finance/quote', {
      params: {
        symbols: symbolsStr
      }
    });

    const result = {};
    const errors = [];

    // Process each quote in the response
    if (response.data && response.data.quoteResponse && response.data.quoteResponse.result) {
      for (const quote of response.data.quoteResponse.result) {
        if (quote.regularMarketPrice === null || quote.regularMarketPrice === undefined) {
          // Symbol exists but has no data (delisted, invalid, etc.)
          errors.push({
            symbol: quote.symbol,
            error: 'No market data available'
          });
        } else {
          // Valid quote data
          result[quote.symbol] = formatMarketData(quote);
        }
      }
    }

    // Include errors if any symbols failed
    if (errors.length > 0) {
      result.errors = errors;
    }

    return result;
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      // Network timeout - retry once after delay
      logger.warn('Yahoo Finance API timeout, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        return await getQuotes(symbols);
      } catch (retryError) {
        logger.error('Yahoo Finance API retry failed:', retryError.message);
        throw new Error('Unable to fetch stock quotes after retry');
      }
    }

    logger.error('Yahoo Finance API error:', error.message);
    throw error;
  }
};

/**
 * Fetch historical price data for chart display
 *
 * Gets candlestick data (open, close, high, low, volume) for a time period.
 * Used to populate price charts on the frontend.
 *
 * @param {string} symbol - Stock ticker symbol (e.g., 'AAPL')
 * @param {string} period - Time period ('1d', '5d', '1mo', '3mo', '6mo', '1y', '5y')
 * @returns {Promise<Array>} Array of candlestick objects
 *   Each object: {timestamp, open, close, high, low, volume}
 * @throws {Error} If API call fails
 */
const getHistoricalData = async (symbol, period = '1mo') => {
  try {
    logger.info(`Fetching historical data for ${symbol} with period ${period}`);

    // Map period names to interval values
    const interval = period === '1d' ? '5m' : '1d'; // 5-min for 1 day, daily for longer

    const response = await yahooAxios.get('https://query1.finance.yahoo.com/v8/finance/chart/' + symbol, {
      params: {
        interval,
        range: period
      }
    });

    const result = [];

    if (response.data && response.data.chart && response.data.chart.result && response.data.chart.result.length > 0) {
      const chart = response.data.chart.result[0];
      const quotes = chart.quotes || [];

      // Transform candlestick data
      for (const quote of quotes) {
        result.push({
          timestamp: quote.date * 1000, // Convert Unix timestamp to milliseconds
          open: quote.open,
          close: quote.close,
          high: quote.high,
          low: quote.low,
          volume: quote.volume
        });
      }
    }

    return result;
  } catch (error) {
    logger.error(`Error fetching historical data for ${symbol}:`, error.message);
    throw error;
  }
};

/**
 * Fetch news headlines for a stock
 *
 * Searches news articles related to a stock symbol.
 * Returns recent news items for display on stock detail pages.
 *
 * Note: This is a helper function. Actual news fetching is in news.service.js
 * which uses Google News RSS feed.
 *
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Array>} Array of news items
 */
const getNews = async (symbol) => {
  // Note: Real implementation is in news.service.js using Google News RSS
  // This is a placeholder for future Yahoo News API integration
  logger.info(`News service redirecting to dedicated news service`);
  return [];
};

module.exports = {
  getQuotes,
  getHistoricalData,
  getNews,
  formatMarketData
};
