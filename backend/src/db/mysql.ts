/**
 * MySQL Connection Pool Manager
 * Uses mysql2 with promise support and connection pooling
 */

import mysql from 'mysql2/promise';
import { logger } from '../utils/logger';

// ─── Connection Pool ──────────────────────────────────────────────

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      database: process.env.MYSQL_DATABASE || 'oth_db',
      user: process.env.MYSQL_USER || 'oth_user',
      password: process.env.MYSQL_PASSWORD || '',
      connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '20'),
      waitForConnections: true,
      queueLimit: 0,
      // Security settings
      multipleStatements: false,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
      // Performance
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Charset
      charset: 'utf8mb4_unicode_ci',
    });

    logger.info('MySQL connection pool initialized');
  }
  return pool;
}

// ─── Query Helpers ────────────────────────────────────────────────

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export async function queryOne<T = mysql.RowDataPacket>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<mysql.ResultSetHeader> {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

export async function transaction<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ─── Health Check ─────────────────────────────────────────────────

export async function checkDatabaseHealth(): Promise<{
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    await query('SELECT 1');
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
}
