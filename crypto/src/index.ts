/**
 * OTH Crypto Engine — Public API
 *
 * Re-exports all crypto primitives for use in:
 * - Backend (Node.js)
 * - SDK (Node.js)
 * - Tests
 */

// AES Encryption
export {
  aesEncrypt,
  aesDecrypt,
  aesEncryptPacked,
  aesDecryptPacked,
  deriveKey,
  generateAESKey,
  deriveDeviceKey,
  type EncryptionResult,
  type EncryptionInput,
} from './aes';

// HMAC & Hashing
export {
  hmacSign,
  hmacVerify,
  sha256,
  sha256Base64,
  doubleSha256,
  hmacSignString,
  buildCanonicalString,
  type HMACInput,
  type HMACResult,
} from './hmac';

// Nonce Generation
export {
  generateNonce,
  generateShortNonce,
  generateNonceBase64,
  generateTimestampedNonce,
  isValidNonce,
  extractNonceTimestamp,
  generateUUID,
  generateAPIKey,
  generateNumericCode,
} from './nonce';

// Device Fingerprinting
export {
  generateFingerprint,
  generateDeviceSalt,
  compareFingerprintSimilarity,
  isFingerprintTrusted,
  type DeviceInfo,
  type DeviceFingerprint,
} from './device-fingerprint';

// Key Management
export {
  loadMasterKey,
  generateMasterKey,
  generateAESKey as generateNewKey,
  deriveDeviceKeyBundle,
  deriveOrganizationKey,
  deriveQRKey,
  isKeyRotationDue,
  generateRotationToken,
  keysMatch,
  type KeyVersion,
  type DeviceKeyBundle,
} from './key-manager';

// Replay Guard
export {
  checkNonceMemory,
  registerNonceMemory,
  consumeNonceMemory,
  validateTimestamp,
  validateExpiry,
  clearNonceRegistryForTest,
  getNonceRegistrySize,
  type ReplayGuardEntry,
  type ReplayCheckResult,
  type TimestampValidationResult,
} from './replay-guard';

// OTH Core Algorithm
export {
  generateHandshake,
  verifyHandshake,
  generateOfflineToken,
  verifyOfflineToken,
  generateQRPayload,
  OTH_VERSION,
  type OTHHandshakeRequest,
  type OTHHandshakeToken,
  type OTHHandshakePayload,
  type OTHVerificationInput,
  type OTHVerificationResult,
  type OTHOfflineToken,
  type QRPayload,
} from './oth-algorithm';

// JWT Token Validator
export {
  createJWTToken,
  verifyJWTToken,
  generateTokenPair,
  tokenFingerprint,
  type JWTClaims,
  type TokenPair,
} from './token-validator';
