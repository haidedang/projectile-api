import AbstractService, { METHOD } from './AbstractService';

/**
 * Service to do the booking stuff.
 */
class BookingService extends AbstractService {
  /**
   * Adds a booking entry to Projectile.
   *
   * @param {object} payload A JSON object containing the values for Projectile.
   * @param {string} payload.date A date string.
   * @param {number} payload.duration The duration an activity took.
   * @param {string} payload.activity A string containing the activity value.
   * @param {string} payload.note The value for the description field.
   *
   * @throws Error If any occurs while requesting the API.
   * @returns {void}
   */
  async addBooking(payload) {
    try {
      const result = await this.sendRequest('book', METHOD.POST, payload);

      if (result.error) {
        throw new Error(result.message);
      }

      return result;
    } catch(e) {
      throw new Error(e);
    }
  }
}

export default BookingService;
