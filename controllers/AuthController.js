import {
  authenticateUser,
  deleteSessionToken,
  generateSessionToken,
  getBasicAuthToken,
  getCurrentUser,
  getSessionToken,
} from '../utils/auth';

/**
 * AuthController class to handle authentication
 */
class AuthController {
  /**
   * Returns a session token for a given user by authenticating the user's
   * email and password in the request's Basic Auth header. If successful,
   * returns a 200 status with the token in the response body. If authentication
   * fails, returns a 401 status with an error message in the response body.
   *
   * @param {Object} request - the HTTP request object
   * @param {Object} response - the HTTP response object
   * @return {Promise} a promise that resolves to the session token or rejects
   * with an error
   */
  static async getConnect(request, response) {
    const { email, password } = getBasicAuthToken(request);
    if (!email || !password) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    const token = await generateSessionToken(user._id);
    return response.status(200).json(token);
  }

  /**
   * Deletes the session token of a user and logs them out.
   *
   * @param {Object} request - the request object from the client
   * @param {Object} response - the response object to send to the client
   * @return {Object} - a 204 status code if successful, otherwise a 401 status
   * code with an error message
   */
  static async getDisconnect(request, response) {
    const token = getSessionToken(request);
    if (!token) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }

    const result = await deleteSessionToken(token);
    if (!result) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    return response.sendStatus(204);
  }

  /**
   * Asynchronously retrieves the authenticated user's information from the
   * session token.
   *
   * @param {Object} request - The HTTP request object.
   * @param {Object} response - The HTTP response object.
   * @return {Object} Returns a JSON response with the authenticated user's
   * information on success, or an error message with a 401 status code if the
   * user is unauthorized.
   */
  static async getMe(request, response) {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return response.status(401).json({
        error: 'Unauthorized',
      });
    }
    return response.status(200).json(currentUser);
  }
}

export default AuthController;
