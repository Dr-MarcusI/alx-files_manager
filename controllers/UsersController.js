import dbClient from '../utils/db';
import { userQueue } from '../worker';

/**
 * UsersController class
 */
class UsersController {
  /**
   * Handles the creation of a new user.
   *
   * @param {Object} request - The request object containing the user's email
   * and password.
   * @param {Object} response - The response object.
   * @return {Object} The response object containing the newly created user's
   * data.
   */
  static async postNew(request, response) {
    const { email, password } = request.body;

    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }

    const existingUser = await dbClient.findUserByEmail(email);
    if (existingUser) {
      return response.status(400).json({ error: 'Already exist' });
    }

    const newUser = await dbClient.addUser(email, password);
    userQueue.add({ userId: newUser.id });
    return response.status(201).json(newUser);
  }
}

export default UsersController;
