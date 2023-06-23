/* eslint-disable no-undef */
/* eslint-disable jest/valid-expect */
/* eslint-disable no-unused-expressions */
/* eslint-disable jest/prefer-expect-assertions */
import chai from 'chai';
import { ObjectId } from 'mongodb';
import dBClient from '../utils/db';

const { expect } = chai;

const waitConnection = () => new Promise((resolve, reject) => {
  let i = 0;
  const repeatFct = async () => {
    await setTimeout(() => {
      i += 1;
      if (i >= 10) {
        reject();
      } else if (!dBClient.isAlive()) {
        repeatFct();
      } else {
        resolve();
      }
    }, 1000);
  };
  repeatFct();
});

describe('dBClient', () => {
  before(async () => {
    await waitConnection();
  });

  describe('isAlive', () => {
    it('should return true when the DBClient is alive', () => {
      const alive = dBClient.isAlive();
      expect(alive).to.be.true;
    });
  });

  describe('nbUsers', () => {
    it('should return the number of users in the "users" collection', async () => {
      const count = await dBClient.nbUsers();
      expect(count).to.be.a('number');
    });
  });

  describe('nbFiles', () => {
    it('should return the number of files in the "files" collection', async () => {
      const count = await dBClient.nbFiles();
      expect(count).to.be.a('number');
    });
  });

  describe('filesCollection', () => {
    it('should return the "files" collection', () => {
      const collection = dBClient.filesCollection();
      expect(collection).to.exist;
    });
  });

  describe('findUserByEmail', () => {
    it('should return the user object if the user with the given email exists', async () => {
      const email = 'test@example.com';
      await dBClient.addUser(email, 'password');

      const user = await dBClient.findUserByEmail(email);
      expect(user).to.be.an('object');
      expect(user.email).to.equal(email);
    });

    it('should return null if the user with the given email does not exist', async () => {
      const email = 'nonexistent@example.com';

      const user = await dBClient.findUserByEmail(email);
      expect(user).to.be.null;
    });
  });

  describe('findUserById', () => {
    it('should return the user object if the user with the given ID exists', async () => {
      const email = 'test@example.com';
      const { id } = await dBClient.addUser(email, 'password');

      const user = await dBClient.findUserById(id);
      expect(user).to.be.an('object');
      expect(user.email).to.equal(email);
    });

    it('should return null if the user with the given ID does not exist', async () => {
      const id = new ObjectId().toString();

      const user = await dBClient.findUserById(id);
      expect(user).to.be.null;
    });
  });

  describe('addUser', () => {
    it('should add a new user to the "users" collection', async () => {
      const email = 'test@example.com';
      const password = 'password';

      const user = await dBClient.addUser(email, password);
      expect(user).to.be.an('object');
      expect(user.email).to.equal(email);
      expect(user.id).to.exist;
      expect(user.password).to.not.exist;
    });
  });
});
