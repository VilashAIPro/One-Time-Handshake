/**
 * Emergency Authentication Routes
 * POST /api/emergency/auth     — Use emergency recovery token
 * POST /api/emergency/generate — Generate emergency token (admin)
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { queryOne, execute } from '../db/mysql';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter, getClientIP } from '../middleware/rateLimit';
import { logSecurityEvent, ThreatType } from '../middleware/threatDetection';
import { sha256 } from '../../crypto/src/hmac';
import { generateAPIKey } from '../../crypto/src/nonce';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── POST /api/emergency/generate ────────────────────────────────

router.post(
  '/generate',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { uid } = req.user!;
    const { ttlHours = 24, tokenType = 'recovery' } = req.body;

    // Generate a random recovery token
    const rawToken = generateAPIKey(32); // 64-char hex
    const tokenHash = sha256(rawToken);

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await execute(
      `INSERT INTO emergency_tokens
       (uid, token_hash, token_type, max_usage, ip_address, expires_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [uid, tokenHash, tokenType, getClientIP(req), expiresAt]
    );

    await logSecurityEvent(req, {
      uid,
      type: 'emergency_auth' as ThreatType,
      severity: 'warning',
      riskScore: 20,
      metadata: { action: 'token_generated', tokenType },
    });

    res.json({
      success: true,
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
      warning: 'Store this token securely. It can only be used once.',
    });
  }
);

// ─── POST /api/emergency/auth ─────────────────────────────────────

router.post(
  '/auth',
  authRateLimiter(),
  [
    body('phone').trim().notEmpty(),
    body('emergencyToken').trim().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { phone, emergencyToken } = req.body;

    // Find user by phone
    const user = await queryOne<{ uid: string; status: string }>(
      'SELECT uid, status FROM users WHERE phone = ?',
      [phone]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const tokenHash = sha256(emergencyToken);

    // Find valid token
    const tokenRecord = await queryOne<{
      id: string; is_used: boolean; usage_count: number; max_usage: number; expires_at: Date;
    }>(
      `SELECT id, is_used, usage_count, max_usage, expires_at
       FROM emergency_tokens
       WHERE uid = ? AND token_hash = ? AND expires_at > NOW()`,
      [user.uid, tokenHash]
    );

    if (!tokenRecord) {
      await logSecurityEvent(req, {
        uid: user.uid,
        type: ThreatType.BRUTE_FORCE,
        severity: 'warning',
        riskScore: 70,
        metadata: { reason: 'Invalid emergency token' },
      });
      res.status(401).json({ error: 'Invalid or expired emergency token', code: 'EMERGENCY_TOKEN_INVALID' });
      return;
    }

    if (tokenRecord.usage_count >= tokenRecord.max_usage) {
      res.status(410).json({ error: 'Emergency token already used', code: 'TOKEN_EXHAUSTED' });
      return;
    }

    // Mark token as used
    await execute(
      'UPDATE emergency_tokens SET usage_count = usage_count + 1, used_at = NOW() WHERE id = ?',
      [tokenRecord.id]
    );

    // Issue limited-scope JWT (emergency)
    const accessToken = jwt.sign(
      {
        sub: user.uid,
        deviceId: 'emergency',
        fingerprint: 'emergency',
        scope: ['auth:read', 'auth:write', 'emergency:access'],
        type: 'emergency',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '2h', jwtid: uuidv4() }
    );

    await logSecurityEvent(req, {
      uid: user.uid,
      type: 'emergency_auth' as ThreatType,
      severity: 'warning',
      riskScore: 30,
      metadata: { action: 'emergency_login_success' },
    });

    res.json({
      success: true,
      message: 'Emergency authentication successful',
      accessToken,
      expiresIn: 7200,
      warning: 'Emergency token used. Please re-bind your device as soon as possible.',
      nextSteps: ['rebind_device', 'generate_new_recovery_code'],
    });
  }
);

export default router;
