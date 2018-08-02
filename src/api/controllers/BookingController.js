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
   * @param {object} res ExpressJS response object.
   * @returns {void}
   */
  static async showList(req, res) {

    // TODO:
    // 1. get projectiile user credentials
    // 2. initialize projectile service
    // 3. get a list of activities via projectile service
    // 4. create a response with activities
    // const projectileUser = req.body.projectileUser;
    // const projectilePassword = req.body.projectilePassword;

    res.json({
      status: 'ok',
      token: req.token
    });
  }
}

module.exports = BookingController;
