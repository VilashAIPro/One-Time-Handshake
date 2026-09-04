/**
 * OTH Backend — Logger Utility
 * Winston-based structured logging
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const isDev = process.env.NODE_ENV !== 'production';

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [
    new winston.transports.Console(),
    ...(isDev ? [] : [
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 20 * 1024 * 1024,
        maxFiles: 10,
      }),
    ]),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
});

export const securityLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console({ level: 'warn' }),
    ...(isDev ? [] : [
      new winston.transports.File({
        filename: path.join('logs', 'security.log'),
        maxsize: 50 * 1024 * 1024,
        maxFiles: 30,
      }),
    ]),
  ],
});
