/**
 * OTH HMAC-SHA256 Signing Engine
 *
 * Provides:
 * - HMAC-SHA256 signature generation
 * - Constant-time signature verification (prevents timing attacks)
 * - Canonical string construction for payload signing
 */

import * as crypto from 'crypto';

export interface HMACInput {
  payload: Record<string, unknown>;
  secret: string;
}

export interface HMACResult {
  signature: string;   // Hex-encoded HMAC-SHA256
  canonical: string;   // The canonical string that was signed
}

/**
 * Generate HMAC-SHA256 signature over a canonical payload string.
 *
 * Canonical format ensures consistent field ordering:
 * "field1=value1&field2=value2&..." (sorted by field name)
 */
export function hmacSign(input: HMACInput): HMACResult {
  const canonical = buildCanonicalString(input.payload);
  const signature = crypto
    .createHmac('sha256', input.secret)
    .update(canonical, 'utf8')
    .digest('hex');

  return { signature, canonical };
}

/**
 * Verify an HMAC-SHA256 signature using constant-time comparison
 * to prevent timing-based attacks.
 */
export function hmacVerify(
  payload: Record<string, unknown>,
  signature: string,
  secret: string
): boolean {
  const { signature: expected } = hmacSign({ payload, secret });

  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

/**
 * Hash a string with SHA-256
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash data with SHA-256 and return Base64url
 */
export function sha256Base64(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('base64url');
}

/**
 * Double SHA-256 (Bitcoin-style) for extra hardening
 */
export function doubleSha256(data: string): string {
  return sha256(sha256(data));
}

/**
 * HMAC over a simple string (not a structured object)
 */
export function hmacSignString(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('hex');
}

/**
 * Build canonical string from object by sorting keys alphabetically.
 * Ensures deterministic signing regardless of JS object property order.
 */
export function buildCanonicalString(obj: Record<string, unknown>): string {
  return Object.keys(obj)
    .sort()
    .map((key) => {
      const value = obj[key];
      const strValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
      return `${key}=${strValue}`;
    })
    .join('&');
}
