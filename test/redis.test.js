/* eslint-disable jest/valid-expect */
/* eslint-disable no-unused-expressions */
/* eslint-disable jest/prefer-expect-assertions */
import chai from 'chai';
import chaiHttp from 'chai-http';
import { describe } from 'mocha';
import redisClient from '../utils/redis';

chai.use(chaiHttp);
const { expect } = chai;

describe('redisClient', () => {
  describe('isAlive', () => {
    it('should return true when the client is alive', () => {
      const alive = redisClient.isAlive();
      expect(alive).to.be.true;
    });
  });

  describe('set and get', () => {
    it('should set and retrieve a key-value pair', async () => {
      const key = 'testKey';
      const value = 'testValue';
      const expiry = 60;

      await redisClient.set(key, value, expiry);
      const retrievedValue = await redisClient.get(key);

      expect(retrievedValue).to.equal(value);
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      const key = 'testKey';

      await redisClient.del(key);
      const retrievedValue = await redisClient.get(key);

      expect(retrievedValue).to.be.null;
    });
  });
});
