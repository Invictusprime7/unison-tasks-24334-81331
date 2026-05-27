/**
 * CLOUD CONTEXT - Centralized state management for Unison Cloud
 * 
 * Provides unified access to:
 * - User profile and preferences
 * - Organizations and businesses
 * - Teams and members
 * - Security settings
 * - Real-time updates via Supabase subscriptions
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase as _sb } from '@/integrations/supabase/client';
const supabase: any = _sb;
import { User } from '@supabase/supabase-js';
import { profileService, type UserProfile } from '@/services/profileService';
import { teamService, type Organization, type TeamMember, type TeamInvitation } from '@/services/teamService';
import { useToast } from '@/hooks/use-toast';
import {
  CloudContext,
  type CloudOrganization,
  type CloudSession,
  type CloudLoginEvent,
  type CloudUsageStats,
  type CloudSecurityStatus,
  type CloudContextType,
} from './CloudContextDef';

// Re-export types for backward compatibility
export type {
  CloudOrganization,
  CloudSession,
  CloudLoginEvent,
  CloudUsageStats,
  CloudSecurityStatus,
} from './CloudContextDef';

// Plan limits for usage calculations
const PLAN_LIMITS = {
  free: { members: 5, projects: 10, storage: 1, apiCalls: 1000 },
  pro: { members: 15, projects: 50, storage: 10, apiCalls: 10000 },
  team: { members: 50, projects: 200, storage: 50, apiCalls: 50000 },
  enterprise: { members: 500, projects: 2000, storage: 500, apiCalls: 500000 },
};

const isMissingTableError = (message?: string | null) => {
  if (!message) return false;
  return message.includes("Could not find the table") || message.includes("schema cache");
};

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  
  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Organization state
  const [organizations, setOrganizations] = useState<CloudOrganization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<CloudOrganization | null>(null);
  
  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<CloudContextType['currentUserRole']>(null);
  
  // Security state
  const [sessions, setSessions] = useState<CloudSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<CloudLoginEvent[]>([]);
  const [securityStatus, setSecurityStatus] = useState<CloudSecurityStatus | null>(null);
  
  // Usage state
  const [usageStats, setUsageStats] = useState<CloudUsageStats | null>(null);
  const [hasOrganizationMembersTable, setHasOrganizationMembersTable] = useState(true);
  const optionalSecurityTablesRef = useRef<{ userSessions: boolean | null; loginHistory: boolean | null }>({
    userSessions: null,
    loginHistory: null,
  });

  const loadOwnedOrganizationsFallback = useCallback(async () => {
    if (!user) return;

    const { data: ownedOrganizations, error: ownedError } = await supabase
      .from('organizations' as any)
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.warn('[CloudProvider] organizations fallback query failed:', ownedError.message);
      setOrganizations([]);
      return;
    }

    const fallbackOrgs: CloudOrganization[] = (ownedOrganizations || []).map((org: any) => {
      const billing = org.billing as any || {};
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logoUrl: org.logo,
        website: org.website,
        industry: org.industry,
        size: org.size,
        ownerId: org.owner_id,
        plan: billing.plan || 'free',
        memberCount: org.member_count || 0,
        projectCount: org.project_count || 0,
        storageUsed: org.storage_used || 0,
        status: org.status || 'active',
        createdAt: org.created_at,
        updatedAt: org.updated_at,
      };
    });

    setOrganizations(fallbackOrgs);
    if (!currentOrganization && fallbackOrgs.length > 0) {
      setCurrentOrganization(fallbackOrgs[0]);
    }
  }, [currentOrganization, user]);

  // Fetch user profile
  const refreshProfile = useCallback(async () => {
    try {
      const userProfile = await profileService.getCurrentProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  // Fetch organizations
  const refreshOrganizations = useCallback(async () => {
    if (!user) return;
    
    try {
      if (!hasOrganizationMembersTable) {
        await loadOwnedOrganizationsFallback();
        return;
      }

      const { data: memberships, error: memberError } = await supabase
        .from('organization_members' as any)
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            slug,
            description,
            logo,
            website,
            industry,
            size,
            owner_id,
            status,
            billing,
            member_count,
            project_count,
            storage_used,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memberError) {
        // Fallback for environments where membership join path is unavailable
        // due to missing tables, relationship issues, or RLS/proxy errors.
        setHasOrganizationMembersTable(false);
        console.warn('[CloudProvider] organization_members query failed, switching to organizations fallback:', memberError.message);
        await loadOwnedOrganizationsFallback();
        return;
      }

      setHasOrganizationMembersTable(true);

      const orgs: CloudOrganization[] = (memberships || [])
        .filter((m: any) => m.organizations)
        .map((m: any) => {
          const org = m.organizations as any;
          const billing = org.billing as any || {};
          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            description: org.description,
            logoUrl: org.logo,
            website: org.website,
            industry: org.industry,
            size: org.size,
            ownerId: org.owner_id,
            plan: billing.plan || 'free',
            memberCount: org.member_count || 0,
            projectCount: org.project_count || 0,
            storageUsed: org.storage_used || 0,
            status: org.status || 'active',
            createdAt: org.created_at,
            updatedAt: org.updated_at,
          };
        });

      setOrganizations(orgs);

      // Auto-select first organization if none selected
      if (!currentOrganization && orgs.length > 0) {
        setCurrentOrganization(orgs[0]);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  }, [user, hasOrganizationMembersTable, loadOwnedOrganizationsFallback]);

  // Fetch team members for current organization
  const refreshTeam = useCallback(async () => {
    if (!user || !currentOrganization) return;

    try {
      // Fetch members
      const { data: members, error: membersError } = await supabase
        .from('organization_members' as any)
        .select(`
          id,
          user_id,
          role,
          title,
          department,
          is_active,
          joined_at,
          invited_by,
          profiles!organization_members_user_id_fkey (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      if (membersError) {
        if (isMissingTableError(membersError.message)) {
          setHasOrganizationMembersTable(false);
          setTeamMembers([]);
          setInvitations([]);
          setCurrentUserRole(null);
          return;
        }
        throw membersError;
      }

      setHasOrganizationMembersTable(true);

      const teamMembersList: TeamMember[] = (members || []).map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        organizationId: currentOrganization.id,
        email: (m.profiles as any)?.email || '',
        fullName: (m.profiles as any)?.full_name || null,
        avatarUrl: (m.profiles as any)?.avatar_url || null,
        role: m.role as TeamMember['role'],
        title: m.title,
        department: m.department,
        isActive: m.is_active,
        joinedAt: m.joined_at,
        invitedBy: m.invited_by,
        lastActiveAt: null,
      }));

      setTeamMembers(teamMembersList);

      // Set current user's role
      const currentMember = teamMembersList.find(m => m.userId === user.id);
      setCurrentUserRole(currentMember?.role || null);

      // Fetch invitations
      const { data: invites, error: invitesError } = await supabase
        .from('team_invitations' as any)
        .select(`
          id,
          organization_id,
          email,
          role,
          invited_by,
          expires_at,
          status,
          created_at,
          inviter:profiles!team_invitations_invited_by_fkey (
            full_name
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending');

      if (!invitesError && invites) {
        setInvitations(invites.map((inv: any) => ({
          id: inv.id,
          organizationId: inv.organization_id,
          email: inv.email,
          role: inv.role as TeamInvitation['role'],
          invitedBy: inv.invited_by,
          inviterName: (inv.inviter as any)?.full_name || 'Unknown',
          expiresAt: inv.expires_at,
          status: inv.status as TeamInvitation['status'],
          createdAt: inv.created_at,
        })));
      }

      // Calculate usage stats
      const limits = PLAN_LIMITS[currentOrganization.plan];
      setUsageStats({
        members: { current: teamMembersList.length, limit: limits.members },
        projects: { current: currentOrganization.projectCount, limit: limits.projects },
        storage: { current: currentOrganization.storageUsed / (1024 * 1024 * 1024), limit: limits.storage },
        apiCalls: { current: 0, limit: limits.apiCalls }, // Would come from analytics
      });

    } catch (error) {
      console.error('Error loading team:', error);
    }
  }, [user, currentOrganization]);

  // Fetch security data
  const refreshSecurity = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch active sessions (table may not exist yet â€” graceful fallback)
      let sessionsData: any[] | null = null;
      if (optionalSecurityTablesRef.current.userSessions !== false) {
        try {
          const { data, error } = await supabase
            .from('user_sessions' as any)
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('last_active', { ascending: false });
          if (!error) {
            sessionsData = data;
            optionalSecurityTablesRef.current.userSessions = true;
          } else {
            optionalSecurityTablesRef.current.userSessions = false;
          }
        } catch {
          optionalSecurityTablesRef.current.userSessions = false;
        }
      }

      if (sessionsData) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        setSessions(sessionsData.map((s: any) => ({
          id: s.id,
          device: s.device_name || 'Unknown Device',
          browser: s.browser || 'Unknown Browser',
          location: s.location || 'Unknown Location',
          ipAddress: s.ip_address || 'Unknown',
          lastActive: new Date(s.last_active),
          isCurrent: s.session_id === currentSession?.access_token?.substring(0, 50),
          userAgent: s.user_agent || '',
        })));
      }

      // Fetch login history (table may not exist yet â€” graceful fallback)
      let historyData: any[] | null = null;
      if (optionalSecurityTablesRef.current.loginHistory !== false) {
        try {
          const { data, error } = await supabase
            .from('login_history' as any)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
          if (!error) {
            historyData = data;
            optionalSecurityTablesRef.current.loginHistory = true;
          } else {
            optionalSecurityTablesRef.current.loginHistory = false;
          }
        } catch {
          optionalSecurityTablesRef.current.loginHistory = false;
        }
      }

      if (historyData) {
        setLoginHistory(historyData.map((h: any) => ({
          id: h.id,
          type: h.success ? 'success' : (h.blocked ? 'blocked' : 'failed'),
          device: h.device_name || 'Unknown',
          location: h.location || 'Unknown',
          ipAddress: h.ip_address || 'Unknown',
          timestamp: new Date(h.created_at),
          reason: h.failure_reason,
        })));
      }

      // Get profile for security status
      let extProfile: any = null;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        extProfile = profileData;
      } catch { /* profiles query failed */ }

      // Check MFA status via Supabase Auth API
      let twoFactorEnabled = extProfile?.two_factor_enabled || false;
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors?.totp?.some((f: any) => f.status === 'verified')) {
          twoFactorEnabled = true;
        }
      } catch { /* MFA not available */ }

      const failedLogins = (historyData || []).filter((h: any) => !h.success).length;

      setSecurityStatus({
        passwordStrength: 'good',
        twoFactorEnabled,
        lastPasswordChange: extProfile?.last_password_change ? new Date(extProfile.last_password_change) : null,
        activeSessions: sessionsData?.length || 1,
        recentFailedLogins: failedLogins,
      });

    } catch (error) {
      console.error('Error loading security data:', error);
    }
  }, [user]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshProfile(),
        refreshOrganizations(),
      ]);
      // Team and security depend on organization
      await refreshTeam();
      await refreshSecurity();
    } finally {
      setIsLoading(false);
    }
  }, [refreshProfile, refreshOrganizations, refreshTeam, refreshSecurity]);

  // Organization actions
  const createOrganization = useCallback(async (name: string, slug: string): Promise<CloudOrganization | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('organizations' as any)
        .insert({
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          owner_id: user.id,
          status: 'active',
          billing: { plan: 'free' },
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as member
      const { error: memberInsertError } = await supabase
        .from('organization_members' as any)
        .insert({
          organization_id: data.id,
          user_id: user.id,
          role: 'owner',
          is_active: true,
        });

      if (memberInsertError && !isMissingTableError(memberInsertError.message)) {
        throw memberInsertError;
      }

      toast({
        title: 'Organization Created',
        description: `${name} has been created successfully.`,
      });

      await refreshOrganizations();
      return data as unknown as CloudOrganization;

    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast, refreshOrganizations]);

  const updateOrganization = useCallback(async (id: string, updates: Partial<CloudOrganization>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('organizations' as any)
        .update({
          name: updates.name,
          description: updates.description,
          website: updates.website,
          industry: updates.industry,
          size: updates.size,
          logo: updates.logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Organization Updated',
        description: 'Changes saved successfully.',
      });

      await refreshOrganizations();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update organization',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshOrganizations]);

  const deleteOrganization = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('organizations' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Organization Deleted',
        description: 'Organization has been permanently deleted.',
      });

      if (currentOrganization?.id === id) {
        setCurrentOrganization(null);
      }

      await refreshOrganizations();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete organization',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshOrganizations, currentOrganization]);

  // Team actions
  const inviteMember = useCallback(async (email: string, role: TeamMember['role']): Promise<boolean> => {
    if (!user || !currentOrganization) return false;

    try {
      const { error } = await supabase
        .from('team_invitations' as any)
        .insert({
          organization_id: currentOrganization.id,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${email}`,
      });

      await refreshTeam();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, currentOrganization, toast, refreshTeam]);

  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('organization_members' as any)
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Member Removed',
        description: 'Team member has been removed.',
      });

      await refreshTeam();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshTeam]);

  const updateMemberRole = useCallback(async (memberId: string, role: TeamMember['role']): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('organization_members' as any)
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `Member role changed to ${role}.`,
      });

      await refreshTeam();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshTeam]);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('team_invitations' as any)
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation Cancelled',
        description: 'The invitation has been revoked.',
      });

      await refreshTeam();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel invitation',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshTeam]);

  const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      // Reset expiration date
      const { error } = await supabase
        .from('team_invitations' as any)
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token: crypto.randomUUID(), // Generate new token
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation Resent',
        description: 'A new invitation email has been sent.',
      });

      await refreshTeam();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshTeam]);

  // Security actions
  const revokeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Session Revoked',
        description: 'The session has been terminated.',
      });

      await refreshSecurity();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke session',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, refreshSecurity]);

  const revokeAllOtherSessions = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get current session to exclude it
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .neq('session_id', currentSession?.access_token?.substring(0, 50) || '');

      if (error) throw error;

      toast({
        title: 'Sessions Revoked',
        description: 'All other sessions have been terminated.',
      });

      await refreshSecurity();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke sessions',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, refreshSecurity]);

  const enableTwoFactor = useCallback(async (): Promise<{ qrCode: string; secret: string } | null> => {
    try {
      // Use Supabase native MFA enrollment
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      toast({
        title: '2FA Setup Started',
        description: 'Scan the QR code with your authenticator app.',
      });

      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      };

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enable 2FA',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const disableTwoFactor = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Unenroll all TOTP factors via Supabase native MFA
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const totpFactors = factors?.totp || [];
      for (const factor of totpFactors) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });
        if (unenrollError) throw unenrollError;
      }

      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled.',
      });

      await refreshSecurity();
      return true;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable 2FA',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, refreshSecurity]);

  // Store latest refreshAll in a ref so the init effect always calls the current version
  const refreshAllRef = React.useRef(refreshAll);
  React.useEffect(() => { refreshAllRef.current = refreshAll; }, [refreshAll]);

  // Initialize on mount
  useEffect(() => {
    let cancelled = false;

    const initCloud = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(authUser);

        if (authUser) {
          // Small delay to let state settle after setUser
          await new Promise(r => setTimeout(r, 0));
          if (!cancelled) await refreshAllRef.current();
        }
      } catch (error) {
        console.error('[CloudProvider] Init error:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initCloud();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (cancelled) return;
      setUser(session?.user || null);
      if (session?.user) {
        // Use ref to avoid stale closure
        refreshAllRef.current().catch(err => console.error('[CloudProvider] Auth refresh error:', err));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Refresh team when organization changes
  useEffect(() => {
    if (currentOrganization) {
      refreshTeam();
    }
  }, [currentOrganization?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !currentOrganization) return;

    // Subscribe to team member changes only when the table exists.
    const membersSubscription = hasOrganizationMembersTable
      ? supabase
          .channel('organization_members')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'organization_members',
              filter: `organization_id=eq.${currentOrganization.id}`,
            },
            () => refreshTeam()
          )
          .subscribe()
      : null;

    // Subscribe to invitation changes
    const invitationsSubscription = supabase
      .channel('team_invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_invitations',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        () => refreshTeam()
      )
      .subscribe();

    return () => {
      membersSubscription?.unsubscribe();
      invitationsSubscription.unsubscribe();
    };
  }, [user, currentOrganization?.id, refreshTeam, hasOrganizationMembersTable]);

  const value = useMemo<CloudContextType>(() => ({
    user,
    profile,
    isLoading,
    organizations,
    currentOrganization,
    setCurrentOrganization,
    teamMembers,
    invitations,
    currentUserRole,
    sessions,
    loginHistory,
    securityStatus,
    usageStats,
    refreshProfile,
    refreshOrganizations,
    refreshTeam,
    refreshSecurity,
    refreshAll,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
    cancelInvitation,
    resendInvitation,
    revokeSession,
    revokeAllOtherSessions,
    enableTwoFactor,
    disableTwoFactor,
  }), [
    user,
    profile,
    isLoading,
    organizations,
    currentOrganization,
    teamMembers,
    invitations,
    currentUserRole,
    sessions,
    loginHistory,
    securityStatus,
    usageStats,
    refreshProfile,
    refreshOrganizations,
    refreshTeam,
    refreshSecurity,
    refreshAll,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
    cancelInvitation,
    resendInvitation,
    revokeSession,
    revokeAllOtherSessions,
    enableTwoFactor,
    disableTwoFactor,
  ]);

  return (
    <CloudContext.Provider value={value}>
      {children}
    </CloudContext.Provider>
  );
}
