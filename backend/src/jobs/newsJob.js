const pool = require('../config/database').pool;
const newsService = require('../services/news.service');
const logger = require('../utils/logger');

const run = async () => {
  const [rows] = await pool.execute(
    'SELECT DISTINCT symbol, market, company_name FROM stock_watchlist WHERE is_deleted = 0'
  );
  if (rows.length === 0) {
    logger.info('[newsJob] No watchlist symbols found, skipping');
    return;
  }
  logger.info(`[newsJob] Fetching news for ${rows.length} symbols`);
  await newsService.getNewsForWatchlist(rows);
  logger.info('[newsJob] Done');
};

module.exports = { run };
