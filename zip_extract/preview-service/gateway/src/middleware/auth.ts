/**
 * Authentication Middleware
 * 
 * Enterprise-grade auth for preview endpoints.
 * Validates JWT tokens, enforces org quotas, and logs security events.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../server.js';

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true'; // Only for local dev

// ============================================
// SUPABASE CLIENT
// ============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ============================================
// TYPES
// ============================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId?: string;
  organizationRole?: string;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  requestId?: string;
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Verify JWT and attach user to request
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Generate request ID for tracing
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Bypass auth for local development
  if (BYPASS_AUTH) {
    req.user = {
      id: 'dev-user-id',
      email: 'dev@localhost',
      permissions: ['*'],
    };
    return next();
  }

  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        requestId: req.requestId
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      await logSecurityEvent('login_failure', null, req, {
        reason: error?.message || 'Invalid token',
      });
      
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        requestId: req.requestId
      });
      return;
    }

    // Get user's organization membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role, permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // Build authenticated user object
    req.user = {
      id: user.id,
      email: user.email || '',
      organizationId: membership?.organization_id,
      organizationRole: membership?.role,
      permissions: membership?.permissions || [],
    };

    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Auth middleware error');
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: req.requestId
    });
  }
}

/**
 * Check if user has required permission
 */
export function requirePermission(permission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Wildcard permission (dev mode)
    if (req.user.permissions.includes('*')) {
      return next();
    }

    // Owner and admin have all permissions
    if (req.user.organizationRole === 'owner' || req.user.organizationRole === 'admin') {
      return next();
    }

    // Check specific permission
    if (req.user.permissions.includes(permission)) {
      return next();
    }

    // Check permission in database
    if (req.user.organizationId) {
      const { data } = await supabase.rpc('user_has_permission', {
        p_user_id: req.user.id,
        p_organization_id: req.user.organizationId,
        p_permission: permission,
      });

      if (data === true) {
        return next();
      }
    }

    await logSecurityEvent('permission_denied', req.user.id, req, {
      required_permission: permission,
    });

    res.status(403).json({ 
      error: 'Forbidden',
      message: `Missing required permission: ${permission}`,
      requestId: req.requestId
    });
  };
}

/**
 * Check organization quota before allowing action
 */
export function checkQuota(resourceType: string, increment: number = 1) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.organizationId) {
      // No org = use personal limits (more restrictive)
      return next();
    }

    try {
      const { data, error } = await supabase.rpc('check_org_quota', {
        p_organization_id: req.user.organizationId,
        p_resource_type: resourceType,
        p_increment: increment,
      });

      if (error) {
        logger.error({ error, requestId: req.requestId }, 'Quota check failed');
        return next(); // Fail open for now, log error
      }

      if (!data.allowed) {
        await logSecurityEvent('rate_limit_exceeded', req.user.id, req, {
          resource_type: resourceType,
          current: data.current,
          limit: data.limit,
        });

        res.status(429).json({
          error: 'Quota exceeded',
          message: `You have reached the limit for ${data.resource}`,
          current: data.current,
          limit: data.limit,
          requestId: req.requestId
        });
        return;
      }

      next();
    } catch (err) {
      logger.error({ err, requestId: req.requestId }, 'Quota middleware error');
      next(); // Fail open
    }
  };
}

/**
 * Verify session ownership - sessions must be owned by the requesting user
 */
export async function verifySessionOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.params.sessionId;
  
  if (!sessionId) {
    return next();
  }

  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { data: session, error } = await supabase
      .from('preview_sessions')
      .select('user_id, organization_id')
      .eq('session_token', sessionId)
      .single();

    if (error || !session) {
      res.status(404).json({ 
        error: 'Session not found',
        requestId: req.requestId
      });
      return;
    }

    // Check ownership
    if (session.user_id !== req.user.id) {
      // Check if user is admin of the org that owns the session
      if (session.organization_id && req.user.organizationId === session.organization_id) {
        if (req.user.organizationRole === 'owner' || req.user.organizationRole === 'admin') {
          return next();
        }
      }

      await logSecurityEvent('suspicious_activity', req.user.id, req, {
        reason: 'Attempted to access another user\'s session',
        session_id: sessionId,
        session_owner: session.user_id,
      });

      res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have access to this session',
        requestId: req.requestId
      });
      return;
    }

    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Session ownership check failed');
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================
// SECURITY EVENT LOGGING
// ============================================

async function logSecurityEvent(
  eventType: string,
  userId: string | null,
  req: AuthenticatedRequest,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      user_id: userId,
      user_email: req.user?.email,
      organization_id: req.user?.organizationId,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'],
      details: {
        ...details,
        request_id: req.requestId,
        path: req.path,
        method: req.method,
      },
      risk_level: getRiskLevel(eventType),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to log security event');
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function getRiskLevel(eventType: string): string {
  const highRisk = ['suspicious_activity', 'permission_denied', 'login_failure'];
  const mediumRisk = ['rate_limit_exceeded', 'mfa_challenge_failure'];
  
  if (highRisk.includes(eventType)) return 'high';
  if (mediumRisk.includes(eventType)) return 'medium';
  return 'low';
}

// ============================================
// API KEY AUTHENTICATION
// ============================================

export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return authMiddleware(req, res, next); // Fall back to JWT auth
  }

  try {
    // Hash the key for lookup
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { data: key, error } = await supabase
      .from('api_keys')
      .select('id, user_id, organization_id, scopes, status, rate_limit_per_minute')
      .eq('key_hash', keyHash)
      .eq('status', 'active')
      .single();

    if (error || !key) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
      return;
    }

    // Check if key is expired
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('expires_at')
      .eq('id', key.id)
      .single();

    if (keyData?.expires_at && new Date(keyData.expires_at) < new Date()) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'API key has expired'
      });
      return;
    }

    // Update last used
    await supabase
      .from('api_keys')
      .update({ 
        last_used_at: new Date().toISOString(),
        last_used_ip: getClientIp(req),
      })
      .eq('id', key.id);
    
    // Increment total_requests separately using RPC (ignore errors - optional tracking)
    try {
      await supabase.rpc('increment_api_key_requests', { key_id: key.id });
    } catch {
      // RPC may not exist - this is optional tracking
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', key.user_id)
      .single();

    req.user = {
      id: key.user_id,
      email: user?.email || '',
      organizationId: key.organization_id,
      permissions: key.scopes || [],
    };

    next();
  } catch (err) {
    logger.error({ err }, 'API key auth error');
    res.status(500).json({ error: 'Internal server error' });
  }
}
