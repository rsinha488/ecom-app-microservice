const redisClient = require('../config/upstashRedis'); // your Upstash client

/**
 * Generate cache key from request
 */
function generateCacheKey(req, prefix = '') {
  const { method, originalUrl, user } = req;
  const userId = user?.sub || 'anonymous';
  return `${prefix}:${method}:${originalUrl}:${userId}`;
}

/**
 * Register cache key for a namespace (for invalidation)
 */
async function registerCacheKey(namespace, key) {
  try {
    const keys = (await redisClient.get(namespace)) || [];
    if (!keys.includes(key)) {
      keys.push(key);
      await redisClient.set(namespace, keys, 86400); // keep registry for 24h
    }
  } catch (err) {
    console.error('Error registering cache key:', err);
  }
}

/**
 * Invalidate all keys in a namespace
 */
async function invalidateCache(namespace) {
  try {
    const keys = (await redisClient.get(namespace)) || [];
    for (const key of keys) {
      await redisClient.del(key);
    }
    // Clear the registry
    await redisClient.del(namespace);
    console.log(`Invalidated ${keys.length} cache entries for namespace: ${namespace}`);
    return keys.length;
  } catch (err) {
    console.error('Cache invalidation error:', err);
    return 0;
  }
}

/**
 * Generic cache middleware for GET requests
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = 300,
    prefix = 'cache',
    condition = () => true,
  } = options;

  const namespace = `${prefix}:keys`;

  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const cacheKey = generateCacheKey(req, prefix);

    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      res.setHeader('X-Cache', 'MISS');

      const originalJson = res.json.bind(res);

      res.json = async function (data) {
        if (condition(req, res, data)) {
          await redisClient.set(cacheKey, data, ttl);
          await registerCacheKey(namespace, cacheKey);
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      res.setHeader('X-Cache', 'ERROR');
      next();
    }
  };
}

/**
 * Detail cache middleware (single item)
 */
function detailCacheMiddleware(options = {}) {
  return cacheMiddleware({ ...options, prefix: options.prefix || 'detail' });
}

/**
 * Cache invalidation middleware for write operations
 */
function cacheInvalidationMiddleware(namespace) {
  return async (req, res, next) => {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!writeMethods.includes(req.method)) return next();

    const originalSend = res.send.bind(res);

    res.send = async function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await invalidateCache(namespace);
      }
      return originalSend(data);
    };

    next();
  };
}

module.exports = {
  cacheMiddleware,
  detailCacheMiddleware,
  cacheInvalidationMiddleware,
  invalidateCache,
  generateCacheKey,
};
