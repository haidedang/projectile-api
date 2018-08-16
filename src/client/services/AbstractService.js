import * as config from '../../../config/default.json';

// eslint-disable-next-line
export const METHOD = Object.freeze({
  GET: 'GET',
  POST: 'POST'
});

/**
 * This service should always be inherited when implementing a new service for a component.
 */
class AbstractService {
  /**
   * Initializes the service.
   *
   * @param {string} token JSON Web Token
   */
  constructor(token) {
    const { host, port, https } = config.api.server;

    this.token = token;
    this.url =
      (https ? 'https://' : 'http://') +
      host +
      (port ? ':' + port : '') +
      '/api/v1/';
  }

  async sendRequest(endpoint, method, body) {
    // overwrite endpoint to enrich with the API's server settings
    endpoint = this.url + endpoint;

    try {
      const result = await fetch(endpoint, {
        method: method,
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.token
        }
      });

      return result.json();
    } catch (e) {
      console.log('Error:', e);
    }
  }
}

export default AbstractService;
