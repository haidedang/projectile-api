/**
 * Logger module to configure winston logger.
 */
const config = require('config');
const path = require('path');
const winston = require('winston');

const rootPath = process.env.NODE_PATH || process.cwd();
const errorLog = path.join(rootPath, config.api.logger.errorLog);
const combinedLog = path.join(rootPath, config.api.logger.combinedLog);

const loggerFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple()
);

const logger = winston.createLogger({
  level: config.api.logger.level || 'info',
  format: winston.format.simple(),
  transports: [
    // write all logs error (and below) to `error.log`.
    new winston.transports.File({
      filename: errorLog,
      level: 'error'
    }),
    // write to all logs with level `info` and below to `combined.log`
    new winston.transports.File({
      filename: combinedLog
    })
  ]
});

// if we're not in production then log to the `console`
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: loggerFormat
  }));
}

module.exports = logger;
