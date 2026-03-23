const techFeedService = require('../services/techFeed.service');
const logger = require('../utils/logger');

const run = async () => {
  logger.info('[techFeedJob] Fetching all tech feed sources');
  await techFeedService.fetchAll();
  logger.info('[techFeedJob] Done');
};

module.exports = { run };
