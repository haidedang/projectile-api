const BookController = require('./controller.booking');

module.exports = app => {
  app.get('/book/:date?/:duration/:activity/:note', BookController.bookEntry);
  app.get('/showListProjectile/:pretty?', BookController.showList);
};
