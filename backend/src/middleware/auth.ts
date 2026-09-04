/**
 * Authentication Middleware
 * JWT verification with Redis blacklist check
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isTokenBlacklisted } from '../db/redis';
import { sha256 } from '../../crypto/src/hmac';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    deviceId: string;
    fingerprint: string;
    scope: string[];
    jti: string;
  };
}

/**
 * Verify JWT access token middleware
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

    // Check token blacklist
    const tokenHash = sha256(token);
    const isBlacklisted = await isTokenBlacklisted(tokenHash);
    if (isBlacklisted) {
      res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    req.user = {
      uid: decoded.sub as string,
      deviceId: decoded.deviceId,
      fingerprint: decoded.fingerprint,
      scope: decoded.scope || [],
      jti: decoded.jti,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    } else {
      logger.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication error', code: 'AUTH_ERROR' });
    }
  }
}

/**
 * Require specific scope/permission
 */
export function requireScope(...scopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated', code: 'AUTH_REQUIRED' });
      return;
    }

    const hasScope = scopes.some((scope) => req.user!.scope.includes(scope));
    if (!hasScope) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: scopes,
      });
      return;
    }
    next();
  };
}

/**
 * Admin-only middleware (role check via DB)
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated', code: 'AUTH_REQUIRED' });
    return;
  }

  const { queryOne } = await import('../db/mysql');
  const user = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE uid = ?',
    [req.user.uid]
  );

  if (!user || !['admin', 'super_admin', 'org_admin'].includes(user.role)) {
    res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
    return;
  }

  next();
}

/**
 * API Key authentication for SDK/Government integrations
 */
export async function authenticateAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'API key required', code: 'API_KEY_REQUIRED' });
    return;
  }

  try {
    const keyHash = sha256(apiKey);
    const { queryOne } = await import('../db/mysql');
    const keyRecord = await queryOne<{ org_id: string; permissions: string; is_active: boolean }>(
      'SELECT org_id, permissions, is_active FROM api_keys WHERE key_hash = ? AND (expires_at IS NULL OR expires_at > NOW())',
      [keyHash]
    );

    if (!keyRecord || !keyRecord.is_active) {
      res.status(401).json({ error: 'Invalid or expired API key', code: 'API_KEY_INVALID' });
      return;
    }

    // Update last_used_at
    await import('../db/mysql').then(({ execute }) =>
      execute('UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ?', [keyHash])
    );

    (req as AuthenticatedRequest).user = {
      uid: `org:${keyRecord.org_id}`,
      deviceId: 'api',
      fingerprint: keyHash.slice(0, 8),
      scope: JSON.parse(keyRecord.permissions),
      jti: keyHash.slice(0, 16),
    };

    next();
  } catch (error) {
    logger.error('API key auth error:', error);
    res.status(500).json({ error: 'Authentication error', code: 'AUTH_ERROR' });
  }
}
