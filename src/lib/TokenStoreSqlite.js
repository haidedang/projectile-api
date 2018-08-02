const config = require('config');
const path = require('path');
const sqlite = require('sqlite');

/**
 * App related imports
 */
const logger = require('../lib/logger');

/**
 * The TokenStoreSqlite can find, add or delete JSON Web Tokens within an sqlite database file.
 */
class TokenStoreSqlite {
  constructor() {
    // get the config options
    this.dbFile = path.join(process.cwd(), config.api.sqlite.db);

    // open/create db file
    this.dbPromise = sqlite.open(this.dbFile, {Promise});
    this.setup();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new TokenStoreSqlite();
    }

    return this.instance;
  }

  /**
   * Setup the db table for the JW Tokens if it doesn't exist.
   *
   * @returns {void}
   */
  async setup() {
    this.db = await this.dbPromise;

    try {
      // only make a force migration when upgradedb is set as the environment variable
      if (process.env.NODE_ENV === 'upgradedb') {
        await this.db.migrate({force: 'last'});
      } else {
        await this.db.migrate();
      }
    } catch(e) {
      console.log(e);
      logger.error('Something went wrong while setting up the database.');
    }
  }

  /**
   * Add a new token to the database.
   *
   * @param {string} newToken The new token.
   * @returns {void}
   */
  async addToken(newToken) {
    const tokenResult = await this.db.get('SELECT token FROM tokens where token = ? LIMIT 1', newToken);

    if (tokenResult && tokenResult.token) {
      logger.info('Token already exists: ', tokenResult.token);
      return;
    }

    try {
      await this.db.run('INSERT INTO tokens (token) VALUES (?)', newToken);
    } catch(e) {
      logger.error('An error occured while saving new token to database.', e.stack);
    }
  }

  /**
   * Removes the given token from the database.
   *
   * @param {string} oldToken The token to remove.
   * @returns {void}
   */
  async removeToken(oldToken) {
    try {
      await this.db.run('DELETE FROM tokens WHERE token = ?', oldToken);
    } catch(e) {
      logger.error('An error occured while deleting token from database.', e.stack);
    }
  }

  /**
   * Gets the token from the database. If the given token is unknown, it will return null.
   *
   * @param {string} requestedToken The token that has been requested.
   * @returns {string|null} The actual token or null, if the requestedToken was not found.
   */
  async getToken(requestedToken) {
    let token = null;

    try {
      token = await this.db.get('SELECT token FROM tokens where token = ?', requestedToken);

      if (!token) {
        return null;
      }
    } catch(e) {
      logger.error(e.stack);
    }

    return token;
  }
}

module.exports = TokenStoreSqlite.getInstance();
