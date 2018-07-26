class BookingController {
  static async bookEntry(req, res) {
    console.log(req.body);

    res.json({
      status: 'ok'
    });
  }

  static async showList(req, res) {
    res.json({
      status: 'ok'
    });
  }
}

module.exports = BookingController;
