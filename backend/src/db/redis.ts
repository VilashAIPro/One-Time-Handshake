/**
 * Redis Client Manager
 * Used for:
 * - Nonce registry (replay attack prevention)
 * - Session caching
 * - Rate limiting counters
 * - Token blacklist
 * - Real-time event pub/sub
 */

import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger';

// ─── Client Instance ──────────────────────────────────────────────

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: too many reconnection attempts');
            return new Error('Redis max reconnection attempts exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0'),
    }) as RedisClientType;

    client.on('error', (err) => logger.error('Redis client error:', err));
    client.on('connect', () => logger.info('Redis connected'));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

    await client.connect();
  }
  return client;
}

// ─── Nonce Registry (Replay Prevention) ──────────────────────────

const NONCE_KEY_PREFIX = 'oth:nonce:';
const NONCE_DEFAULT_TTL = parseInt(process.env.OTH_NONCE_TTL_SECONDS || '60');

/**
 * Check if a nonce has been used (async Redis version)
 */
export async function checkNonceRedis(nonce: string): Promise<boolean> {
  const redis = await getRedisClient();
  const exists = await redis.exists(`${NONCE_KEY_PREFIX}${nonce}`);
  return exists === 0; // true = nonce is fresh
}

/**
 * Register a nonce as used in Redis with TTL
 */
export async function consumeNonceRedis(
  nonce: string,
  ttlSeconds = NONCE_DEFAULT_TTL,
  meta?: { uid?: string; deviceId?: string }
): Promise<void> {
  const redis = await getRedisClient();
  const value = JSON.stringify({ usedAt: Date.now(), ...meta });
  await redis.set(`${NONCE_KEY_PREFIX}${nonce}`, value, { EX: ttlSeconds });
}

// ─── Token Blacklist ──────────────────────────────────────────────

const TOKEN_BLACKLIST_PREFIX = 'oth:blacklist:';

export async function blacklistToken(
  tokenHash: string,
  expiresInSeconds: number
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(`${TOKEN_BLACKLIST_PREFIX}${tokenHash}`, '1', {
    EX: expiresInSeconds,
  });
}

export async function isTokenBlacklisted(tokenHash: string): Promise<boolean> {
  const redis = await getRedisClient();
  const exists = await redis.exists(`${TOKEN_BLACKLIST_PREFIX}${tokenHash}`);
  return exists === 1;
}

// ─── Rate Limiting ────────────────────────────────────────────────

const RATE_LIMIT_PREFIX = 'oth:rate:';

export async function incrementRateLimit(
  key: string,
  windowSeconds = 900
): Promise<{ count: number; ttl: number }> {
  const redis = await getRedisClient();
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`;

  const count = await redis.incr(fullKey);
  if (count === 1) {
    await redis.expire(fullKey, windowSeconds);
  }
  const ttl = await redis.ttl(fullKey);

  return { count, ttl };
}

export async function getRateLimitCount(key: string): Promise<number> {
  const redis = await getRedisClient();
  const val = await redis.get(`${RATE_LIMIT_PREFIX}${key}`);
  return val ? parseInt(val) : 0;
}

export async function resetRateLimit(key: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(`${RATE_LIMIT_PREFIX}${key}`);
}

// ─── Session Cache ────────────────────────────────────────────────

const SESSION_PREFIX = 'oth:session:';

export async function cacheSession(
  sessionId: string,
  data: object,
  ttlSeconds = 86400
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(data), {
    EX: ttlSeconds,
  });
}

export async function getCachedSession<T>(sessionId: string): Promise<T | null> {
  const redis = await getRedisClient();
  const data = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function invalidateSession(sessionId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
}

// ─── Health Check ─────────────────────────────────────────────────

export async function checkRedisHealth(): Promise<{
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}> {
  try {
    const redis = await getRedisClient();
    const start = Date.now();
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown',
    };
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis connection closed');
  }
}
