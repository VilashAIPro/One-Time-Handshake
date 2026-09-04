/**
 * OTH Core Handshake Algorithm
 *
 * This is the heart of the One Time Handshake (OTH) system.
 *
 * ═══════════════════════════════════════════════════════════════
 * ALGORITHM OVERVIEW
 * ═══════════════════════════════════════════════════════════════
 *
 * Generation (Client-side):
 * ─────────────────────────
 * 1. Collect device info: deviceId, IMEI hash, platform, OS version
 * 2. Generate fingerprint: SHA-256(sorted device components)
 * 3. Generate nonce: CSPRNG 32 bytes → hex
 * 4. Get timestamp: Date.now() (milliseconds)
 * 5. Build payload:
 *    { uid, phone, deviceId, fingerprint, nonce, timestamp, version }
 * 6. Build canonical string: sorted key=value pairs joined with &
 * 7. Sign: HMAC-SHA256(canonical, signingKey)
 * 8. Encrypt: AES-256-CBC(JSON(payload + signature), encryptionKey)
 * 9. Encode: Base64url(IV || ciphertext) → handshakeToken
 * 10. Generate handshakeId: SHA-256(nonce + timestamp + uid)
 *
 * Verification (Server-side):
 * ───────────────────────────
 * 1. Decode Base64url → split IV + ciphertext
 * 2. Decrypt: AES-256-CBC(ciphertext, IV, encryptionKey)
 * 3. Parse JSON payload
 * 4. Validate timestamp: |now - timestamp| ≤ 30s
 * 5. Check nonce: not seen in Redis (TTL 60s)
 * 6. Verify fingerprint: matches registered device fingerprint
 * 7. Verify HMAC: constant-time compare
 * 8. Verify device binding: uid + deviceId matches DB record
 * 9. Register nonce in Redis (TTL 60s)
 * 10. Issue JWT session token
 *
 * Attack Prevention:
 * ─────────────────
 * - Replay: Nonce registry in Redis with TTL
 * - MITM: AES encryption + HMAC signature
 * - Timing: Constant-time HMAC comparison
 * - Brute Force: Rate limiting + device lockout
 * - Device Cloning: Fingerprint similarity threshold
 * - Clock Skew: ±30s drift window
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { aesEncryptPacked, aesDecryptPacked, deriveDeviceKey } from './aes';
import { hmacSign, hmacVerify, sha256 } from './hmac';
import { generateNonce } from './nonce';
import { generateFingerprint, type DeviceInfo } from './device-fingerprint';
import {
  validateTimestamp,
  validateExpiry,
  consumeNonceMemory,
  checkNonceMemory,
} from './replay-guard';
import { deriveDeviceKeyBundle, type DeviceKeyBundle } from './key-manager';

export const OTH_VERSION = '1.0';

// ─── Types ────────────────────────────────────────────────────────

export interface OTHHandshakeRequest {
  uid: string;
  phone: string;
  deviceInfo: DeviceInfo;
  masterKey: string;
}

export interface OTHHandshakeToken {
  handshakeId: string;   // SHA-256(nonce+ts+uid) — used for lookup
  handshakeToken: string;// Base64url(AES(payload + signature))
  nonce: string;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export interface OTHHandshakePayload {
  uid: string;
  phone: string;
  deviceId: string;
  fingerprint: string;
  nonce: string;
  timestamp: number;
  expiresAt: number;
  version: string;
  signature: string;
}

export interface OTHVerificationInput {
  handshakeToken: string;
  uid: string;
  masterKey: string;
  registeredFingerprint?: string;     // From DB
  checkNonce?: (nonce: string) => Promise<boolean>; // Redis check
  consumeNonce?: (nonce: string) => Promise<void>;  // Redis register
}

export interface OTHVerificationResult {
  valid: boolean;
  uid?: string;
  deviceId?: string;
  fingerprint?: string;
  nonce?: string;
  timestamp?: number;
  error?: string;
  riskScore?: number;
}

export interface OTHOfflineToken {
  token: string;
  handshakeId: string;
  uid: string;
  deviceId: string;
  createdAt: number;
  expiresAt: number;
  usageCount: number;
  maxUsage: number;
  checksum: string;
}

// ─── Constants ────────────────────────────────────────────────────

const HANDSHAKE_TTL_MS = 30_000;     // 30 seconds
const NONCE_TTL_MS = 60_000;          // 60 seconds
const MAX_CLOCK_DRIFT_MS = 30_000;    // 30 seconds
const OFFLINE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const OFFLINE_TOKEN_MAX_USAGE = 3;

// ─── Generation ───────────────────────────────────────────────────

/**
 * Generate a complete OTH handshake token on the client side.
 *
 * This function is called by:
 * - Mobile app during login
 * - SDK during API authentication
 * - Web client for admin login
 */
