/**
 * OTH WebSocket Server
 * Real-time events for:
 * - QR code scan events (notify initiator)
 * - Security alerts
 * - Device sync status
 */

import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface OTHWebSocket extends WebSocket {
  uid?: string;
  deviceId?: string;
  isAlive?: boolean;
}

const clients = new Map<string, OTHWebSocket[]>(); // uid → [WebSocket, ...]

export function setupWebSockets(wss: WebSocketServer): void {
  wss.on('connection', (ws: OTHWebSocket, req) => {
    logger.debug('WebSocket: new connection');
    ws.isAlive = true;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      if (ws.uid) {
        const userClients = clients.get(ws.uid) || [];
        clients.set(ws.uid, userClients.filter(c => c !== ws));
        if (clients.get(ws.uid)?.length === 0) clients.delete(ws.uid);
      }
    });

    ws.on('error', (err) => logger.error('WebSocket error:', err));
  });

  // Heartbeat — ping all clients every 30s
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws: OTHWebSocket) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));
  logger.info('WebSocket server ready');
}

function handleMessage(ws: OTHWebSocket, message: { type: string; token?: string; data?: unknown }): void {
  switch (message.type) {
    case 'auth': {
      // Client authenticates with JWT to receive targeted events
      if (!message.token) {
        ws.send(JSON.stringify({ type: 'auth_error', message: 'Token required' }));
        return;
      }
      try {
        const decoded = jwt.verify(message.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
        ws.uid = decoded.sub as string;
        ws.deviceId = decoded.deviceId;

        const existing = clients.get(ws.uid) || [];
        existing.push(ws);
        clients.set(ws.uid, existing);

        ws.send(JSON.stringify({ type: 'auth_success', uid: ws.uid }));
        logger.debug(`WebSocket: authenticated uid=${ws.uid}`);
      } catch {
        ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
      }
      break;
    }

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${message.type}` }));
  }
}

/**
 * Broadcast a message to all WebSocket connections for a specific user.
 * Used by routes to notify the QR initiator of scan events etc.
 */
export function broadcastToUser(uid: string, message: object): void {
  const userClients = clients.get(uid) || [];
  const payload = JSON.stringify(message);
  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

/**
 * Broadcast a security alert to a specific user
 */
export function sendSecurityAlert(uid: string, alert: {
  type: string;
  severity: string;
  message: string;
  metadata?: object;
}): void {
  broadcastToUser(uid, {
    type: 'security_alert',
    ...alert,
    timestamp: new Date().toISOString(),
  });
}
