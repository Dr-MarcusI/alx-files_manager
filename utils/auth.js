import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dBClient from './db';
import redisClient from './redis';

/**
 * Retrieves the email and password from a basic auth token provided in the
 * Authorization header of a request.
 *
 * @param {Object} request - The request containing the authorization header.
 * @return {Object|null} An object containing the email and password decoded
 * from the token, or null if the token is missing or malformed.
 */
export function getBasicAuthToken(request) {
  const authHeader = request.headers.authorization;
  if (!authHeader) { return null; }
  const token = authHeader.split(' ')[1];
  if (!token) { return null; }
  const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
  const [email, password] = decodedToken.split(':');
  return { email, password };
}

/**
 * Returns the session token from the request header (x-token).
 *
 * @param {Object} request - The request object containing the headers.
 * @return {string|null} The session token if it exists, otherwise null.
 */
export function getSessionToken(request) {
  const xHeader = request.headers['x-token'];
  if (!xHeader) { return null; }
  return xHeader;
}

/**
 * Authenticates a user based on their email and password.
 *
 * @param {string} email - The email address of the user.
 * @param {string} password - The password of the user.
 * @return {Promise<Object|null>} Returns a Promise that resolves with the
 * authenticated user's object, or null if authentication fails.
 */
export async function authenticateUser(email, password) {
  const user = await dBClient.findUserByEmail(email);
  if (!user) { return null; }
  const hashedPassword = sha1(password);
  if (user.password !== hashedPassword) { return null; }
  return user;
}

/**
 * Generates a session token for the given user ID and stores it in Redis for
 * 24 hours.
 *
 * @param {string} userId - The user id for whom the session is being generated.
 * @return {Object} An object containing the generated session token.
 */
export async function generateSessionToken(userId) {
  const token = uuidv4();
  const key = `auth_${token}`;
  await redisClient.set(key, userId, 24 * 60 * 60);
  return { token };
}

/**
 * Deletes a session token from Redis and returns a boolean indicating success.
 *
 * @param {string} token - The session token to delete.
 * @return {boolean} Returns true if the session token was successfully deleted,
 * otherwise false.
 */
export async function deleteSessionToken(token) {
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) { return false; }
  await redisClient.del(`auth_${token}`);
  return true;
}

/**
 * Retrieves a user object from a session token.
 *
 * @param {string} token - A session token to retrieve user data from.
 * @return {Promise<object>} A promise that resolves to an object with the
 * user's email and id, or null if not found.
 */
export async function getUserFromSession(token) {
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) { return null; }
  const user = await dBClient.findUserById(userId);
  if (!user) { return null; }
  return { email: user.email, id: user._id };
}

/**
 * Retrieves the current user associated with the given session token.
 *
 * @param {Object} request - The request object that contains the session token.
 * @return {Promise<Object|null>} - A promise that resolves with the user object
 * if the session token is valid, otherwise null.
 */
export async function getCurrentUser(request) {
  const token = getSessionToken(request);
  if (!token) { return null; }
  const user = await getUserFromSession(token);
  if (!user) { return null; }
  return user;
}