export function generateHandshake(req: OTHHandshakeRequest): OTHHandshakeToken {
  const { uid, phone, deviceInfo, masterKey } = req;

  // Step 1: Generate device fingerprint
  const { fingerprint } = generateFingerprint(deviceInfo);

  // Step 2: Derive device-specific key bundle
  const keyBundle = deriveDeviceKeyBundle(masterKey, uid, deviceInfo.deviceId);

  // Step 3: Generate nonce and timestamp
  const nonce = generateNonce();
  const timestamp = Date.now();
  const expiresAt = timestamp + HANDSHAKE_TTL_MS;

  // Step 4: Build payload (before signature)
  const payloadWithoutSig = {
    uid,
    phone,
    deviceId: deviceInfo.deviceId,
    fingerprint,
    nonce,
    timestamp,
    expiresAt,
    version: OTH_VERSION,
  };

  // Step 5: Sign the payload
  const { signature } = hmacSign({
    payload: payloadWithoutSig,
    secret: keyBundle.signingKey,
  });

  // Step 6: Build final payload with signature
  const payload: OTHHandshakePayload = {
    ...payloadWithoutSig,
    signature,
  };

  // Step 7: Encrypt the full payload
  const handshakeToken = aesEncryptPacked(payload, keyBundle.encryptionKey);

  // Step 8: Generate handshake ID for lookup
  const handshakeId = sha256(`${nonce}:${timestamp}:${uid}`);

  return {
    handshakeId,
    handshakeToken,
    nonce,
    timestamp,
    expiresAt,
    version: OTH_VERSION,
  };
}

// ─── Verification ─────────────────────────────────────────────────

/**
 * Verify a received OTH handshake token on the server side.
 *
 * Steps:
 * 1. Decrypt the token
 * 2. Validate timestamp
 * 3. Check nonce uniqueness
 * 4. Verify HMAC signature
 * 5. Optionally verify device fingerprint
 */
export async function verifyHandshake(
  input: OTHVerificationInput
): Promise<OTHVerificationResult> {
  const { handshakeToken, uid, masterKey, registeredFingerprint } = input;

  try {
    // Step 1: Derive key bundle (server knows uid + deviceId from decrypted payload)
    // We need to try decryption with a general key first, then verify device-specific
    // In practice, server caches key bundles per (uid, deviceId) pair

    // Attempt decryption — we need the deviceId first, so we do a two-pass approach:
    // Pass 1: Decrypt with uid-level key to extract deviceId
    // Pass 2: Verify with device-level key

    let payload: OTHHandshakePayload;
    try {
      // For production: look up deviceId from session or pre-auth challenge
      // Here we decrypt and extract deviceId, then re-derive keys
      const decrypted = attemptDecryption(handshakeToken, uid, masterKey);
      payload = decrypted;
    } catch {
      return { valid: false, error: 'Decryption failed: invalid token or key', riskScore: 90 };
    }

    // Step 2: Validate uid matches
    if (payload.uid !== uid) {
      return { valid: false, error: 'UID mismatch', riskScore: 95 };
    }

    // Step 3: Validate timestamp
    const tsResult = validateTimestamp(payload.timestamp, MAX_CLOCK_DRIFT_MS);
    if (!tsResult.valid) {
      return { valid: false, error: tsResult.reason, riskScore: 70 };
    }

    // Step 4: Validate expiry
    const expiryResult = validateExpiry(payload.expiresAt);
    if (!expiryResult.valid) {
      return { valid: false, error: expiryResult.reason, riskScore: 60 };
    }

    // Step 5: Check nonce (Redis or in-memory)
    if (input.checkNonce) {
      const nonceIsFresh = await input.checkNonce(payload.nonce);
      if (!nonceIsFresh) {
        return { valid: false, error: 'Replay attack detected: nonce already used', riskScore: 100 };
      }
    } else {
      const nonceResult = checkNonceMemory(payload.nonce);
      if (!nonceResult.allowed) {
        return { valid: false, error: nonceResult.reason, riskScore: 100 };
      }
    }

    // Step 6: Re-derive the exact device key bundle
    const keyBundle = deriveDeviceKeyBundle(masterKey, uid, payload.deviceId);

    // Step 7: Verify HMAC signature
    const { signature, ...payloadWithoutSig } = payload;
    const signatureValid = hmacVerify(
      payloadWithoutSig as Record<string, unknown>,
      signature,
      keyBundle.signingKey
    );

    if (!signatureValid) {
      return { valid: false, error: 'Signature verification failed: possible tampering', riskScore: 95 };
    }

    // Step 8: Verify device fingerprint (optional)
    if (registeredFingerprint && payload.fingerprint !== registeredFingerprint) {
      return {
        valid: false,
        error: 'Device fingerprint mismatch: possible device cloning',
        riskScore: 85,
      };
    }

    // Step 9: Consume nonce (mark as used)
    if (input.consumeNonce) {
      await input.consumeNonce(payload.nonce);
    } else {
      consumeNonceMemory(payload.nonce, NONCE_TTL_MS, {
        uid,
        deviceId: payload.deviceId,
      });
    }

    return {
      valid: true,
      uid: payload.uid,
      deviceId: payload.deviceId,
      fingerprint: payload.fingerprint,
      nonce: payload.nonce,
      timestamp: payload.timestamp,
      riskScore: 0,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      riskScore: 80,
    };
  }
}

