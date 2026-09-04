/**
 * Rate Limiting Middleware
 * Brute force protection with Redis-backed counters
 */

import { Request, Response, NextFunction } from 'express';
import { incrementRateLimit, getRateLimitCount, resetRateLimit } from '../db/redis';
import { logger } from '../utils/logger';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Create a configurable rate limiter middleware using Redis
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    keyPrefix = 'global',
    message = 'Too many requests, please try again later',
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);
    const key = `${keyPrefix}:${ip}`;

    try {
      const { count, ttl } = await incrementRateLimit(key, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);
      res.setHeader('Retry-After', ttl);

      if (count > max) {
        logger.warn(`Rate limit exceeded: ${ip} on ${keyPrefix} (${count}/${max})`);
        res.status(429).json({
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request (fail open for availability)
      logger.error('Rate limiter Redis error:', error);
      next();
    }
  };
}

/**
 * Strict auth rate limiter — 5 attempts per 15 minutes per IP+phone
 */
export function authRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);
    const phone = req.body?.phone || 'unknown';
    const key = `auth:${ip}:${phone}`;

    try {
      const { count, ttl } = await incrementRateLimit(key, 15 * 60);

      if (count > 5) {
        logger.warn(`Auth brute force detected: ${ip} phone=${phone} attempts=${count}`);
        res.status(429).json({
          error: 'Too many authentication attempts. Account temporarily locked.',
          code: 'BRUTE_FORCE_DETECTED',
          retryAfterSeconds: ttl,
          attemptsUsed: count,
        });
        return;
      }

      // Attach rate limit info for downstream use
      (req as Request & { rateLimitInfo?: object }).rateLimitInfo = {
        attempts: count,
        maxAttempts: 5,
        windowSeconds: ttl,
      };

      next();
    } catch {
      next();
    }
  };
}

/**
 * Reset rate limit on successful auth (reward good behavior)
 */
export async function resetAuthRateLimit(ip: string, phone: string): Promise<void> {
  await resetRateLimit(`auth:${ip}:${phone}`);
}

// ─── Helpers ─────────────────────────────────────────────────────

export function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    '0.0.0.0'
  );
}
