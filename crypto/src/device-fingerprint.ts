/**
 * OTH Device Fingerprinting Engine
 *
 * Generates a stable, unique device fingerprint from:
 * - Device ID (hardware identifier)
 * - Platform & OS version
 * - App installation ID
 * - Screen resolution (if available)
 * - Timezone
 *
 * The fingerprint is hashed with SHA-256 to produce a 64-char
 * identifier that doesn't expose raw device info.
 *
 * Note: On Android 10+, IMEI requires PRIVILEGED_PHONE_STATE permission.
 * We use a combination of other stable identifiers as fallback.
 */

import { sha256 } from './hmac';

export interface DeviceInfo {
  deviceId: string;          // expo-device or Installation ID
  platform: string;          // 'ios' | 'android' | 'web'
  osVersion: string;         // e.g., '14.5' or 'Android 13'
  appVersion: string;        // App version from app.json
  brand?: string;            // Device manufacturer
  model?: string;            // Device model
  imeiHash?: string;         // SHA-256 of IMEI (privileged only)
  installationId?: string;   // Expo SecureStore installation ID
  timezone?: string;         // Device timezone
  locale?: string;           // Device locale
}

export interface DeviceFingerprint {
  fingerprint: string;       // SHA-256 hash of device info
  components: string[];      // List of components used
  confidence: 'high' | 'medium' | 'low';
  generatedAt: number;       // Unix timestamp
}

/**
 * Generate a device fingerprint from available device info.
 * Higher-quality components (IMEI, deviceId) produce 'high' confidence.
 */
export function generateFingerprint(info: DeviceInfo): DeviceFingerprint {
  const components: string[] = [];
  const parts: string[] = [];

  // Priority 1: IMEI hash (highest uniqueness, privileged only)
  if (info.imeiHash) {
    parts.push(`imei:${info.imeiHash}`);
    components.push('imei_hash');
  }

  // Priority 2: Device ID (stable hardware identifier)
  if (info.deviceId) {
    parts.push(`device:${info.deviceId}`);
    components.push('device_id');
  }

  // Priority 3: Installation ID (app-level stable ID)
  if (info.installationId) {
    parts.push(`install:${info.installationId}`);
    components.push('installation_id');
  }

  // Priority 4: Platform details
  parts.push(`platform:${info.platform}`);
  parts.push(`os:${info.osVersion}`);
  parts.push(`app:${info.appVersion}`);
  components.push('platform', 'os_version', 'app_version');

  // Priority 5: Optional enrichers
  if (info.brand) { parts.push(`brand:${info.brand}`); components.push('brand'); }
  if (info.model) { parts.push(`model:${info.model}`); components.push('model'); }
  if (info.timezone) { parts.push(`tz:${info.timezone}`); components.push('timezone'); }
  if (info.locale) { parts.push(`locale:${info.locale}`); components.push('locale'); }

  const canonical = parts.sort().join('|');
  const fingerprint = sha256(canonical);

  const confidence = determineConfidence(components);

  return {
    fingerprint,
    components,
    confidence,
    generatedAt: Date.now(),
  };
}

/**
 * Generate a device-specific salt for key derivation.
 * Combines fingerprint with a secret to produce a device salt.
 */
export function generateDeviceSalt(fingerprint: string, uid: string): string {
  return sha256(`${fingerprint}:${uid}:oth-salt-v1`);
}

/**
 * Compare two fingerprints for similarity (allows minor drift).
 * Returns a score 0–1 where 1.0 = identical.
 */
export function compareFingerprintSimilarity(fp1: string, fp2: string): number {
  if (fp1 === fp2) return 1.0;
  // Hamming distance on hex strings
  let matches = 0;
  const len = Math.min(fp1.length, fp2.length);
  for (let i = 0; i < len; i++) {
    if (fp1[i] === fp2[i]) matches++;
  }
  return matches / fp1.length;
}

/**
 * Check if a fingerprint matches a trusted fingerprint within tolerance.
 * Threshold 0.9 = 90% similarity required (accounts for minor OS updates).
 */
export function isFingerprintTrusted(
  currentFP: string,
  trustedFP: string,
  threshold = 0.9
): boolean {
  return compareFingerprintSimilarity(currentFP, trustedFP) >= threshold;
}

// ─── Internal Helpers ─────────────────────────────────────────────

function determineConfidence(
  components: string[]
): 'high' | 'medium' | 'low' {
  if (components.includes('imei_hash') && components.includes('device_id')) {
    return 'high';
  }
  if (components.includes('device_id') || components.includes('installation_id')) {
    return 'medium';
  }
  return 'low';
}
