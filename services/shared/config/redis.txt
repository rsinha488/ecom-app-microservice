const redis = require('redis');

/**
 * Redis Client Configuration
 * Singleton pattern for Redis connection
 */
class RedisClient {
  constructor() {
    if (RedisClient.instance) {
      return RedisClient.instance;
    }

    this.client = null;
    this.isConnected = false;
    RedisClient.instance = this;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.isConnected) {
      return this.client;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379', 
        password: process.env.REDIS_PASSWORD || undefined, //we dont have password for now
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Too many reconnection attempts');
              return new Error('Too many reconnection attempts');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected successfully');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis: Reconnecting...');
      });

      this.client.on('ready', () => {
        console.log('Redis: Ready to use');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Redis connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Set cache with TTL
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      const client = this.getClient();
      const serialized = JSON.stringify(value);
      await client.setEx(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  /**
   * Get cached value
   */
  async get(key) {
    try {
      const client = this.getClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async del(key) {
    try {
      const client = this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Redis DEL PATTERN error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Set TTL on existing key
   */
  async expire(key, ttlSeconds) {
    try {
      const client = this.getClient();
      await client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incr(key) {
    try {
      const client = this.getClient();
      return await client.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  }

  /**
   * Get TTL of key
   */
  async ttl(key) {
    try {
      const client = this.getClient();
      return await client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll() {
    try {
      const client = this.getClient();
      await client.flushAll();
      return true;
    } catch (error) {
      console.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        console.log('Redis: Disconnected');
      }
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }

  /**
   * Health check
   */
  async ping() {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const redisClient = new RedisClient();
module.exports = redisClient;
