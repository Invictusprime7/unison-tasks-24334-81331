/**
 * Cloud Context Hooks
 * 
 * Custom hooks for accessing CloudContext state.
 * Separated from CloudContext.tsx for Fast Refresh compatibility.
 */

import { useContext } from 'react';
import { CloudContext } from './CloudContextDef';

// Hook to check if inside CloudProvider
export function useCloudContext() {
  return useContext(CloudContext);
}

export function useCloud() {
  const context = useContext(CloudContext);
  if (!context) {
    throw new Error('useCloud must be used within a CloudProvider');
  }
  return context;
}

/**
 * Strict hook - throws if CloudContext is not available
 * Alias for useCloud()
 */
export function useCloudRequired() {
  return useCloud();
}

// Safe version that returns null if not in provider
export function useCloudSafe() {
  return useContext(CloudContext);
}

// Convenience hooks for specific domains - with safe defaults
export function useCloudOrganizations() {
  const context = useContext(CloudContext);
  if (!context) {
    return { 
      organizations: [], 
      currentOrganization: null, 
      setCurrentOrganization: () => {}, 
      createOrganization: async () => null, 
      updateOrganization: async () => false, 
      deleteOrganization: async () => false, 
      refresh: async () => {}, 
      isLoading: false 
    };
  }
  const { organizations, currentOrganization, setCurrentOrganization, createOrganization, updateOrganization, deleteOrganization, refreshOrganizations, isLoading } = context;
  return { organizations, currentOrganization, setCurrentOrganization, createOrganization, updateOrganization, deleteOrganization, refresh: refreshOrganizations, isLoading };
}

export function useCloudTeam() {
  const context = useContext(CloudContext);
  if (!context) {
    return { 
      members: [], 
      invitations: [], 
      currentUserRole: null, 
      inviteMember: async () => false, 
      removeMember: async () => false, 
      updateMemberRole: async () => false, 
      cancelInvitation: async () => false, 
      resendInvitation: async () => false, 
      refresh: async () => {}, 
      isLoading: false, 
      usageStats: null 
    };
  }
  const { teamMembers, invitations, currentUserRole, inviteMember, removeMember, updateMemberRole, cancelInvitation, resendInvitation, refreshTeam, isLoading, usageStats } = context;
  return { members: teamMembers, invitations, currentUserRole, inviteMember, removeMember, updateMemberRole, cancelInvitation, resendInvitation, refresh: refreshTeam, isLoading, usageStats };
}

export function useCloudSecurity() {
  const context = useContext(CloudContext);
  if (!context) {
    return { 
      sessions: [], 
      loginHistory: [], 
      securityStatus: null, 
      revokeSession: async () => false, 
      revokeAllOtherSessions: async () => false, 
      enableTwoFactor: async () => null, 
      disableTwoFactor: async () => false, 
      refresh: async () => {}, 
      isLoading: false 
    };
  }
  const { sessions, loginHistory, securityStatus, revokeSession, revokeAllOtherSessions, enableTwoFactor, disableTwoFactor, refreshSecurity, isLoading } = context;
  return { sessions, loginHistory, securityStatus, revokeSession, revokeAllOtherSessions, enableTwoFactor, disableTwoFactor, refresh: refreshSecurity, isLoading };
}
