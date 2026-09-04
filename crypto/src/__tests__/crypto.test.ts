// crypto/src/__tests__/crypto.test.ts
import { generateNonce } from '../nonce';
import { encryptAES256GCM, decryptAES256GCM } from '../aes';
import { generateHMACSignature, verifyHMACSignature } from '../hmac';
import { ReplayGuard } from '../replay-guard';

describe('OTH Cryptography Engine Test Suite', () => {
  const secretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  test('Nonce generation produces 32-byte unique hex strings', () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1).toBeDefined();
    expect(n1.length).toBe(64); // 32 bytes in hex
    expect(n1).not.toEqual(n2);
  });

  test('AES-256-GCM Encryption and Decryption Roundtrip', () => {
    const payload = JSON.stringify({ uid: 'usr_101', timestamp: Date.now() });
    const encrypted = encryptAES256GCM(payload, secretKey);
    expect(encrypted.ciphertext).toBeDefined();

    const decrypted = decryptAES256GCM(encrypted, secretKey);
    expect(decrypted).toEqual(payload);
  });

  test('HMAC-SHA256 Signature Generation and Verification', () => {
    const message = 'canonical_payload_test_string';
    const sig = generateHMACSignature(message, secretKey);
    const isValid = verifyHMACSignature(message, sig, secretKey);
    expect(isValid).toBe(true);

    const isInvalid = verifyHMACSignature(message + '_tampered', sig, secretKey);
    expect(isInvalid).toBe(false);
  });

  test('ReplayGuard Nonce Prevention', () => {
    const guard = new ReplayGuard();
    const testNonce = 'nonce_unique_test_123';
    
    expect(guard.isNonceSpent(testNonce)).toBe(false);
    guard.registerNonce(testNonce);
    expect(guard.isNonceSpent(testNonce)).toBe(true);
  });
});
