/**
 * Tech Feed Service
 *
 * Aggregates developer news from three sources:
 *   - Hacker News (Y Combinator) — free JSON API
 *   - Dev.to — RSS feed parsed with xml2js
 *   - GitHub Trending — HTML scrape with regex
 *
 * Results are cached in MySQL (tech_feed_cache) with a 60-minute TTL.
 * An additional in-memory Map cache prevents redundant DB writes within the same process.
 */

const axios = require('axios');
const xml2js = require('xml2js');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// In-memory cache: key = 'all', value = { data, cachedAt }
const feedCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

const feedAxios = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  }
});

/**
 * Strip HTML tags and decode common entities.
 */
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

// ── Hacker News ──────────────────────────────────────────────────────────────

/**
 * Fetch top 30 Hacker News stories via the Firebase JSON API.
 * Items are fetched in batches of 5 to avoid hammering the API.
 */
const fetchHackerNews = async () => {
  try {
    const { data: ids } = await feedAxios.get(
      'https://hacker-news.firebaseio.com/v0/topstories.json'
    );
    const top30 = ids.slice(0, 30);
    const items = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < top30.length; i += BATCH_SIZE) {
      const batch = top30.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          try {
            const { data: item } = await feedAxios.get(
              `https://hacker-news.firebaseio.com/v0/item/${id}.json`
            );
            if (!item || !item.title) return null;
            return {
              source: 'hackernews',
              title: item.title,
              url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
              author: item.by || null,
              published_at: item.time ? new Date(item.time * 1000) : null,
              score: item.score || 0,
              snippet: null,
              extra_data: JSON.stringify({ comments: item.descendants || 0 })
            };
          } catch {
            return null;
          }
        })
      );
      items.push(...batchResults.filter(Boolean));

      if (i + BATCH_SIZE < top30.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    logger.info(`Tech feed: fetched ${items.length} HN items`);
    return items;
  } catch (error) {
    logger.warn(`Tech feed: Hacker News fetch failed: ${error.message}`);
    return [];
  }
};

// ── Dev.to ───────────────────────────────────────────────────────────────────

/**
 * Fetch top 20 articles from the Dev.to RSS feed.
 */
const fetchDevTo = async () => {
  try {
    const { data: xml } = await feedAxios.get('https://dev.to/feed');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);
    const items = [];

    const rssItems = result?.rss?.channel?.[0]?.item?.slice(0, 20) || [];
    for (const rssItem of rssItems) {
      const title = rssItem.title?.[0] || '';
      const url   = rssItem.link?.[0]  || '';
      if (!title || !url) continue;

      items.push({
        source: 'devto',
        title,
        url,
        author: rssItem['dc:creator']?.[0] || null,
        published_at: rssItem.pubDate?.[0] ? new Date(rssItem.pubDate[0]) : null,
        score: 0,
        snippet: rssItem.description?.[0]
          ? stripHtml(rssItem.description[0]).slice(0, 500)
          : null,
        extra_data: null
      });
    }

    logger.info(`Tech feed: fetched ${items.length} Dev.to articles`);
    return items;
  } catch (error) {
    logger.warn(`Tech feed: Dev.to fetch failed: ${error.message}`);
    return [];
  }
};

// ── GitHub Trending ───────────────────────────────────────────────────────────

/**
 * Scrape the GitHub Trending page and return up to 20 repos.
 * Uses regex to extract article blocks and repo metadata.
 * Gracefully returns an empty array if the HTML structure changes.
 */
