const { Redis } = require("@upstash/redis");

class UpstashRedisClient {
  constructor() {
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  async connect() {
    console.log("Upstash Redis: Connected (HTTP mode)");
  }

  getClient() {
    return this.client;
  }

  async set(key, value, ttlSeconds = 300) {
    return await this.client.set(key, JSON.stringify(value), { ex: ttlSeconds });
  }

  async get(key) {
    const val = await this.client.get(key);
    return val ? JSON.parse(val) : null;
  }

  async del(key) {
    return await this.client.del(key);
  }

  async exists(key) {
    return await this.client.exists(key);
  }

  async incr(key) {
    return await this.client.incr(key);
  }

  async ttl(key) {
    return await this.client.ttl(key);
  }

  async ping() {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect() {
    console.log("Upstash Redis: No disconnect needed (HTTP mode)");
  }
}

module.exports = new UpstashRedisClient();
