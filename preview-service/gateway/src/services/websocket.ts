/**
 * WebSocket Handler
 * 
 * Handles WebSocket connections for:
 * - HMR updates proxying
 * - Real-time log streaming
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SessionManager } from './SessionManager.js';
import { logger } from '../server.js';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  sessionId?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) {
    return _supabase;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return null;
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  return _supabase;
}

export function setupWebSocket(wss: WebSocketServer, sessionManager: SessionManager): void {
  const sessionSubscriptions = new Map<string, Set<WebSocket>>();

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');
    const accessToken = url.searchParams.get('accessToken');

    if (!sessionId || !(await canAccessSession(sessionId, accessToken, sessionManager))) {
      logger.warn({ sessionId }, 'Rejected unauthorized WebSocket connection');
      ws.close(1008, 'Unauthorized');
      return;
    }

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

async function canAccessSession(
  sessionId: string,
  accessToken: string | null,
  sessionManager: SessionManager
): Promise<boolean> {
  if (!accessToken) {
    return false;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return false;
  }

  const liveSession = sessionManager.getSession(sessionId);
  if (!liveSession) {
    return false;
  }

  if (liveSession.ownerUserId === user.id) {
    return true;
  }

  if (!liveSession.organizationId) {
    return false;
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', liveSession.organizationId)
    .eq('is_active', true)
    .maybeSingle();

  return membership?.role === 'owner' || membership?.role === 'admin';
}
