const express = require('express');
const axios = require('axios');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { sendSuccess, sendError } = require('../utils/response.helper');
const logger = require('../utils/logger');

const router = express.Router();

// Simple in-memory cache — rates only update once a day
let cached = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

router.get('/', verifyAccessToken, async (req, res) => {
  try {
    if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
      return sendSuccess(res, cached, 'Currency rates (cached)', 200);
    }

    const { data } = await axios.get(
      'https://api.frankfurter.app/latest?from=USD&to=MYR,SGD,JPY',
      { timeout: 8000 }
    );

    cached   = data;
    cachedAt = Date.now();

    return sendSuccess(res, data, 'Currency rates fetched', 200);
  } catch (error) {
    logger.error(`Currency fetch failed: ${error.message}`);
    if (cached) return sendSuccess(res, cached, 'Currency rates (stale cache)', 200);
    return sendError(res, 'Failed to fetch currency rates', 502);
  }
});

module.exports = router;
