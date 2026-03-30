/**
 * Audit Logging Service
 * 
 * Provides enterprise-grade audit logging for tracking user actions,
 * security events, and compliance requirements.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================
// TYPES
// ============================================

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'export' 
  | 'share' 
  | 'login' 
  | 'logout'
  | 'invite'
  | 'permission_change'
  | 'settings_change'
  | 'preview_start'
  | 'preview_stop'
  | 'publish'
  | 'deploy';

export type ResourceType = 
  | 'project' 
  | 'task' 
  | 'file' 
  | 'folder' 
  | 'user' 
  | 'organization'
  | 'preview_session'
  | 'template'
  | 'workflow'
  | 'lead'
  | 'contact'
  | 'api_key'
  | 'environment';

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  resourceName?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  userId?: string;
  organizationId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  id: string;
  user_id: string;
  user_email: string;
  organization_id: string;
  action: AuditAction;
  resource_type: ResourceType;
  resource_id: string;
  resource_name: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  metadata: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure' | 'warning';
  created_at: string;
}

// ============================================
// AUDIT LOGGER CLASS
// ============================================

class AuditLogger {
  private requestId: string | null = null;
  private sessionId: string | null = null;

  /**
   * Set request context for correlation
   */
  setContext(requestId: string, sessionId?: string) {
    this.requestId = requestId;
    this.sessionId = sessionId || null;
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Audit log attempted without authenticated user');
        return;
      }

      // Get user's primary organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        organization_id: membership?.organization_id,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        resource_name: entry.resourceName,
        changes: entry.changes,
        metadata: {
          ...entry.metadata,
          request_id: this.requestId,
          session_id: this.sessionId,
        },
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        status: 'success',
      });
    } catch (error) {
      // Don't throw - audit logging should never break the app
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    eventType: string,
    details: Record<string, unknown>,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get user's primary organization
      let organizationId: string | null = null;
      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();
        organizationId = membership?.organization_id || null;
      }

      await supabase.from('security_events').insert({
        event_type: eventType,
        user_id: user?.id,
        user_email: user?.email,
        organization_id: organizationId,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        details: {
          ...details,
          request_id: this.requestId,
        },
        risk_level: riskLevel,
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Query audit logs (admin only)
   */
  async queryLogs(filters: AuditLogFilters): Promise<AuditLogResult[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []) as AuditLogResult[];
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const auditLogger = new AuditLogger();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a diff of changed fields between old and new objects
 */
export function createChangesDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // Simple comparison (deep comparison could be added for objects)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { old: oldValue, new: newValue };
    }
  }

  return changes;
}

/**
 * Wrap an async function with audit logging
 */
export function withAuditLog<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  getAuditEntry: (...args: Parameters<T>) => AuditLogEntry
): T {
  return (async (...args: Parameters<T>) => {
    const entry = getAuditEntry(...args);
    const result = await fn(...args);
    await auditLogger.log(entry);
    return result;
  }) as T;
}