// ─── Offline Token ─────────────────────────────────────────────────

/**
 * Generate an offline authentication token.
 *
 * Offline tokens are pre-generated when online and stored encrypted.
 * They can be used up to maxUsage times within the TTL window.
 */
export function generateOfflineToken(
  uid: string,
  deviceId: string,
  masterKey: string,
  options?: { ttlMs?: number; maxUsage?: number }
): OTHOfflineToken {
  const ttlMs = options?.ttlMs ?? OFFLINE_TOKEN_TTL_MS;
  const maxUsage = options?.maxUsage ?? OFFLINE_TOKEN_MAX_USAGE;

  const nonce = generateNonce();
  const now = Date.now();
  const expiresAt = now + ttlMs;
  const handshakeId = sha256(`offline:${nonce}:${uid}:${deviceId}`);

  const tokenPayload = {
    uid,
    deviceId,
    nonce,
    createdAt: now,
    expiresAt,
    maxUsage,
    type: 'offline',
    version: OTH_VERSION,
  };

  const keyBundle = deriveDeviceKeyBundle(masterKey, uid, deviceId);
  const token = aesEncryptPacked(tokenPayload, keyBundle.encryptionKey);
  const checksum = sha256(`${token}:${handshakeId}`);

  return {
    token,
    handshakeId,
    uid,
    deviceId,
    createdAt: now,
    expiresAt,
    usageCount: 0,
    maxUsage,
    checksum,
  };
}

/**
 * Verify an offline token locally (no server required).
 */
export function verifyOfflineToken(
  offlineToken: OTHOfflineToken,
  masterKey: string
): OTHVerificationResult {
  // Verify checksum integrity
  const expectedChecksum = sha256(`${offlineToken.token}:${offlineToken.handshakeId}`);
  if (expectedChecksum !== offlineToken.checksum) {
    return { valid: false, error: 'Token integrity check failed: possible tampering', riskScore: 95 };
  }

  // Check usage limit
  if (offlineToken.usageCount >= offlineToken.maxUsage) {
    return { valid: false, error: 'Offline token usage limit exceeded', riskScore: 50 };
  }

  // Check expiry
  const expiryResult = validateExpiry(offlineToken.expiresAt);
  if (!expiryResult.valid) {
    return { valid: false, error: 'Offline token has expired', riskScore: 20 };
  }

  // Decrypt and verify
  try {
    const keyBundle = deriveDeviceKeyBundle(masterKey, offlineToken.uid, offlineToken.deviceId);
    const decrypted = aesDecryptPacked(offlineToken.token, keyBundle.encryptionKey);
    const payload = JSON.parse(decrypted);

    if (payload.uid !== offlineToken.uid || payload.deviceId !== offlineToken.deviceId) {
      return { valid: false, error: 'Token payload mismatch', riskScore: 90 };
    }

    return {
      valid: true,
      uid: payload.uid,
      deviceId: payload.deviceId,
      timestamp: payload.createdAt,
      riskScore: 5, // slightly higher risk for offline auth
    };
  } catch {
    return { valid: false, error: 'Token decryption failed', riskScore: 85 };
  }
}

// ─── QR Payload ───────────────────────────────────────────────────

export interface QRPayload {
  uid: string;
  nonce: string;
  timestamp: number;
  expiresAt: number;
  deviceId: string;
  signature: string;
  version: string;
}

/**
 * Generate an encrypted QR payload for QR-based authentication.
 * QR codes expire after 30 seconds and are single-use.
 */
export function generateQRPayload(
  uid: string,
  deviceId: string,
  masterKey: string
): { qrData: string; nonce: string; expiresAt: number } {
  const nonce = generateNonce();
  const timestamp = Date.now();
  const expiresAt = timestamp + 30_000; // 30-second QR expiry

  const keyBundle = deriveDeviceKeyBundle(masterKey, uid, deviceId);

  const payload = { uid, nonce, timestamp, expiresAt, deviceId, version: OTH_VERSION };
  const { signature } = hmacSign({ payload, secret: keyBundle.signingKey });

  const fullPayload: QRPayload = { ...payload, signature };
  const qrData = aesEncryptPacked(fullPayload, keyBundle.encryptionKey);

  return { qrData, nonce, expiresAt };
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Internal: attempt to decrypt a handshake token by trying device key derivation.
 * In production this is called after a device lookup in the database.
 */
function attemptDecryption(
  handshakeToken: string,
  uid: string,
  masterKey: string
): OTHHandshakePayload {
  // Production: Server has uid→deviceId mapping from pre-auth challenge
  // For single-pass decryption, we use a UID-level key as outer wrapper
  // This implementation uses direct device-key derivation (deviceId extracted post-decryption)

  // Use a UID-level key for initial decryption
  const uidKey = deriveDeviceKey(masterKey, uid, uid); // uid as deviceId for outer key
  const decrypted = aesDecryptPacked(handshakeToken, uidKey);
  return JSON.parse(decrypted) as OTHHandshakePayload;
}
