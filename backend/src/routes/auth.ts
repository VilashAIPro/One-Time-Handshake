/**
 * Authentication Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh
 * GET  /api/auth/me
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db/mysql';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter, resetAuthRateLimit, getClientIP } from '../middleware/rateLimit';
import { logSecurityEvent, ThreatType } from '../middleware/threatDetection';
import { blacklistToken } from '../db/redis';
import { sha256 } from '../../crypto/src/hmac';
import { logger } from '../utils/logger';

const router = Router();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// ─── Validation Rules ─────────────────────────────────────────────

const registerValidation = [
  body('phone')
    .trim()
    .matches(/^\+?[1-9]\d{9,14}$/)
    .withMessage('Invalid phone number format'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, number and special char'),
  body('fullName').trim().isLength({ min: 2, max: 255 }).optional(),
  body('email').isEmail().normalizeEmail().optional(),
];

const loginValidation = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('deviceId').trim().notEmpty().withMessage('Device ID is required'),
];

// ─── POST /api/auth/register ─────────────────────────────────────

router.post(
  '/register',
  authRateLimiter(),
  registerValidation,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { phone, password, fullName, email, deviceId, platform, osVersion, appVersion } = req.body;

    // Check if phone already registered
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (existing) {
      res.status(409).json({ error: 'Phone number already registered', code: 'PHONE_EXISTS' });
      return;
    }

    const uid = uuidv4();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    await execute(
      `INSERT INTO users (id, uid, phone, email, password_hash, full_name, status, phone_verified)
       VALUES (UUID(), ?, ?, ?, ?, ?, 'active', FALSE)`,
      [uid, phone, email || null, passwordHash, fullName || null]
    );

    // Register device if provided
    if (deviceId) {
      await execute(
        `INSERT INTO devices
         (uid, device_id, platform, os_version, app_version, fingerprint, is_primary, is_trusted)
         VALUES (?, ?, ?, ?, ?, ?, TRUE, FALSE)`,
        [uid, deviceId, platform || 'android', osVersion || '', appVersion || '1.0.0', sha256(deviceId)]
      );
    }

    // Log event
    await logSecurityEvent(req, {
      uid,
      type: ThreatType.UNKNOWN_DEVICE,
      severity: 'info',
      riskScore: 0,
      metadata: { event: 'registration', platform, phone: phone.slice(-4) },
    });

    logger.info(`New user registered: uid=${uid}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      uid,
      nextStep: 'device_binding',
    });
  }
);

// ─── POST /api/auth/login (Emergency password fallback) ───────────

router.post(
  '/login',
  authRateLimiter(),
  loginValidation,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { phone, password, deviceId } = req.body;
    const ip = getClientIP(req);

    const user = await queryOne<{
      uid: string; password_hash: string; status: string;
      failed_attempts: number; locked_until: Date | null;
    }>(
      'SELECT uid, password_hash, status, failed_attempts, locked_until FROM users WHERE phone = ?',
      [phone]
    );

    if (!user) {
      // Don't reveal user existence
      res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    // Check account lock
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const ttl = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 1000);
      res.status(423).json({
        error: 'Account temporarily locked due to multiple failed attempts',
        code: 'ACCOUNT_LOCKED',
        retryAfterSeconds: ttl,
      });
      return;
    }

    // Check password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      const newAttempts = user.failed_attempts + 1;
      const lockUntil = newAttempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      await execute(
        'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE uid = ?',
        [newAttempts, lockUntil, user.uid]
      );

      await logSecurityEvent(req, {
        uid: user.uid,
        type: ThreatType.BRUTE_FORCE,
        severity: newAttempts >= 3 ? 'warning' : 'info',
        riskScore: newAttempts * 10,
        metadata: { attempts: newAttempts },
      });

      res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        attemptsRemaining: Math.max(0, 5 - newAttempts),
      });
      return;
    }

    // Reset failed attempts
    await execute(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = ? WHERE uid = ?',
      [ip, user.uid]
    );

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET!;
    const accessToken = jwt.sign(
      {
        sub: user.uid,
        deviceId,
        fingerprint: sha256(deviceId).slice(0, 8),
        scope: ['auth:read', 'auth:write'],
        type: 'access',
      },
      jwtSecret,
      { expiresIn: '24h', jwtid: uuidv4() }
    );

    const refreshToken = jwt.sign(
      { sub: user.uid, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || jwtSecret,
      { expiresIn: '7d', jwtid: uuidv4() }
    );

    // Store session
    await execute(
      `INSERT INTO sessions (uid, device_id, jwt_token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [
        user.uid, deviceId,
        sha256(accessToken), sha256(refreshToken),
        ip, req.headers['user-agent']?.slice(0, 500) || null,
      ]
    );

    await resetAuthRateLimit(ip, phone);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 86400,
      uid: user.uid,
      method: 'password_fallback',
      warning: 'Use OTH handshake for primary authentication',
    });
  }
);

// ─── POST /api/auth/logout ────────────────────────────────────────

router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const token = req.headers.authorization!.slice(7);
  const tokenHash = sha256(token);

  // Blacklist the token
  await blacklistToken(tokenHash, 86400); // 24h TTL

  // Mark session revoked
  await execute(
    'UPDATE sessions SET is_active = FALSE, revoked_at = NOW(), revoke_reason = ? WHERE jwt_token_hash = ?',
    ['user_logout', tokenHash]
  );

  res.json({ success: true, message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await queryOne<{
    uid: string; phone: string; email: string; full_name: string;
    role: string; status: string; created_at: Date; last_login_at: Date;
  }>(
    'SELECT uid, phone, email, full_name, role, status, created_at, last_login_at FROM users WHERE uid = ?',
    [req.user!.uid]
  );

  if (!user) {
    res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    return;
  }

  res.json({ success: true, user });
});

export default router;
