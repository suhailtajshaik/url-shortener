const winston = require("winston");
const config = require("../config");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({ timestamp, level, message, ...metadata }) =>
      `${timestamp} [${level}]: ${message} ${
        Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ""
      }`
  )
);

// Detect serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

// Create transports array
const transports = [];

// In serverless environments, only use console logging
// File system is read-only in serverless (except /tmp)
if (isServerless) {
  // Use console transport for serverless
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(logFormat, winston.format.simple()),
    })
  );
} else {
  // In traditional server environments, use file logging
  try {
    const fs = require('fs');
    const path = require('path');

    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    transports.push(
      // Write all logs with level 'error' and below to error.log
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Write all logs to combined.log
      new winston.transports.File({
        filename: "logs/combined.log",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  } catch (err) {
    // If file logging fails, fall back to console only
    console.warn('File logging unavailable, using console only:', err.message);
    transports.push(new winston.transports.Console({ format: consoleFormat }));
  }
}

// Always add console in development
if (config.env !== "production" && !isServerless) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.env === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: "url-shortener" },
  transports: transports,
  // In serverless, use console for exceptions/rejections
  exceptionHandlers: isServerless
    ? [new winston.transports.Console({ format: logFormat })]
    : [new winston.transports.File({ filename: "logs/exceptions.log" })],
  rejectionHandlers: isServerless
    ? [new winston.transports.Console({ format: logFormat })]
    : [new winston.transports.File({ filename: "logs/rejections.log" })],
});

// Create a stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
