/**
 * @deprecated This file is deprecated and should not be used.
 * 
 * All server-side operations should now be handled via Edge Functions:
 * - User management: Use Supabase Auth directly
 * - Admin operations: Use the 'builder-actions' edge function
 * - Lead creation: Use the 'create-lead' edge function
 * - Booking management: Use the 'create-booking' edge function
 * 
 * See src/runtime/intentRouter.ts for the intent-based routing system.
 * 
 * SECURITY WARNING: This file attempted to use service role keys in the frontend,
 * which is a critical security vulnerability. Never use service role keys in
 * client-side code.
 */

console.warn(
  '[DEPRECATED] supabaseAdminService.ts is deprecated. ' +
  'Use Edge Functions via intentRouter.ts instead. ' +
  'See: src/runtime/intentRouter.ts'
);

// Export empty stubs to prevent import errors
export class UserManagementService {
  static async createUserWithRole() {
    throw new Error('Deprecated: Use Supabase Auth directly');
  }
}

export class AITemplateService {
  static async saveTemplate() {
    throw new Error('Deprecated: Use Edge Functions instead');
  }
}

export class FileManagementService {
  static async uploadFile() {
    throw new Error('Deprecated: Use Supabase Storage with anon key');
  }
}

export class AnalyticsService {
  static async getMetrics() {
    throw new Error('Deprecated: Use Edge Functions instead');
  }
}

export class SystemMaintenanceService {
  static async cleanupOldData() {
    throw new Error('Deprecated: Use Edge Functions instead');
  }
}
