/**
 * ============================================================================
 * ANNAYOG — WebSocket Server
 * ============================================================================
 */

import { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../utils/jwt.js';
import { getById } from '../db/supabase.js';

// userId → Set<WebSocket>
const connections = new Map();

/**
 * Attach WebSocket server to an existing HTTP server.
 * @param {import('http').Server} server - The HTTP server instance
 */
export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/v1/ws' });

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Missing token');
        return;
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch (err) {
        ws.close(4001, 'Invalid or expired token');
        return;
      }

      const user = await getById('users', decoded.user_id);
      if (!user || user.suspended) {
        ws.close(4003, 'Unauthorized');
        return;
      }

      const userId = decoded.user_id;

      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId).add(ws);
      console.log(`[WS] User ${userId} connected (${connections.get(userId).size} sockets)`);

      ws.send(JSON.stringify({
        event: 'CONNECTED',
        data: { userId, timestamp: new Date().toISOString() }
      }));

      ws.on('close', () => {
        const userSockets = connections.get(userId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            connections.delete(userId);
          }
        }
        console.log(`[WS] User ${userId} disconnected`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Socket error for user ${userId}:`, err.message);
      });

    } catch (err) {
      console.error('[WS] Connection handler error:', err.message);
      ws.close(1011, 'Internal server error');
    }
  });

  console.log('[WS] WebSocket server attached on /v1/ws');
}

export function broadcast(userId, event, data) {
  const userSockets = connections.get(userId);
  if (!userSockets || userSockets.size === 0) {
    return false;
  }

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  let sentCount = 0;

  for (const socket of userSockets) {
    if (socket.readyState === 1) { // WebSocket.OPEN
      socket.send(payload);
      sentCount++;
    }
  }

  return sentCount > 0;
}

export function broadcastToRole(role, event, data) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  let totalSent = 0;

  for (const [userId, sockets] of connections.entries()) {
    for (const socket of sockets) {
      if (socket.readyState === 1) {
        socket.send(payload);
        totalSent++;
      }
    }
  }

  return totalSent;
}

export function getActiveConnectionCount() {
  let count = 0;
  for (const sockets of connections.values()) {
    count += sockets.size;
  }
  return count;
}
