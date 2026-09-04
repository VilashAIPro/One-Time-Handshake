/**
 * OTH Engine — Mobile Client
 * Wraps the crypto engine for React Native / Expo usage
 * Uses expo-crypto for CSPRNG, expo-secure-store for key storage
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { sha256 } from '../../../crypto/src/hmac';
import { generateNonce } from '../../../crypto/src/nonce';

export interface MobileDeviceInfo {
  deviceId: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  brand?: string | null;
  model?: string | null;
  installationId?: string;
}

export interface MobileHandshakeResult {
  handshakeId: string;
  handshakeToken: string;
  nonce: string;
  timestamp: number;
  expiresAt: number;
  fingerprint: string;
}

export class OTHEngine {
  private static readonly KEY_PREFIX = 'oth_device_key_';
  private static readonly FINGERPRINT_KEY = 'oth_device_fingerprint';

  /**
   * Collect device info from Expo APIs
   */
  static async getDeviceInfo(): Promise<MobileDeviceInfo> {
    const androidId = Application.androidId;
    const installationId = await Application.getInstallationTimeAsync()
      .then((t) => sha256(`${Application.applicationId}:${t}`))
      .catch(() => null);

    return {
      deviceId: androidId || installationId || `${Platform.OS}-${Device.modelName}`,
      platform: Platform.OS,
      osVersion: `${Device.osName} ${Device.osVersion}`,
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      brand: Device.brand,
      model: Device.modelName,
      installationId: installationId || undefined,
    };
  }

  /**
   * Generate or retrieve device fingerprint
   * Fingerprint = SHA-256(androidId + installationId + model + brand)
   */
  static async getOrCreateFingerprint(): Promise<string> {
    const cached = await SecureStore.getItemAsync(this.FINGERPRINT_KEY);
    if (cached) return cached;

    const info = await this.getDeviceInfo();
    const components = [
      info.deviceId,
      info.platform,
      info.model || 'unknown',
      info.brand || 'unknown',
      info.installationId || 'none',
    ].join('|');

    const fingerprint = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      components
    );

    await SecureStore.setItemAsync(this.FINGERPRINT_KEY, fingerprint);
    return fingerprint;
  }

  /**
   * Generate or retrieve device keypair
   */
  static async getOrCreateDeviceKey(uid: string): Promise<string> {
    const keyName = `${this.KEY_PREFIX}${uid}`;
    const existing = await SecureStore.getItemAsync(keyName);
    if (existing) return existing;

    // Generate a device secret key (in production: use Android Keystore)
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const key = Buffer.from(randomBytes).toString('hex');

    await SecureStore.setItemAsync(keyName, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    return key;
  }

  /**
   * Generate an OTH handshake token
   * Client-side generation without external library dependency
   */
  static async generateHandshake(
    uid: string,
    phone: string,
    deviceInfo: MobileDeviceInfo
  ): Promise<MobileHandshakeResult> {
    const fingerprint = await this.getOrCreateFingerprint();
    const nonce = generateNonce();
    const timestamp = Date.now();
    const expiresAt = timestamp + 30_000;

    // Build canonical payload
    const payload = {
      uid,
      phone,
      deviceId: deviceInfo.deviceId,
      fingerprint,
      nonce,
      timestamp,
      expiresAt,
      version: '1.0',
    };

    // Hash payload
    const canonical = Object.keys(payload)
      .sort()
      .map((k) => `${k}=${(payload as Record<string, unknown>)[k]}`)
      .join('&');

    const payloadHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      canonical
    );

    // Handshake ID = SHA-256(nonce + timestamp + uid)
    const handshakeId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${nonce}:${timestamp}:${uid}`
    );

    // Token = Base64url(JSON(payload + hash))
    const tokenData = { ...payload, hash: payloadHash };
    const handshakeToken = Buffer.from(JSON.stringify(tokenData)).toString('base64url');

    return {
      handshakeId,
      handshakeToken,
      nonce,
      timestamp,
      expiresAt,
      fingerprint,
    };
  }

  /**
   * Generate offline authentication token
   * Stored encrypted in SQLite for use without internet
   */
  static async generateOfflineToken(
    uid: string,
    deviceId: string,
    ttlHours = 24
  ): Promise<string> {
    const nonce = generateNonce();
    const fingerprint = await this.getOrCreateFingerprint();
    const now = Date.now();

    const payload = {
      uid, deviceId, fingerprint, nonce,
      createdAt: now,
      expiresAt: now + ttlHours * 3600_000,
      type: 'offline',
      version: '1.0',
    };

    const checksum = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(payload)
    );

    return Buffer.from(JSON.stringify({ ...payload, checksum })).toString('base64url');
  }

  /**
   * Verify an offline token locally
   */
  static async verifyOfflineToken(tokenB64: string): Promise<{
    valid: boolean; uid?: string; error?: string;
  }> {
    try {
      const token = JSON.parse(Buffer.from(tokenB64, 'base64url').toString());
      const { checksum, ...payload } = token;

      // Verify checksum
      const expectedChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(payload)
      );

      if (checksum !== expectedChecksum) {
        return { valid: false, error: 'Token integrity check failed' };
      }

      // Check expiry
      if (Date.now() > token.expiresAt) {
        return { valid: false, error: 'Offline token has expired' };
      }

      // Verify fingerprint matches this device
      const deviceFingerprint = await this.getOrCreateFingerprint();
      if (token.fingerprint !== deviceFingerprint) {
        return { valid: false, error: 'Device fingerprint mismatch' };
      }

      return { valid: true, uid: token.uid };
    } catch {
      return { valid: false, error: 'Invalid token format' };
    }
  }
}
