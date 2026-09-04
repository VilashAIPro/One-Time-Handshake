/**
 * OTH Key Manager
 *
 * Manages encryption keys including:
 * - Master key loading from environment
 * - Device-specific key derivation
 * - Key rotation tracking
 * - Secure key storage patterns
 */

import * as crypto from 'crypto';
import { deriveKey } from './aes';
import { sha256 } from './hmac';

export interface KeyVersion {
  version: number;
  key: string;          // Hex-encoded key
  createdAt: number;    // Unix timestamp
  expiresAt?: number;   // For rotation
  algorithm: string;    // 'aes-256-cbc'
}

export interface DeviceKeyBundle {
  encryptionKey: string;   // AES-256 key for payload encryption
  signingKey: string;      // HMAC key for signature
  deviceSalt: string;      // Device-specific salt
  version: number;
}

// ─── Master Key Management ────────────────────────────────────────

/**
 * Load and validate the master key from environment.
 * Throws if key is missing or wrong length.
 */
export function loadMasterKey(): string {
  const masterKey = process.env.OTH_MASTER_KEY;
  if (!masterKey) {
    throw new Error('OTH_MASTER_KEY environment variable is not set');
  }
  if (masterKey.length !== 64) {
    throw new Error(`OTH_MASTER_KEY must be 64 hex characters (32 bytes), got ${masterKey.length}`);
  }
  if (!/^[0-9a-fA-F]{64}$/.test(masterKey)) {
    throw new Error('OTH_MASTER_KEY must be a valid hex string');
  }
  return masterKey;
}

/**
 * Generate a new random master key (for initial setup).
 * Print to stdout and store securely — NEVER log in production.
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Device Key Derivation ─────────────────────────────────────────

/**
 * Derive a complete key bundle for a specific device.
 *
 * Derivation uses PBKDF2:
 * - encryptionKey: PBKDF2(masterKey, salt="enc:{uid}:{deviceId}")
 * - signingKey:    PBKDF2(masterKey, salt="sig:{uid}:{deviceId}")
 */
export function deriveDeviceKeyBundle(
  masterKey: string,
  uid: string,
  deviceId: string,
  version = 1
): DeviceKeyBundle {
  const deviceSalt = sha256(`${uid}:${deviceId}:v${version}`);

  const encryptionKey = deriveKey(
    masterKey,
    `enc:${uid}:${deviceId}:v${version}`,
    100000
  );

  const signingKey = deriveKey(
    masterKey,
    `sig:${uid}:${deviceId}:v${version}`,
    100000
  );

  return {
    encryptionKey,
    signingKey,
    deviceSalt,
    version,
  };
}

/**
 * Derive an organization API signing key from the master key + org ID.
 */
export function deriveOrganizationKey(masterKey: string, orgId: string): string {
  return deriveKey(masterKey, `org:${orgId}:api-signing`, 50000);
}

/**
 * Derive a QR-specific ephemeral key (short-lived, per QR session).
 */
export function deriveQRKey(masterKey: string, sessionId: string, timestamp: number): string {
  const timeBucket = Math.floor(timestamp / 30000); // 30-second buckets
  return deriveKey(masterKey, `qr:${sessionId}:${timeBucket}`, 10000);
}

// ─── Key Rotation ─────────────────────────────────────────────────

/**
 * Check if a key version is due for rotation.
 * Default rotation period: 90 days.
 */
export function isKeyRotationDue(
  createdAt: number,
  rotationDays: number = 90
): boolean {
  const rotationMs = rotationDays * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt > rotationMs;
}

/**
 * Generate a key rotation token that proves the new key was derived from the same master.
 * Used to verify key rotation without exposing the master key.
 */
export function generateRotationToken(
  masterKey: string,
  oldVersion: number,
  newVersion: number
): string {
  return sha256(`rotation:${masterKey.slice(0, 8)}:${oldVersion}:${newVersion}`);
}

// ─── Utility ──────────────────────────────────────────────────────

/**
 * Securely compare two keys in constant time.
 */
export function keysMatch(key1: string, key2: string): boolean {
  if (key1.length !== key2.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(key1, 'hex'),
    Buffer.from(key2, 'hex')
  );
}
