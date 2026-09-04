/**
 * Error Handler Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
  });

  const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    code: 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Request Logger Middleware
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']?.slice(0, 100),
  });
  next();
}
