/**
 * NodeJS stuff
 *
 * Note: imports are ordered alphabetically
 */
const bodyParser = require('body-parser');
const config = require('config');
const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const morgan = require('morgan');
const path = require('path');

/**
 * App related imports
 */
const logger = require('../lib/logger');
const router = require('./routes');

// set root path and environment
const rootPath = process.cwd();

/**
 * Initialize express app
 */

const app = express();

/**
 * Middlewares
 */

// initialize morgan logger
app.use(morgan('dev'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('dist'));
// add the documentation route, this is static and has to be build before
app.use('/api/doc', express.static(path.join(__dirname, 'public/api/doc')));

// add the authentication and router middlewares; the authentication is required to format the return value to json
app.use('/api/v1', router);

// add a default error for everything that goes here /
app.use('/', (req, res) => {
  res.status(404)
    .json({
      status: 404,
      message: 'Resource not found.'
    });
});

// error handler middleware
app.use((err, res) => {
  logger.error(err.stack);
  res.status(500)
    .json({
      status: 500,
      message: err.stack
    });
});

/**
 * Server related stuff
 */

/* check if we want to use ssl and create a server with ssl */
if (config.api.server.https === true) {
  const options = {
    key: fs.readFileSync(path.join(rootPath, '/', config.api.server.key)),
    cert: fs.readFileSync(path.join(rootPath, '/', config.api.server.cert))
  };

  https.createServer(options, app)
    .listen(
      config.api.server.port,
      config.api.server.host,
      () => logger.info(`Server started on https://${config.api.server.host}:${config.api.server.port}`)
    );
} else {
  http.createServer(app)
    .listen(
      config.api.server.port,
      config.api.server.host,
      () => logger.info(`Server started on http://${config.api.server.host}:${config.api.server.port}`)
    );
}
