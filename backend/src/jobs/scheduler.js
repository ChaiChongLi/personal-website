const pool = require('../config/database').pool;
const logger = require('../utils/logger');

const JOB_REGISTRY = {
  news:      require('./newsJob'),
  tech_feed: require('./techFeedJob'),
};

const TICK_INTERVAL_MS = 60 * 1000;
let tickTimer = null;

const getEligibleJobs = async () => {
  const [rows] = await pool.execute(`
    SELECT id, job_name, interval_minutes
    FROM scheduler_config
    WHERE enabled = 1
      AND (next_run_at IS NULL OR next_run_at <= NOW())
      AND status != 'running'
  `);
  return rows;
};

const markRunning = (id) =>
  pool.execute('UPDATE scheduler_config SET status = ? WHERE id = ?', ['running', id]);

const markSuccess = (id, intervalMinutes) =>
  pool.execute(`
    UPDATE scheduler_config
    SET status = 'idle',
        last_run_at = NOW(),
        next_run_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
        last_error = NULL
    WHERE id = ?
  `, [intervalMinutes, id]);

const markError = (id, intervalMinutes, errorMessage) =>
  pool.execute(`
    UPDATE scheduler_config
    SET status = 'error',
        last_run_at = NOW(),
        next_run_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
        last_error = ?
    WHERE id = ?
  `, [intervalMinutes, errorMessage, id]);

const tick = async () => {
  try {
    const jobs = await getEligibleJobs();
    for (const job of jobs) {
      const handler = JOB_REGISTRY[job.job_name];
      if (!handler) {
        logger.warn(`[scheduler] Unknown job: ${job.job_name}`);
        continue;
      }
      await markRunning(job.id);
      try {
        await handler.run();
        await markSuccess(job.id, job.interval_minutes);
        logger.info(`[scheduler] ${job.job_name} completed OK`);
      } catch (err) {
        await markError(job.id, job.interval_minutes, err.message);
        logger.error(`[scheduler] ${job.job_name} failed: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[scheduler] tick error: ${err.message}`);
  }
};

const start = () => {
  logger.info('[scheduler] Starting background scheduler');
  tick();
  tickTimer = setInterval(tick, TICK_INTERVAL_MS);
};

const stop = () => {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
    logger.info('[scheduler] Scheduler stopped');
  }
};

module.exports = { start, stop };
