/**
 * QR Authentication Routes
 * POST /api/qr/generate — Generate encrypted QR payload
 * POST /api/qr/verify  — Verify scanned QR
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import QRCode from 'qrcode';
import { query, queryOne, execute } from '../db/mysql';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter, getClientIP } from '../middleware/rateLimit';
import { logSecurityEvent, ThreatType } from '../middleware/threatDetection';
import { checkNonceRedis, consumeNonceRedis } from '../db/redis';
import { generateQRPayload } from '../../crypto/src/oth-algorithm';
import { loadMasterKey } from '../../crypto/src/key-manager';
import { sha256 } from '../../crypto/src/hmac';
import { validateTimestamp, validateExpiry } from '../../crypto/src/replay-guard';
import { aesDecryptPacked } from '../../crypto/src/aes';
import { deriveDeviceKeyBundle } from '../../crypto/src/key-manager';
import { hmacVerify } from '../../crypto/src/hmac';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── POST /api/qr/generate ────────────────────────────────────────

router.post(
  '/generate',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { uid, deviceId } = req.user!;
    const masterKey = loadMasterKey();

    // Verify device exists and is active
    const device = await queryOne<{ is_active: boolean }>(
      'SELECT is_active FROM devices WHERE uid = ? AND device_id = ?',
      [uid, deviceId]
    );

    if (!device?.is_active) {
      res.status(403).json({ error: 'Device not active', code: 'DEVICE_INACTIVE' });
      return;
    }

    // Generate QR payload
    const { qrData, nonce, expiresAt } = generateQRPayload(uid, deviceId, masterKey);

    // Store QR session
    await execute(
      `INSERT INTO qr_sessions (uid, device_id, nonce, qr_hash, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', FROM_UNIXTIME(?))`,
      [uid, deviceId, nonce, sha256(qrData), Math.floor(expiresAt / 1000)]
    );

    // Generate QR image as Base64 PNG
    const qrImageBase64 = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    res.json({
      success: true,
      qrData,
      qrImage: qrImageBase64,
      nonce,
      expiresAt,
      expiresInSeconds: 30,
      message: 'QR code expires in 30 seconds',
    });
  }
);

// ─── POST /api/qr/verify ─────────────────────────────────────────

router.post(
  '/verify',
  authRateLimiter(),
  [body('qrData').trim().notEmpty()],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { qrData, scannerUid, scannerDeviceId } = req.body;
    const ip = getClientIP(req);

    // Check if QR session exists and is pending
    const qrSession = await queryOne<{
      uid: string; device_id: string; nonce: string;
      status: string; expires_at: Date;
    }>(
      'SELECT uid, device_id, nonce, status, expires_at FROM qr_sessions WHERE qr_hash = ?',
      [sha256(qrData)]
    );

    if (!qrSession) {
      await logSecurityEvent(req, {
        type: ThreatType.BRUTE_FORCE,
        severity: 'warning',
        riskScore: 60,
        metadata: { reason: 'Unknown QR code presented' },
      });
      res.status(404).json({ error: 'QR code not found or expired', code: 'QR_NOT_FOUND' });
      return;
    }

    if (qrSession.status !== 'pending') {
      res.status(409).json({ error: 'QR code already used', code: 'QR_ALREADY_USED' });
      return;
    }

    // Check expiry
    if (new Date() > new Date(qrSession.expires_at)) {
      await execute(
        "UPDATE qr_sessions SET status = 'expired' WHERE nonce = ?",
        [qrSession.nonce]
      );
      res.status(410).json({ error: 'QR code has expired', code: 'QR_EXPIRED' });
      return;
    }

    // Check nonce freshness
    const nonceFresh = await checkNonceRedis(qrSession.nonce);
    if (!nonceFresh) {
      await logSecurityEvent(req, {
        uid: qrSession.uid,
        type: ThreatType.REPLAY_ATTACK,
        severity: 'critical',
        riskScore: 100,
        metadata: { reason: 'QR nonce replay attempt' },
      });
      res.status(401).json({ error: 'Replay attack detected', code: 'REPLAY_ATTACK' });
      return;
    }

    // Decrypt and verify QR payload
    try {
      const masterKey = loadMasterKey();
      const keyBundle = deriveDeviceKeyBundle(masterKey, qrSession.uid, qrSession.device_id);
      const decrypted = aesDecryptPacked(qrData, keyBundle.encryptionKey);
      const payload = JSON.parse(decrypted);

      // Verify HMAC
      const { signature, ...payloadWithoutSig } = payload;
      const sigValid = hmacVerify(payloadWithoutSig, signature, keyBundle.signingKey);

      if (!sigValid) {
        res.status(401).json({ error: 'QR signature invalid: possible tampering', code: 'QR_TAMPERED' });
        return;
      }

      // Validate timestamp
      const tsResult = validateTimestamp(payload.timestamp, 30_000);
      if (!tsResult.valid) {
        res.status(401).json({ error: tsResult.reason, code: 'QR_EXPIRED' });
        return;
      }

      // Consume nonce
      await consumeNonceRedis(qrSession.nonce, 60, { uid: qrSession.uid, deviceId: qrSession.device_id });

      // Mark QR as verified
      await execute(
        "UPDATE qr_sessions SET status = 'verified', scanned_by = ?, scanned_at = NOW(), verified_at = NOW() WHERE nonce = ?",
        [scannerUid || null, qrSession.nonce]
      );

      // Issue JWT for the QR initiator
      const accessToken = jwt.sign(
        {
          sub: qrSession.uid,
          deviceId: qrSession.device_id,
          fingerprint: 'qr',
          scope: ['auth:read', 'auth:write'],
          type: 'access',
          authMethod: 'qr',
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h', jwtid: uuidv4() }
      );

      await logSecurityEvent(req, {
        uid: qrSession.uid,
        deviceId: qrSession.device_id,
        type: 'qr_auth' as ThreatType,
        severity: 'info',
        riskScore: 5,
      });

      res.json({
        success: true,
        message: 'QR authentication successful',
        uid: qrSession.uid,
        accessToken,
        authMethod: 'qr_handshake',
      });
    } catch {
      res.status(400).json({ error: 'Invalid QR payload', code: 'QR_INVALID' });
    }
  }
);

export default router;
