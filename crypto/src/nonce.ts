/**
 * OTH Nonce Generator
 *
 * Generates cryptographically secure, single-use nonces for:
 * - Replay attack prevention
 * - Request uniqueness guarantees
 * - QR code uniqueness
 *
 * Nonces are 32-byte (256-bit) random values encoded as hex.
 */

import * as crypto from 'crypto';

const NONCE_BYTES = 32; // 256-bit nonce

/**
 * Generate a cryptographically secure random nonce.
 * Returns 64-character hex string (32 bytes).
 */
export function generateNonce(): string {
  return crypto.randomBytes(NONCE_BYTES).toString('hex');
}

/**
 * Generate a shorter nonce for QR codes (16 bytes = 32 hex chars)
 */
export function generateShortNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a base64url-encoded nonce (more compact for QR payloads)
 */
export function generateNonceBase64(): string {
  return crypto.randomBytes(NONCE_BYTES).toString('base64url');
}

/**
 * Generate a nonce with timestamp embedded for extra uniqueness guarantee.
 * Format: hex(random_24_bytes) + hex(timestamp_8_bytes)
 */
export function generateTimestampedNonce(): { nonce: string; timestamp: number } {
  const timestamp = Date.now();
  const random = crypto.randomBytes(24).toString('hex');
  const timestampHex = timestamp.toString(16).padStart(16, '0');
  return {
    nonce: random + timestampHex,
    timestamp,
  };
}

/**
 * Validate nonce format (must be 64-char hex string)
 */
export function isValidNonce(nonce: string): boolean {
  return /^[0-9a-f]{64}$/i.test(nonce);
}

/**
 * Extract timestamp from a timestamped nonce
 */
export function extractNonceTimestamp(nonce: string): number | null {
  if (nonce.length !== 64) return null;
  const timestampHex = nonce.slice(48); // Last 16 hex chars
  const ts = parseInt(timestampHex, 16);
  return isNaN(ts) ? null : ts;
}

/**
 * Generate a UUID v4 (for session IDs and UID generation)
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a secure API key (hex format, configurable length in bytes)
 */
export function generateAPIKey(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a numeric OTP-like fallback code (6 digits)
 * Used as emergency fallback only
 */
export function generateNumericCode(digits = 6): string {
  const max = Math.pow(10, digits);
  const randomBytes = crypto.randomBytes(4);
  const randomNum = randomBytes.readUInt32BE(0) % max;
  return randomNum.toString().padStart(digits, '0');
}
