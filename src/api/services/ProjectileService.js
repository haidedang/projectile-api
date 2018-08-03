const rp = require('request-promise-native');

const logger = require('../../lib/logger');

/**
 * The ProjectileService does the communication with Projectile.
 */
class ProjectileService {
  /**
   * Login a user on Projectile.
   *
   * @param {string} username The username of the users Projectile access.
   * @param {string} password The password of the users Projectile access.
   * @returns {object|void} The cookie the method got from the Projectile login request. Returns void if something
   * goes wrong.
   */
  async login(username, password) {
    const options = {
      method: 'POST',
      url: 'https://projectile.office.sevenval.de/projectile/start',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      form: {
        action: 'login2',
        clientId: '0',
        jsenabled: '1',
        isAjax: '0',
        develop: '0',
        login: username,
        password: password,
        dologin: true
      },
      strictSSL: false, // TODO: SSL Zertifizierung mit node.js
      timeout: 7000,
      simple: false,
      resolveWithFullResponse: true
      /*
        insecure: true,
        rejectUnauthorized: false,
        followRedirect: true,
      */
    };

    try {
      // get the response from projectile
      const response = await rp(options);
      logger.info('projectile.login -> processing headers and creating cookie.');
      logger.silly(JSON.stringify(response.headers));
      // get the cookie from the response
      const cookie = response.headers['set-cookie'];

      // check whether the login was successful
      let loginFailed = true;
      if (cookie.forEach) {
        cookie.forEach(item => {
          if (item.indexOf('jwt') >= 0 && item.slice(item.indexOf('jwt'), item.indexOf(';')).length > 10) {
            loginFailed = false;
          }
        });
      }

      // abort if the login failed
      if (loginFailed) {
        return;
      }

      // return the whole cookie
      return cookie;

    } catch(e) {
      // Zeitüberschreitung beim Verbinden zum projectile Server... Bitte überprüfe deine Netzwerkverbindung." + error
      logger.error(`projectile login error. ${e.stack}`);
    }
  }


}

module.exports = ProjectileService;
