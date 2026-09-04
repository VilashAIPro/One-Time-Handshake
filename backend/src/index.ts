/**
 * OTH Backend — Main Application Server
 *
 * Express.js server with:
 * - Security middleware (helmet, cors, rate limiting)
 * - JWT authentication
 * - WebSocket support
 * - Swagger API documentation
 * - Graceful shutdown
 */

import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { logger } from './utils/logger';
import { getPool, closePool } from './db/mysql';
import { getRedisClient, closeRedis } from './db/redis';
import { initFirebase } from './config/firebase';

// Routes
import authRoutes from './routes/auth';
import handshakeRoutes from './routes/handshake';
import deviceRoutes from './routes/devices';
import qrRoutes from './routes/qr';
import emergencyRoutes from './routes/emergency';
import adminRoutes from './routes/admin';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { createRateLimiter } from './middleware/rateLimit';
import { setupWebSockets } from './websocket/wsServer';

// ─── App Setup ───────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

// ─── Security Middleware ──────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim());
    if (!origin || allowed.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-OTH-Device-ID', 'X-OTH-Signature'],
}));

// ─── General Middleware ───────────────────────────────────────────

app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));
app.use(requestLogger);

// ─── Global Rate Limiting ─────────────────────────────────────────

app.use('/api/', createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later',
}));

// ─── Health Check ─────────────────────────────────────────────────

app.get('/health', async (req, res) => {
  const { checkDatabaseHealth } = await import('./db/mysql');
  const { checkRedisHealth } = await import('./db/redis');

  const [db, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const status = db.status === 'ok' && redis.status === 'ok' ? 'healthy' : 'degraded';

  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    services: { database: db, redis },
  });
});

app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', async (_req, res) => {
  const { checkDatabaseHealth } = await import('./db/mysql');
  const db = await checkDatabaseHealth();
  if (db.status === 'ok') {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: db.error });
  }
});

// ─── API Routes ───────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/handshake', handshakeRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/admin', adminRoutes);

// ─── Swagger Documentation ────────────────────────────────────────

try {
  const swaggerDoc = YAML.load(path.join(__dirname, '../swagger.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customSiteTitle: 'OTH API Documentation',
    customCss: '.swagger-ui .topbar { background: #0F172A }',
  }));
  logger.info('Swagger docs available at /api/docs');
} catch {
  logger.warn('swagger.yaml not found — API docs disabled');
}

// ─── 404 Handler ─────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// ─── Error Handler ────────────────────────────────────────────────

app.use(errorHandler);

// ─── WebSocket Server ─────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
setupWebSockets(wss);

// ─── Startup ──────────────────────────────────────────────────────

async function start(): Promise<void> {
  try {
    // Initialize services
    getPool();
    await getRedisClient();
    initFirebase();

    const PORT = parseInt(process.env.BACKEND_PORT || '3001');
    const HOST = process.env.BACKEND_HOST || '0.0.0.0';

    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 OTH Backend running at http://${HOST}:${PORT}`);
      logger.info(`📚 API Docs: http://${HOST}:${PORT}/api/docs`);
      logger.info(`🔌 WebSocket: ws://${HOST}:${PORT}/ws`);
      logger.info(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  httpServer.close(async () => {
    await closePool();
    await closeRedis();
    logger.info('All connections closed. Goodbye! 👋');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

start();

export { app, httpServer };
