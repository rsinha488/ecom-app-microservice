const redisClient = require('../config/redis');

/**
 * Cache Middleware Factory
 * Creates caching middleware with configurable options
 */

/**
 * Generate cache key from request
 */
function generateCacheKey(req, prefix = '') {
  const { method, originalUrl, user } = req;
  const userId = user?.sub || 'anonymous';
  return `${prefix}:${method}:${originalUrl}:${userId}`;
}

/**
 * Cache GET requests
 * @param {Object} options - Caching options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {string} options.prefix - Cache key prefix (default: 'cache')
 * @param {function} options.condition - Function to determine if response should be cached
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = 300,
    prefix = 'cache',
    condition = () => true
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req, prefix);

    try {
      // Try to get cached response
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`Cache HIT: ${cacheKey}`);

        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        return res.json(cachedData);
      }

      console.log(`Cache MISS: ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = function(data) {
        // Check condition before caching
        if (condition(req, res, data)) {
          // Cache in background
          redisClient.set(cacheKey, data, ttl).catch(err => {
            console.error('Error caching response:', err);
          });
        }

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      res.setHeader('X-Cache', 'ERROR');
      next();
    }
  };
}

/**
 * Invalidate cache by pattern
 */
async function invalidateCache(pattern) {
  try {
    const count = await redisClient.delPattern(pattern);
    console.log(`Invalidated ${count} cache entries matching: ${pattern}`);
    return count;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
}

/**
 * Cache invalidation middleware
 * Automatically invalidates cache on POST, PUT, PATCH, DELETE
 */
function cacheInvalidationMiddleware(pattern) {
  return async (req, res, next) => {
    const { method } = req;

    // Only invalidate on write operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Store original send
      const originalSend = res.send.bind(res);

      res.send = function(data) {
        // Invalidate cache after successful response
        if (res.statusCode >= 200 && res.statusCode < 300) {
          invalidateCache(pattern).catch(err => {
            console.error('Error invalidating cache:', err);
          });
        }

        return originalSend(data);
      };
    }

    next();
  };
}

/**
 * Smart cache middleware for list endpoints
 * Caches list views with pagination support
 */
function listCacheMiddleware(options = {}) {
  const {
    ttl = 300,
    prefix = 'list',
    maxPages = 10
  } = options;

  return cacheMiddleware({
    ttl,
    prefix,
    condition: (req, res, data) => {
      // Cache only successful responses
      if (res.statusCode !== 200) return false;

      // Cache only if data is array or has results array
      if (Array.isArray(data)) return true;
      if (data.results && Array.isArray(data.results)) return true;

      return false;
    }
  });
}

/**
 * Detail cache middleware for single item endpoints
 */
function detailCacheMiddleware(options = {}) {
  const {
    ttl = 600, // Longer TTL for details
    prefix = 'detail'
  } = options;

  return cacheMiddleware({
    ttl,
    prefix,
    condition: (req, res, data) => {
      // Cache only successful responses with data
      return res.statusCode === 200 && data && typeof data === 'object';
    }
  });
}

/**
 * Cache warming utility
 * Pre-populate cache with frequently accessed data
 */
async function warmCache(key, dataFunction, ttl = 300) {
  try {
    const data = await dataFunction();
    await redisClient.set(key, data, ttl);
    console.log(`Cache warmed: ${key}`);
    return true;
  } catch (error) {
    console.error('Cache warming error:', error);
    return false;
  }
}

/**
 * Cache statistics
 */
async function getCacheStats() {
  try {
    const client = redisClient.getClient();
    const info = await client.info('stats');

    // Parse info string
    const stats = {};
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return {
      connected: redisClient.isConnected,
      keyspace_hits: stats.keyspace_hits || '0',
      keyspace_misses: stats.keyspace_misses || '0',
      hit_rate: calculateHitRate(stats),
      total_commands_processed: stats.total_commands_processed || '0'
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { connected: false, error: error.message };
  }
}

function calculateHitRate(stats) {
  const hits = parseInt(stats.keyspace_hits || 0);
  const misses = parseInt(stats.keyspace_misses || 0);
  const total = hits + misses;

  if (total === 0) return '0%';

  const rate = ((hits / total) * 100).toFixed(2);
  return `${rate}%`;
}

module.exports = {
  cacheMiddleware,
  listCacheMiddleware,
  detailCacheMiddleware,
  cacheInvalidationMiddleware,
  invalidateCache,
  warmCache,
  getCacheStats,
  generateCacheKey
};
