/**
 * OTH JWT Token Validator
 *
 * Wraps jsonwebtoken with OTH-specific:
 * - Session token generation post-handshake
 * - Refresh token management
 * - Token blacklisting support
 * - Claims validation
 */

import * as crypto from 'crypto';
import { sha256 } from './hmac';

// We implement JWT manually to avoid external dependencies in the crypto package
// Production backend uses the 'jsonwebtoken' npm package

export interface JWTClaims {
  sub: string;         // Subject (uid)
  iat: number;         // Issued at (unix seconds)
  exp: number;         // Expires at (unix seconds)
  jti: string;         // JWT ID (unique per token)
  deviceId: string;    // Device that authenticated
  fingerprint: string; // Device fingerprint hash
  scope: string[];     // Permissions
  type: 'access' | 'refresh' | 'emergency';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;     // Seconds
  refreshExpiresIn: number;
}

/**
 * Create a base64url-encoded JWT header
 */
function createHeader(): string {
  return Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
}

/**
 * Sign data with HMAC-SHA256 and return base64url
 */
function signJWT(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Create a JWT token (access or refresh)
 * In production, use the 'jsonwebtoken' package in the backend.
 * This is the reference implementation for the crypto package.
 */
export function createJWTToken(claims: Omit<JWTClaims, 'iat' | 'jti'>, secret: string): string {
  const header = createHeader();
  const iat = Math.floor(Date.now() / 1000);
  const jti = crypto.randomBytes(16).toString('hex');

  const fullClaims: JWTClaims = { ...claims, iat, jti } as JWTClaims;
  const payload = Buffer.from(JSON.stringify(fullClaims)).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const signature = signJWT(signingInput, secret);

  return `${signingInput}.${signature}`;
}

/**
 * Verify and decode a JWT token (reference implementation)
 */
export function verifyJWTToken(
  token: string,
  secret: string
): { valid: boolean; claims?: JWTClaims; error?: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid JWT format' };
  }

  const [header, payload, signature] = parts;
  const signingInput = `${header}.${payload}`;
  const expectedSignature = signJWT(signingInput, secret);

  // Constant-time comparison
  if (
    expectedSignature.length !== signature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  ) {
    return { valid: false, error: 'Invalid signature' };
  }

  let claims: JWTClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return { valid: false, error: 'Invalid payload encoding' };
  }

  // Check expiry
  if (Math.floor(Date.now() / 1000) > claims.exp) {
    return { valid: false, error: 'Token has expired', claims };
  }

  return { valid: true, claims };
}

/**
 * Generate a token pair (access + refresh) after successful handshake verification
 */
export function generateTokenPair(
  uid: string,
  deviceId: string,
  fingerprint: string,
  jwtSecret: string,
  refreshSecret: string,
  scope: string[] = ['auth:read', 'auth:write']
): TokenPair {
  const ACCESS_TTL = 24 * 60 * 60;     // 24 hours
  const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days

  const now = Math.floor(Date.now() / 1000);

  const accessToken = createJWTToken(
    {
      sub: uid,
      exp: now + ACCESS_TTL,
      deviceId,
      fingerprint: fingerprint.slice(0, 8), // Partial fingerprint in token
      scope,
      type: 'access',
    },
    jwtSecret
  );

  const refreshToken = createJWTToken(
    {
      sub: uid,
      exp: now + REFRESH_TTL,
      deviceId,
      fingerprint: fingerprint.slice(0, 8),
      scope: ['auth:refresh'],
      type: 'refresh',
    },
    refreshSecret
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TTL,
    refreshExpiresIn: REFRESH_TTL,
  };
}

/**
 * Generate a token fingerprint for blacklist storage
 * Stores SHA-256(token) instead of the full token
 */
export function tokenFingerprint(token: string): string {
  return sha256(token);
}
