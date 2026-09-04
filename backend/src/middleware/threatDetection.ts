/**
 * Threat Detection Middleware
 * Real-time anomaly and threat detection for OTH
 */

import { Request, Response, NextFunction } from 'express';
import { execute } from '../db/mysql';
import { logger, securityLogger } from '../utils/logger';
import { getClientIP } from './rateLimit';

export enum ThreatType {
  REPLAY_ATTACK = 'replay_attack',
  BRUTE_FORCE = 'brute_force',
  DEVICE_CLONING = 'device_cloning_detected',
  TIMESTAMP_MISMATCH = 'timestamp_mismatch',
  FINGERPRINT_MISMATCH = 'fingerprint_mismatch',
  UNKNOWN_DEVICE = 'unknown_device',
  SUSPICIOUS_LOCATION = 'suspicious_location',
  IMEI_MISMATCH = 'imei_mismatch',
}

export interface ThreatEvent {
  uid?: string;
  deviceId?: string;
  type: ThreatType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  riskScore: number;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Log a security event to the database and security logger
 */
export async function logSecurityEvent(
  req: Request,
  event: ThreatEvent
): Promise<void> {
  const ip = event.ip || getClientIP(req);

  // Log to security logger
  securityLogger.log({
    level: event.severity === 'critical' ? 'error' : event.severity,
    message: `Security event: ${event.type}`,
    uid: event.uid,
    deviceId: event.deviceId,
    type: event.type,
    riskScore: event.riskScore,
    ip,
    metadata: event.metadata,
  });

  // Persist to database
  try {
    await execute(
      `INSERT INTO security_logs
       (uid, device_id, event_type, severity, ip_address, user_agent, risk_score, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.uid || null,
        event.deviceId || null,
        event.type,
        event.severity,
        ip,
        req.headers['user-agent'] || null,
        event.riskScore,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    );
  } catch (error) {
    logger.error('Failed to persist security event:', error);
  }
}

/**
 * Middleware: detect suspicious requests before processing
 */
export function threatDetectionMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);

    // Check for known malicious patterns
    const userAgent = req.headers['user-agent'] || '';
    const isSuspiciousUA = /sqlmap|nikto|nmap|masscan|zap|burp/i.test(userAgent);

    if (isSuspiciousUA) {
      await logSecurityEvent(req, {
        type: ThreatType.BRUTE_FORCE,
        severity: 'warning',
        riskScore: 70,
        metadata: { reason: 'Suspicious user agent', userAgent, ip },
      });

      res.status(403).json({
        error: 'Forbidden',
        code: 'SECURITY_BLOCK',
      });
      return;
    }

    // Check for excessive header manipulation
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.split(',').length > 5) {
      await logSecurityEvent(req, {
        type: ThreatType.SUSPICIOUS_LOCATION,
        severity: 'warning',
        riskScore: 50,
        metadata: { reason: 'Excessive X-Forwarded-For chain', ip },
      });
    }

    next();
  };
}

/**
 * Calculate risk score for an authentication attempt
 */
export function calculateRiskScore(factors: {
  isNewDevice?: boolean;
  fingerprintMismatch?: boolean;
  timestampDriftMs?: number;
  failedAttempts?: number;
  isVPN?: boolean;
  isRooted?: boolean;
  geoMismatch?: boolean;
}): number {
  let score = 0;

  if (factors.isNewDevice) score += 20;
  if (factors.fingerprintMismatch) score += 40;
  if (factors.timestampDriftMs && factors.timestampDriftMs > 15000) score += 30;
  if (factors.failedAttempts && factors.failedAttempts > 3) score += factors.failedAttempts * 5;
  if (factors.isVPN) score += 15;
  if (factors.isRooted) score += 25;
  if (factors.geoMismatch) score += 35;

  return Math.min(score, 100);
}
