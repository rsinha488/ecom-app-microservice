const redisClient = require('../config/redis');

/**
 * Distributed Rate Limiting using Redis
 * Works across multiple service instances
 */

/**
 * Redis-based rate limiter
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.keyPrefix - Redis key prefix
 */
function distributedRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    keyPrefix = 'ratelimit',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (req, res, next) => {
    try {
      // Generate key based on IP and endpoint
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${identifier}:${req.originalUrl}`;

      // Get current count
      const current = await redisClient.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      // Get TTL
      const ttl = await redisClient.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      // Check if limit exceeded
      if (current > max) {
        res.setHeader('Retry-After', ttl);
        return res.status(429).json({
          error: 'too_many_requests',
          error_description: 'Too many requests, please try again later',
          retry_after: ttl
        });
      }

      // Handle skip options
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send.bind(res);

        res.send = function(data) {
          const shouldSkip =
            (skipSuccessfulRequests && res.statusCode < 400) ||
            (skipFailedRequests && res.statusCode >= 400);

          if (shouldSkip) {
            // Decrement counter
            redisClient.getClient().decr(key).catch(err => {
              console.error('Error decrementing rate limit:', err);
            });
          }

          return originalSend(data);
        };
      }

      next();
    } catch (error) {
      console.error('Distributed rate limit error:', error);
      // Fail open - allow request on error
      next();
    }
  };
}

/**
 * Sliding window rate limiter
 * More accurate than fixed window
 */
function slidingWindowRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyPrefix = 'ratelimit:sliding'
  } = options;

  return async (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${identifier}:${req.originalUrl}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      const client = redisClient.getClient();

      // Add current request
      await client.zAdd(key, { score: now, value: `${now}` });

      // Remove old entries
      await client.zRemRangeByScore(key, 0, windowStart);

      // Count requests in window
      const count = await client.zCard(key);

      // Set expiry
      await client.expire(key, Math.ceil(windowMs / 1000));

      // Calculate reset time
      const oldestEntry = await client.zRange(key, 0, 0, { withScores: true });
      const resetTime = oldestEntry.length > 0
        ? parseInt(oldestEntry[0].score) + windowMs
        : now + windowMs;

      // Set headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      if (count > max) {
        const ttl = Math.ceil((resetTime - now) / 1000);
        res.setHeader('Retry-After', ttl);
        return res.status(429).json({
          error: 'too_many_requests',
          error_description: 'Too many requests, please try again later',
          retry_after: ttl
        });
      }

      next();
    } catch (error) {
      console.error('Sliding window rate limit error:', error);
      next();
    }
  };
}

/**
 * Token bucket rate limiter
 * Allows for burst traffic
 */
function tokenBucketRateLimit(options = {}) {
  const {
    capacity = 100,
    refillRate = 10, // tokens per second
    keyPrefix = 'ratelimit:bucket'
  } = options;

  return async (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${identifier}`;
      const now = Date.now();

      const client = redisClient.getClient();

      // Get bucket data
      const bucketData = await redisClient.get(key);

      let tokens, lastRefill;
      if (bucketData) {
        tokens = bucketData.tokens;
        lastRefill = bucketData.lastRefill;
      } else {
        tokens = capacity;
        lastRefill = now;
      }

      // Calculate tokens to add
      const timePassed = (now - lastRefill) / 1000;
      const tokensToAdd = timePassed * refillRate;
      tokens = Math.min(capacity, tokens + tokensToAdd);

      // Check if request can proceed
      if (tokens < 1) {
        const waitTime = Math.ceil((1 - tokens) / refillRate);
        res.setHeader('Retry-After', waitTime);
        return res.status(429).json({
          error: 'too_many_requests',
          error_description: 'Rate limit exceeded',
          retry_after: waitTime
        });
      }

      // Consume token
      tokens -= 1;

      // Update bucket
      await redisClient.set(key, {
        tokens,
        lastRefill: now
      }, 3600); // 1 hour TTL

      // Set headers
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', Math.floor(tokens));

      next();
    } catch (error) {
      console.error('Token bucket rate limit error:', error);
      next();
    }
  };
}

module.exports = {
  distributedRateLimit,
  slidingWindowRateLimit,
  tokenBucketRateLimit
};
