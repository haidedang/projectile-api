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
const router = require('./routes');

/**
 * Initialize express app
 */

const app = express();
// set root path and environment
const rootPath = process.env.NODE_PATH || process.cwd();
global.environment = process.env.NODE_ENV || 'development';

/**
 * Middlewares
 */

// initialize morgan logger
app.use(morgan('dev'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// add the documentation route, this is static and has to be build before
app.use('/api/doc', express.static(path.join(__dirname, 'public/api/doc')));

// add the router middleware
app.use('/api/v1', router);

// error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

/**
 * Server related stuff
 */

/* check if we want to use ssl and create a server with ssl */
if (config.api.server.https) {
  const options = {
    key: fs.readFileSync(path.join(rootPath, '/', config.api.server.key)),
    cert: fs.readFileSync(path.join(rootPath, '/', config.api.server.cert))
  };

  https.createServer(options, app)
    .listen(
      config.api.server.port,
      config.api.server.host,
      () => console.log(`Server started on https://${config.api.server.host}:${config.api.server.port}`)
    );
} else {
  http.createServer(app)
    .listen(
      config.api.server.port,
      config.api.server.host,
      () => console.log(`Server started on https://${config.api.server.host}:${config.api.server.port}`)
    );
}
