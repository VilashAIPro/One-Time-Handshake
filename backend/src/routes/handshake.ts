/**
 * OTH Handshake Routes
 * POST /api/handshake/generate
 * POST /api/handshake/verify
 * POST /api/handshake/offline
 * GET  /api/history
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from '../db/mysql';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter, getClientIP } from '../middleware/rateLimit';
import { logSecurityEvent, ThreatType, calculateRiskScore } from '../middleware/threatDetection';
import { checkNonceRedis, consumeNonceRedis } from '../db/redis';
import { generateHandshake, verifyHandshake, generateOfflineToken, verifyOfflineToken } from '../../crypto/src/oth-algorithm';
import { loadMasterKey, deriveDeviceKeyBundle } from '../../crypto/src/key-manager';
import { sha256 } from '../../crypto/src/hmac';
import { logger } from '../utils/logger';

const router = Router();

// ─── POST /api/handshake/generate ────────────────────────────────

router.post(
  '/generate',
  authRateLimiter(),
  [
    body('uid').trim().notEmpty(),
    body('phone').trim().notEmpty(),
    body('deviceInfo').isObject(),
    body('deviceInfo.deviceId').trim().notEmpty(),
    body('deviceInfo.platform').isIn(['android', 'ios', 'web', 'feature_phone']),
    body('deviceInfo.osVersion').trim().notEmpty(),
    body('deviceInfo.appVersion').trim().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { uid, phone, deviceInfo } = req.body;

    // Verify user exists
    const user = await queryOne<{ uid: string; status: string }>(
      'SELECT uid, status FROM users WHERE uid = ? AND phone = ?',
      [uid, phone]
    );

    if (!user || user.status !== 'active') {
      res.status(404).json({ error: 'User not found or inactive', code: 'USER_NOT_FOUND' });
      return;
    }

    // Check device is registered
    const device = await queryOne<{ fingerprint: string; key_version: number; is_active: boolean }>(
      'SELECT fingerprint, key_version, is_active FROM devices WHERE uid = ? AND device_id = ?',
      [uid, deviceInfo.deviceId]
    );

    if (!device || !device.is_active) {
      res.status(403).json({
        error: 'Device not registered or inactive. Please bind your device first.',
        code: 'DEVICE_NOT_BOUND',
      });
      return;
    }

    const masterKey = loadMasterKey();

    // Generate the handshake token
    const handshakeResult = generateHandshake({
      uid,
      phone,
      deviceInfo,
      masterKey,
    });

    // Store handshake record
    await execute(
      `INSERT INTO handshakes
       (handshake_id, uid, device_id, nonce, timestamp_ms, status, auth_method, ip_address, expires_at)
       VALUES (?, ?, ?, ?, ?, 'generated', 'handshake', ?, DATE_ADD(NOW(), INTERVAL 30 SECOND))`,
      [
        handshakeResult.handshakeId,
        uid,
        deviceInfo.deviceId,
        handshakeResult.nonce,
        handshakeResult.timestamp,
        getClientIP(req),
      ]
    );

    res.json({
      success: true,
      handshakeId: handshakeResult.handshakeId,
      handshakeToken: handshakeResult.handshakeToken,
      expiresAt: handshakeResult.expiresAt,
      version: handshakeResult.version,
    });
  }
);

// ─── POST /api/handshake/verify ───────────────────────────────────

router.post(
  '/verify',
  authRateLimiter(),
  [
    body('handshakeToken').trim().notEmpty(),
    body('uid').trim().notEmpty(),
    body('deviceId').trim().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { handshakeToken, uid, deviceId } = req.body;
    const ip = getClientIP(req);

    // Get registered device fingerprint
    const device = await queryOne<{ fingerprint: string; is_trusted: boolean; is_active: boolean }>(
      'SELECT fingerprint, is_trusted, is_active FROM devices WHERE uid = ? AND device_id = ?',
      [uid, deviceId]
    );

    if (!device || !device.is_active) {
      res.status(403).json({ error: 'Device not registered', code: 'DEVICE_NOT_BOUND' });
      return;
    }

    const masterKey = loadMasterKey();

    // Verify the handshake
    const result = await verifyHandshake({
      handshakeToken,
      uid,
      masterKey,
      registeredFingerprint: device.fingerprint,
      checkNonce: async (nonce) => checkNonceRedis(nonce),
      consumeNonce: async (nonce) => {
        await consumeNonceRedis(nonce, 60, { uid, deviceId });
      },
    });

    if (!result.valid) {
      // Update handshake record as failed
      await execute(
        `UPDATE handshakes SET status = 'failed', failure_reason = ?, risk_score = ?
         WHERE uid = ? AND device_id = ? AND status = 'generated' ORDER BY generated_at DESC LIMIT 1`,
        [result.error, result.riskScore, uid, deviceId]
      );

      // Log security event
      const threatType = result.error?.includes('Replay') ? ThreatType.REPLAY_ATTACK
        : result.error?.includes('fingerprint') ? ThreatType.FINGERPRINT_MISMATCH
        : result.error?.includes('timestamp') ? ThreatType.TIMESTAMP_MISMATCH
        : ThreatType.BRUTE_FORCE;

      await logSecurityEvent(req, {
        uid,
        deviceId,
        type: threatType,
        severity: (result.riskScore || 0) >= 80 ? 'critical' : 'warning',
        riskScore: result.riskScore || 50,
        metadata: { error: result.error },
      });

      res.status(401).json({
        success: false,
        error: result.error,
        code: 'HANDSHAKE_FAILED',
        riskScore: result.riskScore,
      });
      return;
    }

    // Mark handshake as verified
    await execute(
      `UPDATE handshakes SET status = 'verified', verified_at = NOW(), risk_score = ?
       WHERE nonce = ?`,
      [result.riskScore, result.nonce]
    );

    // Generate JWT session tokens
    const jwtSecret = process.env.JWT_SECRET!;
    const jwtid = uuidv4();

    const accessToken = jwt.sign(
      {
        sub: uid,
        deviceId,
        fingerprint: (result.fingerprint || '').slice(0, 8),
        scope: ['auth:read', 'auth:write'],
        type: 'access',
      },
      jwtSecret,
      { expiresIn: '24h', jwtid }
    );

    const refreshToken = jwt.sign(
      { sub: uid, type: 'refresh', deviceId },
      process.env.JWT_REFRESH_SECRET || jwtSecret,
      { expiresIn: '7d', jwtid: uuidv4() }
    );

    // Store session
    await execute(
      `INSERT INTO sessions
       (uid, device_id, jwt_token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [uid, deviceId, sha256(accessToken), sha256(refreshToken), ip, req.headers['user-agent']?.slice(0, 500)]
    );

    // Update device last seen
    await execute(
      'UPDATE devices SET last_seen_at = NOW(), last_seen_ip = ? WHERE uid = ? AND device_id = ?',
      [ip, uid, deviceId]
    );

    // Log success
    await logSecurityEvent(req, {
      uid,
      deviceId,
      type: 'handshake_verified' as ThreatType,
      severity: 'info',
      riskScore: result.riskScore || 0,
    });

    res.json({
      success: true,
      message: 'OTH Handshake verified successfully',
      accessToken,
      refreshToken,
      expiresIn: 86400,
      uid,
      deviceId,
      riskScore: result.riskScore,
      isTrusted: device.is_trusted,
    });
  }
);

// ─── POST /api/handshake/offline ──────────────────────────────────

router.post(
  '/offline',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { uid, deviceId } = req.user!;
    const { ttlHours = 24, maxUsage = 3 } = req.body;

    const device = await queryOne<{ is_active: boolean }>(
      'SELECT is_active FROM devices WHERE uid = ? AND device_id = ?',
      [uid, deviceId]
    );

    if (!device?.is_active) {
      res.status(403).json({ error: 'Device not bound', code: 'DEVICE_NOT_BOUND' });
      return;
    }

    const masterKey = loadMasterKey();
    const offlineToken = generateOfflineToken(uid, deviceId, masterKey, {
      ttlMs: ttlHours * 60 * 60 * 1000,
      maxUsage: Math.min(maxUsage, 10),
    });

    // Store in DB
    await execute(
      `INSERT INTO offline_tokens
       (uid, device_id, handshake_id, token_encrypted, checksum, max_usage, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
      [
        uid, deviceId, offlineToken.handshakeId,
        offlineToken.token, offlineToken.checksum,
        offlineToken.maxUsage,
        Math.floor(offlineToken.expiresAt / 1000),
      ]
    );

    res.json({
      success: true,
      offlineToken: {
        token: offlineToken.token,
        handshakeId: offlineToken.handshakeId,
        checksum: offlineToken.checksum,
        expiresAt: offlineToken.expiresAt,
        maxUsage: offlineToken.maxUsage,
      },
      message: `Offline token valid for ${ttlHours}h, usable ${offlineToken.maxUsage} times`,
    });
  }
);

// ─── GET /api/history ─────────────────────────────────────────────

router.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.user!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  const history = await query<{
    handshake_id: string; status: string; auth_method: string;
    ip_address: string; risk_score: number; generated_at: Date; device_id: string;
  }[]>(
    `SELECT handshake_id, status, auth_method, ip_address, risk_score, generated_at, device_id
     FROM handshakes WHERE uid = ? ORDER BY generated_at DESC LIMIT ? OFFSET ?`,
    [uid, limit, offset]
  );

  const [{ total }] = await query<[{ total: number }]>(
    'SELECT COUNT(*) as total FROM handshakes WHERE uid = ?',
    [uid]
  );

  res.json({
    success: true,
    data: history,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export default router;
