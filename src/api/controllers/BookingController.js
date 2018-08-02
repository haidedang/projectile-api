/**
 * This class controls all stuff that has to do with booking on Projectile.
 */
class BookingController {
  /**
   * Static middleware to book an activity.
   *
   * @param {object} req ExpressJS request object.
   * @param {string} req.body.date Optional date value.
   * @param {string} req.body.duration The duration time of the work on that activity.
   * @param {string} req.body.activity An ID or the name of the activity, that was retrieved by the showList method.
   * @param {string} req.body.note A description what has been done on that activity.
   * @param {object} res ExpressJS response object.
   * @param {string} res.status String with 'ok' or 'error'.
   * @returns {void}
   */
  static async bookEntry(req, res) {
    res.json({
      status: 'ok'
    });
  }

  /**
   * Static middleware to handle showList route.
   *
   * @param {object} req ExpressJS request object.
   * @param {string} req.body.pretty Attribute to tell the return format.
   * @param {object} req.cookie The projectile cookie that is read from the bearer token.
   * @param {object} res ExpressJS response object.
   * @returns {void}
   */
  static async showList(req, res) {
    res.json({
      status: 'ok'
    });
  }
}

module.exports = BookingController;
