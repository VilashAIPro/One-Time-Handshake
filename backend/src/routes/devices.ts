/**
 * Device Management Routes
 * POST /api/device/sync   — Bind/update a device
 * GET  /api/device/list   — List user's devices
 * DELETE /api/device/:id  — Remove a device
 * PUT  /api/device/:id/trust — Mark as trusted
 */

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../db/mysql';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { logSecurityEvent, ThreatType } from '../middleware/threatDetection';
import { generateFingerprint } from '../../crypto/src/device-fingerprint';
import { sha256 } from '../../crypto/src/hmac';
import { getClientIP } from '../middleware/rateLimit';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── POST /api/device/sync ────────────────────────────────────────

router.post(
  '/sync',
  [
    body('deviceId').trim().notEmpty(),
    body('platform').isIn(['android', 'ios', 'web', 'feature_phone']),
    body('osVersion').trim().notEmpty(),
    body('appVersion').trim().notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { uid } = req.user!;
    const { deviceId, platform, osVersion, appVersion, brand, model, fcmToken, imeiHash } = req.body;

    // Generate fingerprint
    const { fingerprint, confidence } = generateFingerprint({
      deviceId,
      platform,
      osVersion,
      appVersion,
      brand,
      model,
      imeiHash,
    });

    // Check if device limit exceeded
    const [{ deviceCount }] = await query<[{ deviceCount: number }]>(
      'SELECT COUNT(*) as deviceCount FROM devices WHERE uid = ? AND is_active = TRUE',
      [uid]
    );

    if (deviceCount >= 5) {
      res.status(429).json({
        error: 'Maximum device limit reached (5 devices)',
        code: 'DEVICE_LIMIT_EXCEEDED',
      });
      return;
    }

    // Upsert device
    await execute(
      `INSERT INTO devices
       (uid, device_id, platform, os_version, app_version, brand, model, imei_hash,
        fingerprint, fingerprint_confidence, fcm_token, is_active, last_seen_ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
       ON DUPLICATE KEY UPDATE
         os_version = VALUES(os_version),
         app_version = VALUES(app_version),
         fingerprint = VALUES(fingerprint),
         fingerprint_confidence = VALUES(fingerprint_confidence),
         fcm_token = VALUES(fcm_token),
         last_seen_at = NOW(),
         last_seen_ip = VALUES(last_seen_ip)`,
      [
        uid, deviceId, platform, osVersion, appVersion,
        brand || null, model || null, imeiHash || null,
        fingerprint, confidence,
        fcmToken || null, getClientIP(req),
      ]
    );

    await logSecurityEvent(req, {
      uid,
      deviceId,
      type: 'device_bound' as ThreatType,
      severity: 'info',
      riskScore: 0,
      metadata: { platform, confidence },
    });

    res.json({
      success: true,
      message: 'Device synced successfully',
      deviceId,
      fingerprint: fingerprint.slice(0, 8) + '...',
      confidence,
    });
  }
);

// ─── GET /api/device/list ─────────────────────────────────────────

router.get('/list', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.user!;

  const devices = await query<{
    device_id: string; device_name: string; platform: string;
    os_version: string; app_version: string; brand: string; model: string;
    is_trusted: boolean; is_primary: boolean; is_active: boolean;
    last_seen_at: Date; fingerprint_confidence: string; bound_at: Date;
  }[]>(
    `SELECT device_id, device_name, platform, os_version, app_version, brand, model,
            is_trusted, is_primary, is_active, last_seen_at, fingerprint_confidence, bound_at
     FROM devices WHERE uid = ? ORDER BY is_primary DESC, last_seen_at DESC`,
    [uid]
  );

  res.json({ success: true, devices, count: devices.length });
});

// ─── DELETE /api/device/:id ───────────────────────────────────────

router.delete('/:deviceId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.user!;
  const { deviceId } = req.params;

  const device = await queryOne<{ is_primary: boolean }>(
    'SELECT is_primary FROM devices WHERE uid = ? AND device_id = ?',
    [uid, deviceId]
  );

  if (!device) {
    res.status(404).json({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' });
    return;
  }

  if (device.is_primary && req.user!.deviceId === deviceId) {
    res.status(400).json({
      error: 'Cannot remove your currently active primary device',
      code: 'CANNOT_REMOVE_PRIMARY',
    });
    return;
  }

  await execute(
    'UPDATE devices SET is_active = FALSE WHERE uid = ? AND device_id = ?',
    [uid, deviceId]
  );

  await logSecurityEvent(req, {
    uid,
    deviceId,
    type: 'device_removed' as ThreatType,
    severity: 'info',
    riskScore: 0,
  });

  res.json({ success: true, message: 'Device removed successfully' });
});

// ─── PUT /api/device/:id/trust ────────────────────────────────────

router.put('/:deviceId/trust', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { uid } = req.user!;
  const { deviceId } = req.params;
  const { trust, alias } = req.body;

  await execute(
    'UPDATE devices SET is_trusted = ?, device_name = COALESCE(?, device_name) WHERE uid = ? AND device_id = ?',
    [trust !== false, alias || null, uid, deviceId]
  );

  res.json({
    success: true,
    message: `Device ${trust !== false ? 'trusted' : 'untrusted'} successfully`,
  });
});

export default router;
