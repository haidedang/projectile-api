const atob = require('atob');
const config = require('config');
const passport = require('passport');
const Strategy = require('passport-http-bearer').Strategy;
const jwt = require('jsonwebtoken');

const logger = require('../lib/logger');
const tokenStore = require('../lib/TokenStoreSqlite');

/**
 * Middleware to take of authentication and token handling.
 */
class AuthenticationMiddleware {
  constructor() {
    // authentication strategy
    passport.use(new Strategy(
      async function(token, cb) {
        try {
          const tokenResult = await tokenStore.getToken(token);

          if (!tokenResult || !tokenResult.token) {
            return cb(new Error('Unauthorized'));
          }

          return cb(null, tokenResult.token);
        } catch(e) {
          return cb(e);
        }
      }
    ));
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
    return passport.authenticate('bearer', { session: false }, (err, token) => {
      if (err) {
        return res.json({
          status: 'error',
          message: err.message
        });
      }

      if (!token) {
        return res.json({
          status: 'error',
          message: 'Unauthorized'
        });
      }

      req.token = token;
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
      tokenStore.addToken(token);
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
