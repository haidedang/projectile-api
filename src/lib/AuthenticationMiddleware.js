const atob = require('atob');
const config = require('config');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const Strategy = require('passport-http-bearer').Strategy;

const logger = require('../lib/logger');

/**
 * Middleware to take of authentication and token handling.
 */
class AuthenticationMiddleware {
  constructor() {
    // authentication strategy
    passport.use(new Strategy(this.cookieStrategy));
  }

  /**
   * Strategy to handle authentication requests with passport strategy.
   *
   * @param {string} token The token that is given by the Authorization: Bearer ... method.
   * @param {function} cb The callback function that is called, when the token was verified.
   * @returns {void}
   */
  async cookieStrategy(token, cb) {
    try {
      const secret = config.api.jwt.secret;
      const tokenPayload = jwt.verify(token, secret);

      if (!tokenPayload) {
        return cb(new Error('Unauthorized'));
      }

      cb(null, tokenPayload.cookie, tokenPayload.employee);
    } catch(e) {
      cb(e);
    }
  }

  /**
   * The actual middleware.
   *
   * @param {object} req Express middleware request object.
   * @param {object} res Express middleware response object.
   * @param {function} next Express callback function.
   * @returns {function} standard connect middleware
   */
  async authenticate(req, res, next) {
    return passport.authenticate('bearer', { session: false }, (err, cookie, employee) => {
      if (err) {
        return res.json({
          status: 'error',
          message: err.message
        });
      }

      if (!cookie) {
        return res.json({
          status: 'error',
          message: 'Unauthorized'
        });
      }

      req.cookie = cookie;
      req.employee = employee;
      return next();
    })(req, res, next);
  }

  /**
   * Creates a Json Web Token and adds it to the database.
   *
   * @param {object} payload A javascript object containing the payload, that is stored within the token.
   * @returns {string|void} Either a token as base64 encoded string or void if something went wrong.
   */
  async createToken(payload) {
    const secret = config.api.jwt.secret;
    let token = null;

    if (!secret) {
      logger.error('No secret given.');
      return;
    }

    try {
      token = jwt.sign(payload, secret);
    } catch(e) {
      logger.error('An error occured while creating new JWT.', e.stack);
    }

    return token;
  }

  /**
   * Get the payload from the given token.
   *
   * @param {string} token The Json Web Token.
   * @returns {object|void} The payload javascript object or void when something went wrong.
   * @example
   *
   * {
   *    exp: 123466,
   *    cookie: ... (stringified with JSON.stringify)
   * }
   */
  async getPayload(token) {
    const secret = config.api.jwt.secret;

    if (!secret) {
      logger.error('No secret given.');
      return;
    }

    try {
      return jwt.verify(token, secret);
    } catch(e) {
      logger.error('An error occured while verifying token', e.stack);
    }
  }

  /**
   * Parses the cookie for the expiration time Projectile has given within its JSON Web Token.
   *
   * @param {object} cookie The cookie object coming from Projectile.
   * @returns {string} The expiration time.
   */
  getExpFromCookie(cookie) {
    if (!Array.isArray(cookie)) {
      return;
    }

    let payload;

    for (let i = 0; i < cookie.length; i++) {
      if (cookie[i].indexOf('jwt') >= 0 &&
          cookie[i].slice(cookie[i].indexOf('jwt'), cookie[i].indexOf(';')).length > 10) {

        const token = cookie[i].slice(cookie[i].indexOf('jwt'), cookie[i].indexOf(';'));
        payload = JSON.parse(atob(token.split('.')[1]));
      }
    }

    if (!payload) {
      logger.error('Failed to get the expiration time from cookie.');
    }

    return payload.exp;
  }
}

module.exports = new AuthenticationMiddleware();