const fetchGitHubTrending = async () => {
  try {
    const { data: html } = await feedAxios.get('https://github.com/trending');
    const items = [];

    // Match each <article class="Box-row"> block
    const articleRegex = /<article\s[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    let match;

    while ((match = articleRegex.exec(html)) !== null && items.length < 20) {
      const block = match[1];

      // Repo link: first /owner/repo href in the block
      const linkMatch = block.match(/href="\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)"/);
      if (!linkMatch) continue;
      const repoPath = linkMatch[1];
      const slashIdx = repoPath.indexOf('/');
      if (slashIdx === -1) continue;
      const owner = repoPath.slice(0, slashIdx);
      const repo  = repoPath.slice(slashIdx + 1);

      // Description paragraph (col-9 class)
      const descMatch = block.match(/<p\s[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      const description = descMatch ? stripHtml(descMatch[1]) : null;

      // Programming language
      const langMatch = block.match(/itemprop="programmingLanguage"[^>]*>\s*([^<]+?)\s*</);
      const language = langMatch ? langMatch[1].trim() : null;

      // Total star count (stargazers link)
      const starsMatch = block.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?([\d,]+)\s*<\/a>/);
      const totalStars = starsMatch
        ? parseInt(starsMatch[1].replace(/,/g, ''), 10)
        : 0;

      // Stars gained today
      const starsTodayMatch = block.match(/([\d,]+)\s+stars?\s+today/i);
      const starsToday = starsTodayMatch
        ? parseInt(starsTodayMatch[1].replace(/,/g, ''), 10)
        : 0;

      items.push({
        source: 'github',
        title: `${owner}/${repo}`,
        url: `https://github.com/${owner}/${repo}`,
        author: owner,
        published_at: null,
        score: totalStars,
        snippet: description,
        extra_data: JSON.stringify({ language, starsToday })
      });
    }

    if (items.length === 0) {
      logger.warn('Tech feed: GitHub Trending scrape returned no items (HTML may have changed)');
    } else {
      logger.info(`Tech feed: fetched ${items.length} GitHub trending repos`);
    }
    return items;
  } catch (error) {
    logger.warn(`Tech feed: GitHub Trending fetch failed: ${error.message}`);
    return [];
  }
};

// ── Database helpers ──────────────────────────────────────────────────────────

/**
 * Upsert items into tech_feed_cache.
 * On duplicate (source + title prefix), updates score and refreshes created_at.
 */
const saveToDb = async (items) => {
  try {
    for (const item of items) {
      await pool.execute(
        `INSERT INTO tech_feed_cache
           (source, title, url, author, published_at, score, snippet, extra_data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           score      = VALUES(score),
           url        = VALUES(url),
           created_at = CURRENT_TIMESTAMP`,
        [
          item.source,
          item.title,
          item.url,
          item.author || null,
          item.published_at || null,
          item.score || 0,
          item.snippet || null,
          item.extra_data || null
        ]
      );
    }
    logger.info(`Tech feed: saved ${items.length} items to DB`);
  } catch (error) {
    logger.error(`Tech feed: saveToDb failed: ${error.message}`);
  }
};

/**
 * Return cached items from DB created within the last 24 hours.
 * Articles older than 24h are excluded — they are stale (no longer trending/top).
 * The 24h window means: if a fresh fetch ran within the last day, those results show.
 * If no fetch has been done recently, the page shows an empty state prompting the user to fetch.
 * Sorted by score DESC, then created_at DESC.
 */
const getAllCachedFromDb = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, source, title, url, author, published_at, score, snippet, extra_data, created_at
       FROM tech_feed_cache
       WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY score DESC, created_at DESC`
    );
    return rows;
  } catch (error) {
    logger.error(`Tech feed: getAllCachedFromDb failed: ${error.message}`);
    return [];
  }
};

/**
 * Clear all entries from tech_feed_cache (admin only).
 * Also resets the in-memory cache.
 */
const clearCache = async () => {
  try {
    await pool.execute('TRUNCATE TABLE tech_feed_cache');
    feedCache.clear();
    logger.info('Tech feed cache cleared');
  } catch (error) {
    logger.error(`Tech feed: clearCache failed: ${error.message}`);
    throw error;
  }
};

// ── Main orchestrator ─────────────────────────────────────────────────────────

/**
 * Fetch fresh data from all three sources in parallel, save to DB, and return.
 * Checks the in-memory cache first to avoid hammering external APIs.
 */
const fetchAll = async () => {
  const cached = feedCache.get('all');
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    logger.info('Tech feed: in-memory cache hit — skipping external fetch');
    return cached.data;
  }

  logger.info('Tech feed: fetching from all three sources');

  const [hnItems, devtoItems, githubItems] = await Promise.all([
    fetchHackerNews(),
    fetchDevTo(),
    fetchGitHubTrending()
  ]);

  const allItems = [...hnItems, ...devtoItems, ...githubItems];

  if (allItems.length > 0) {
    await saveToDb(allItems);
  }

  const dbItems = await getAllCachedFromDb();

  feedCache.set('all', { data: dbItems, cachedAt: Date.now() });
  logger.info(`Tech feed: fetchAll complete — ${dbItems.length} items total`);
  return dbItems;
};

module.exports = {
  fetchAll,
  getAllCachedFromDb,
  clearCache
};
