class BookingController {
  static async bookEntry(req, res, next) {
    next();
    return 'foo';
  }
}

module.exports = BookingController;
