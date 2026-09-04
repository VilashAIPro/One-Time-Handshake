/**
 * Admin Portal Routes
 * GET  /api/admin/users      — List all users
 * GET  /api/admin/analytics  — Platform analytics
 * GET  /api/admin/threats    — Threat logs
 * GET  /api/admin/devices    — All device activity
 * POST /api/admin/api-keys   — Create API key
 * GET  /api/admin/api-keys   — List API keys
 */

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../db/mysql';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { sha256 } from '../../crypto/src/hmac';
import { generateAPIKey } from '../../crypto/src/nonce';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// ─── GET /api/admin/users ─────────────────────────────────────────

router.get('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;
  const search = req.query.search as string;

  const whereClause = search
    ? 'WHERE (u.phone LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?) AND u.deleted_at IS NULL'
    : 'WHERE u.deleted_at IS NULL';
  const params = search
    ? [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    : [limit, offset];

  const users = await query(
    `SELECT u.uid, u.phone, u.email, u.full_name, u.role, u.status,
            u.created_at, u.last_login_at, u.last_login_ip,
            COUNT(DISTINCT d.id) as device_count,
            COUNT(DISTINCT h.id) as handshake_count
     FROM users u
     LEFT JOIN devices d ON d.uid = u.uid AND d.is_active = TRUE
     LEFT JOIN handshakes h ON h.uid = u.uid
     ${whereClause}
     GROUP BY u.uid
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );

  const [{ total }] = await query<[{ total: number }]>(
    `SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL`,
    []
  );

  res.json({ success: true, data: users, pagination: { page, limit, total } });
});

// ─── GET /api/admin/analytics ─────────────────────────────────────

router.get('/analytics', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const [stats] = await query<[{
    totalUsers: number; activeUsers: number; totalDevices: number;
    totalHandshakes: number; todayHandshakes: number; failedToday: number;
  }]>(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as totalUsers,
       (SELECT COUNT(*) FROM users WHERE status = 'active' AND deleted_at IS NULL) as activeUsers,
       (SELECT COUNT(*) FROM devices WHERE is_active = TRUE) as totalDevices,
       (SELECT COUNT(*) FROM handshakes) as totalHandshakes,
       (SELECT COUNT(*) FROM handshakes WHERE DATE(generated_at) = CURDATE()) as todayHandshakes,
       (SELECT COUNT(*) FROM handshakes WHERE status = 'failed' AND DATE(generated_at) = CURDATE()) as failedToday`,
    []
  );

  const authMethodBreakdown = await query(
    `SELECT auth_method, COUNT(*) as count
     FROM handshakes WHERE DATE(generated_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY auth_method`,
    []
  );

  const dailyActivity = await query(
    `SELECT DATE(generated_at) as date, COUNT(*) as total,
            SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as successful
     FROM handshakes
     WHERE generated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY DATE(generated_at)
     ORDER BY date DESC`,
    []
  );

  const platformBreakdown = await query(
    `SELECT platform, COUNT(*) as count FROM devices WHERE is_active = TRUE GROUP BY platform`,
    []
  );

  res.json({
    success: true,
    stats,
    authMethodBreakdown,
    dailyActivity,
    platformBreakdown,
  });
});

// ─── GET /api/admin/threats ───────────────────────────────────────

router.get('/threats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const severity = req.query.severity as string;
  const offset = (page - 1) * limit;

  const whereClause = severity ? 'WHERE severity = ?' : 'WHERE severity IN (\'warning\', \'error\', \'critical\')';
  const params = severity ? [severity, limit, offset] : [limit, offset];

  const threats = await query(
    `SELECT id, uid, device_id, event_type, severity, ip_address, risk_score, metadata, timestamp
     FROM security_logs
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT ? OFFSET ?`,
    params
  );

  const [{ total }] = await query<[{ total: number }]>(
    `SELECT COUNT(*) as total FROM security_logs ${whereClause.replace('LIMIT ? OFFSET ?', '')}`,
    severity ? [severity] : []
  );

  res.json({ success: true, data: threats, pagination: { page, limit, total } });
});

// ─── POST /api/admin/api-keys ─────────────────────────────────────

router.post(
  '/api-keys',
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('orgId').trim().notEmpty(),
    body('permissions').isArray(),
    body('rateLimit').isInt({ min: 1, max: 100000 }).optional(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { name, orgId, permissions, rateLimit = 1000, expiresAt } = req.body;

    const rawKey = generateAPIKey(32); // 64-char hex key
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 8);

    await execute(
      `INSERT INTO api_keys (org_id, name, key_hash, key_prefix, permissions, rate_limit, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [orgId, name, keyHash, keyPrefix, JSON.stringify(permissions), rateLimit, expiresAt || null, req.user!.uid]
    );

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      apiKey: `oth_${rawKey}`, // Prefix for identification
      keyPrefix,
      warning: 'Store this key securely. It will not be shown again.',
    });
  }
);

// ─── GET /api/admin/api-keys ──────────────────────────────────────

router.get('/api-keys', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const keys = await query(
    `SELECT id, org_id, name, key_prefix, permissions, rate_limit,
            is_active, last_used_at, created_at, expires_at
     FROM api_keys ORDER BY created_at DESC LIMIT 100`,
    []
  );

  res.json({ success: true, data: keys });
});

export default router;
