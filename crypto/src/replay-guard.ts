/**
 * OTH Replay Attack Guard
 *
 * Prevents replay attacks by maintaining a registry of used nonces.
 *
 * In production: backed by Redis with TTL (see backend/src/db/redis.ts)
 * In tests / standalone: uses in-memory Map with cleanup
 *
 * Security properties:
 * - Each nonce can only be used once within the TTL window
 * - Nonces expire after OTH_NONCE_TTL_SECONDS (default: 60s)
 * - Timestamp validation prevents nonces from being used outside window
 */

export interface ReplayGuardEntry {
  nonce: string;
  usedAt: number;        // Unix timestamp (ms)
  expiresAt: number;     // Unix timestamp (ms)
  uid?: string;
  deviceId?: string;
}

export interface ReplayCheckResult {
  allowed: boolean;
  reason?: string;
  entry?: ReplayGuardEntry;
}

export interface TimestampValidationResult {
  valid: boolean;
  driftMs: number;
  reason?: string;
}

// ─── In-Memory Guard (for testing / mobile offline use) ──────────

const nonceRegistry = new Map<string, ReplayGuardEntry>();

/**
 * Check if a nonce has been seen before (in-memory version).
 * Returns true if the nonce is FRESH (not a replay).
 */
export function checkNonceMemory(nonce: string): ReplayCheckResult {
  cleanup(); // Remove expired entries first

  if (nonceRegistry.has(nonce)) {
    const entry = nonceRegistry.get(nonce)!;
    return {
      allowed: false,
      reason: `Nonce already used at ${new Date(entry.usedAt).toISOString()}`,
      entry,
    };
  }
  return { allowed: true };
}

/**
 * Register a nonce as used (in-memory version).
 * Must be called after successful verification.
 */
export function registerNonceMemory(
  nonce: string,
  ttlMs: number = 60_000,
  meta?: { uid?: string; deviceId?: string }
): void {
  const now = Date.now();
  nonceRegistry.set(nonce, {
    nonce,
    usedAt: now,
    expiresAt: now + ttlMs,
    ...meta,
  });
}

/**
 * Atomically check-and-register a nonce (in-memory).
 * Returns false if nonce was already seen.
 */
export function consumeNonceMemory(
  nonce: string,
  ttlMs: number = 60_000,
  meta?: { uid?: string; deviceId?: string }
): ReplayCheckResult {
  const check = checkNonceMemory(nonce);
  if (!check.allowed) return check;

  registerNonceMemory(nonce, ttlMs, meta);
  return { allowed: true };
}

// ─── Timestamp Validation ─────────────────────────────────────────

/**
 * Validate that a handshake timestamp is within the acceptable clock drift window.
 *
 * @param handshakeTimestamp - Unix timestamp in milliseconds from the handshake
 * @param maxDriftMs - Maximum allowed clock drift (default: 30 seconds)
 */
export function validateTimestamp(
  handshakeTimestamp: number,
  maxDriftMs: number = 30_000
): TimestampValidationResult {
  const now = Date.now();
  const drift = Math.abs(now - handshakeTimestamp);

  if (isNaN(handshakeTimestamp) || handshakeTimestamp <= 0) {
    return { valid: false, driftMs: Infinity, reason: 'Invalid timestamp format' };
  }

  if (drift > maxDriftMs) {
    return {
      valid: false,
      driftMs: drift,
      reason: `Timestamp drift of ${Math.round(drift / 1000)}s exceeds max ${maxDriftMs / 1000}s`,
    };
  }

  // Reject future timestamps (possible replay attempt)
  if (handshakeTimestamp > now + 5_000) {
    return {
      valid: false,
      driftMs: drift,
      reason: 'Timestamp is in the future',
    };
  }

  return { valid: true, driftMs: drift };
}

/**
 * Validate handshake expiry (for pre-generated offline tokens)
 */
export function validateExpiry(expiresAt: number): { valid: boolean; reason?: string } {
  if (Date.now() > expiresAt) {
    return { valid: false, reason: 'Handshake has expired' };
  }
  return { valid: true };
}

// ─── Cleanup ──────────────────────────────────────────────────────

function cleanup(): void {
  const now = Date.now();
  for (const [nonce, entry] of nonceRegistry) {
    if (now > entry.expiresAt) {
      nonceRegistry.delete(nonce);
    }
  }
}

/** Clear all nonces (for testing only) */
export function clearNonceRegistryForTest(): void {
  nonceRegistry.clear();
}

/** Get registry size (for testing/monitoring) */
export function getNonceRegistrySize(): number {
  cleanup();
  return nonceRegistry.size;
}
