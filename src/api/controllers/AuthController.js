const authenticationMiddleware = require('../../lib/AuthenticationMiddleware');
const logger = require('../../lib/logger');
const ProjectileService = require('../services/ProjectileService');

/**
 * Controller that handles authentication requests.
 */
class AuthController {
  /**
   * Method to handle login requests to the Projectile portal.
   *
   * @param {object} req The request object (express middleware).
   * @param {string} req.body.username The username
   * @param {string} req.body.password The password
   * @param {object} res The response object (express middleware).
   * @returns {void}
   */
  static async login(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    let token = '';

    const ptileService = new ProjectileService();

    try {
      const cookie = await ptileService.login(username, password);

      if (!cookie) {
        throw new Error('Login failed');
      }

      const exp = authenticationMiddleware.getExpFromCookie(cookie);

      token = await authenticationMiddleware.createToken({
        cookie,
        exp
      });
    } catch(e) {
      logger.error(`An error occured while logging into projectile. ${e.stack}`);
      // send an error response
      res.json({
        status: 'error',
        message: 'Login failed'
      });
      return;
    }

    // send success response with token
    res.json({
      status: 'ok',
      token
    });
  }
}

module.exports = AuthController;
