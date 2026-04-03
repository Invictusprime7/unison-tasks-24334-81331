/**
 * @deprecated This file is deprecated and should not be used directly.
 * 
 * All admin operations should now be handled via Edge Functions:
 * - Use 'builder-actions' edge function for pack installation and wiring
 * - Use 'create-lead' edge function for lead creation
 * - Use 'create-booking' edge function for booking management
 * - Use Supabase Auth for user authentication
 * 
 * See src/runtime/intentRouter.ts for the intent-based routing system.
 */

import { supabase } from "@/integrations/supabase/client";
import { handleIntent, INTENT_PACKS } from "@/runtime/intentRouter";

// Deprecation warning
console.warn(
  '[DEPRECATED] adminApi.ts is deprecated. ' +
  'Use Edge Functions via intentRouter.ts instead.'
);

/**
 * New recommended API: Use Intent Router for all actions
 */
export const IntentAPI = {
  // Execute an intent
  async executeIntent(intent: string, payload: Record<string, unknown>) {
    return handleIntent(intent, payload);
  },

  // Get available intents
  getAvailableIntents() {
    return INTENT_PACKS;
  },

  // Install a pack via builder-actions
  async installPack(packName: 'leads' | 'booking' | 'auth', businessId: string) {
    const { data, error } = await supabase.functions.invoke('builder-actions', {
      body: {
        businessId,
        actions: [{ type: 'install_pack', pack: packName }]
      }
    });

    if (error) throw error;
    return data;
  },

  // Wire a button to an intent
  async wireButton(selector: string, intent: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('builder-actions', {
      body: {
        actions: [{
          type: 'wire_button',
          selector,
          intent,
          payload
        }]
      }
    });

    if (error) throw error;
    return data;
  },

  // Get pack status
  async getPackStatus() {
    const { data, error } = await supabase.functions.invoke('builder-actions', {
      body: {
        actions: [{ type: 'get_pack_status' }]
      }
    });

    if (error) throw error;
    return data;
  }
};

/**
 * Legacy compatibility exports - all throw deprecation errors
 */

// User Management API (deprecated - use Supabase Auth directly)
export const adminUserApi = {
  createUserWithRole: async () => {
    throw new Error('Deprecated: Use supabase.auth.signUp() directly');
  },
  getUsersWithPagination: async () => {
    throw new Error('Deprecated: Use Edge Functions for admin operations');
  },
  updateUserRole: async () => {
    throw new Error('Deprecated: Use Edge Functions for admin operations');
  },
  deleteUser: async () => {
    throw new Error('Deprecated: Use Edge Functions for admin operations');
  },
};

// Template API (deprecated - use AI code assistant)
export const adminTemplateApi = {
  getAnalytics: async () => {
    throw new Error('Deprecated: Use Edge Functions');
  },
  listAll: async () => {
    throw new Error('Deprecated: Query templates table directly');
  },
  updateStatus: async () => {
    throw new Error('Deprecated: Update templates table directly');
  },
};

// File Management API (deprecated - use Supabase Storage)
export const adminFileApi = {
  uploadSystemAsset: async () => {
    throw new Error('Deprecated: Use Supabase Storage directly');
  },
  cleanupOrphanedFiles: async () => {
    throw new Error('Deprecated: Use Edge Functions');
  },
  generateBulkDownloadUrls: async () => {
    throw new Error('Deprecated: Use Edge Functions');
  },
};

// Analytics API (deprecated)
export const adminAnalyticsApi = {
  getDashboard: async () => {
    throw new Error('Deprecated: Use Edge Functions');
  },
  getUserActivity: async () => {
    throw new Error('Deprecated: Use Edge Functions');
  },
};

// System Maintenance API (deprecated)
export const adminMaintenanceApi = {
  healthCheck: async () => {
    throw new Error('Deprecated: Use Edge Functions');
  },
  cleanupSessions: async () => {
    throw new Error('Deprecated: Use Edge Functions');
  },
};

// Default export for backwards compatibility
export default IntentAPI;
