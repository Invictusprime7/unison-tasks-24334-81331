/**
 * WebSocket Handler
 * 
 * Handles WebSocket connections for:
 * - HMR updates proxying
 * - Real-time log streaming
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { SessionManager } from './SessionManager.js';
import { logger } from '../server.js';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  sessionId?: string;
}

export function setupWebSocket(wss: WebSocketServer, sessionManager: SessionManager): void {
  const sessionSubscriptions = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');
    
    logger.debug({ sessionId }, 'WebSocket connected');

    // Subscribe to session if provided
    if (sessionId) {
      subscribeToSession(sessionId, ws);
    }

    ws.on('message', (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        logger.error({ error }, 'Invalid WebSocket message');
      }
    });

    ws.on('close', () => {
      // Unsubscribe from all sessions
      for (const [sid, subscribers] of sessionSubscriptions) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          sessionSubscriptions.delete(sid);
        }
      }
    });

    ws.on('error', (error) => {
      logger.error({ error }, 'WebSocket error');
    });
  });

  function handleMessage(ws: WebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (message.sessionId) {
          subscribeToSession(message.sessionId, ws);
        }
        break;
        
      case 'unsubscribe':
        if (message.sessionId) {
          unsubscribeFromSession(message.sessionId, ws);
        }
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  function subscribeToSession(sessionId: string, ws: WebSocket): void {
    if (!sessionSubscriptions.has(sessionId)) {
      sessionSubscriptions.set(sessionId, new Set());
    }
    sessionSubscriptions.get(sessionId)!.add(ws);
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      sessionId,
    }));
  }

  function unsubscribeFromSession(sessionId: string, ws: WebSocket): void {
    const subscribers = sessionSubscriptions.get(sessionId);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        sessionSubscriptions.delete(sessionId);
      }
    }
  }

  // Broadcast to session subscribers
  function broadcastToSession(sessionId: string, data: object): void {
    const subscribers = sessionSubscriptions.get(sessionId);
    if (!subscribers) return;

    const message = JSON.stringify(data);
    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  // Export broadcast function for use in other modules
  (global as any).broadcastToSession = broadcastToSession;
}
