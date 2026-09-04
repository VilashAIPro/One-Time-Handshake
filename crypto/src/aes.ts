/**
 * OTH AES-256-CBC Encryption Engine
 *
 * Implements AES-256-CBC encryption/decryption with:
 * - Random IV generation per encryption
 * - PKCS7 padding
 * - Authenticated encryption via HMAC (see hmac.ts)
 * - Key derivation from master key + salt
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

export interface EncryptionResult {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Base64 encoded
  tag?: string;        // For authenticated modes
}

export interface EncryptionInput {
  data: string | object;
  key: string; // 64-char hex string (32 bytes)
  associatedData?: string; // For AEAD
}

/**
 * Encrypt plaintext using AES-256-CBC
 * IV is randomly generated and prepended to output
 */
export function aesEncrypt(input: EncryptionInput): EncryptionResult {
  const keyBuffer = hexToBuffer(input.key, KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const plaintext = typeof input.data === 'object'
    ? JSON.stringify(input.data)
    : input.data;

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  cipher.setAutoPadding(true);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
  };
}

/**
 * Decrypt AES-256-CBC ciphertext
 */
export function aesDecrypt(
  ciphertext: string,
  iv: string,
  key: string
): string {
  const keyBuffer = hexToBuffer(key, KEY_LENGTH);
  const ivBuffer = Buffer.from(iv, 'base64');
  const cipherBuffer = Buffer.from(ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  decipher.setAutoPadding(true);

  const decrypted = Buffer.concat([
    decipher.update(cipherBuffer),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt and pack into single Base64 string: IV + ciphertext
 * Format: base64(iv_16bytes || ciphertext)
 */
export function aesEncryptPacked(data: string | object, key: string): string {
  const result = aesEncrypt({ data, key });
  const ivBuffer = Buffer.from(result.iv, 'base64');
  const cipherBuffer = Buffer.from(result.ciphertext, 'base64');
  return Buffer.concat([ivBuffer, cipherBuffer]).toString('base64url');
}

/**
 * Decrypt packed Base64 string (IV prepended)
 */
export function aesDecryptPacked(packed: string, key: string): string {
  const combined = Buffer.from(packed, 'base64url');
  const iv = combined.subarray(0, IV_LENGTH).toString('base64');
  const ciphertext = combined.subarray(IV_LENGTH).toString('base64');
  return aesDecrypt(ciphertext, iv, key);
}

/**
 * Derive a 256-bit key from master key + salt using PBKDF2
 */
export function deriveKey(masterKey: string, salt: string, iterations = 100000): string {
  const derived = crypto.pbkdf2Sync(
    Buffer.from(masterKey, 'hex'),
    salt,
    iterations,
    KEY_LENGTH,
    'sha256'
  );
  return derived.toString('hex');
}

/**
 * Generate a random 256-bit (32-byte) AES key as hex string
 */
export function generateAESKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Derive device-specific key from master key + device salt
 */
export function deriveDeviceKey(masterKey: string, deviceId: string, uid: string): string {
  const salt = `${deviceId}:${uid}`;
  return deriveKey(masterKey, salt);
}

// ─── Helpers ─────────────────────────────────────────────────────

function hexToBuffer(hex: string, expectedLength: number): Buffer {
  if (hex.length !== expectedLength * 2) {
    throw new Error(`Invalid key length: expected ${expectedLength * 2} hex chars, got ${hex.length}`);
  }
  return Buffer.from(hex, 'hex');
}
