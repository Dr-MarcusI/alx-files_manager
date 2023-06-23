import { createClient } from 'redis';
import { promisify } from 'util';

/**
 * A Redis client class that can be used to interact with Redis.
 */
class RedisClient {
  constructor() {
    this.client = createClient();
    this.isConnected = false;

    this.client.on('error', (err) => {
      console.log('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.asyncSetX = promisify(this.client.setex).bind(this.client);
    this.asyncGet = promisify(this.client.get).bind(this.client);
    this.asyncDel = promisify(this.client.del).bind(this.client);
    this.asyncExpire = promisify(this.client.expire).bind(this.client);
  }

  /**
   * Determines if the client is alive by pinging it.
   *
   * @return {boolean} Returns true if the client is alive, false otherwise.
   */
  isAlive() {
    return this.isConnected;
  }

  /**
   * Sets a key-value pair and sets an expiry time for the key.
   *
   * @param {string} key - the key to set the value for
   * @param {any} value - the value to set for the key
   * @param {number} expiry - the time in seconds for the key to expire
   * @return {Promise<void>} - a Promise that resolves when the key-value pair
   * is set and the expiry is set
   */
  set(key, value, expiry) {
    this.asyncSetX(key, expiry, value);
  }

  /**
   * Retrieves the value associated with the given key.
   *
   * @param {string} key - the key to retrieve the value for
   * @return {*} the value associated with the given key
   */
  get(key) {
    return this.asyncGet(key);
  }

  /**
   * Deletes the specified key using asynchronous delete method.
   *
   * @param {any} key - the key to be deleted
   * @return {Promise} A promise that resolves after the deletion is complete
   */
  del(key) {
    return this.asyncDel(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
