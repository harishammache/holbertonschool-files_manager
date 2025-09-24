import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
    });

    this.client.on('error', (err) => console.error('Redis error:', err));

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected === true;
  }

  async get(key) {
    return this.getAsync(key);
  }

  async set(key, value, duration) {
    if (typeof duration === 'number') {
      await this.setAsync(key, value, 'EX', duration);
    } else {
      await this.setAsync(key, value);
    }
  }

  async del(key) {
    await this.delAsync(key);
  }
}

const redisClient = new RedisClient();

export { RedisClient };
export default redisClient;
