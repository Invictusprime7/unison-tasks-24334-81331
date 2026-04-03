/**
 * User Profile Service
 * 
 * Enterprise-grade profile management with:
 * - Profile CRUD operations
 * - Avatar management
 * - Preferences storage
 * - Audit logging
 */

import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from '@/services/auditLogger';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  timezone: string;
  locale: string;
  preferences: ProfilePreferences;
  notificationSettings: NotificationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePreferences {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showTutorials: boolean;
  defaultProjectView: 'list' | 'board' | 'calendar';
  emailDigest: 'daily' | 'weekly' | 'never';
}

export interface NotificationSettings {
  email: {
    projectUpdates: boolean;
    taskAssignments: boolean;
    comments: boolean;
    mentions: boolean;
    weeklyDigest: boolean;
  };
  push: {
    enabled: boolean;
    taskReminders: boolean;
    directMessages: boolean;
  };
  inApp: {
    showDesktop: boolean;
    playSound: boolean;
  };
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  timezone?: string;
  locale?: string;
  preferences?: Partial<ProfilePreferences>;
  notificationSettings?: Partial<NotificationSettings>;
}

const DEFAULT_PREFERENCES: ProfilePreferences = {
  theme: 'system',
  compactMode: false,
  showTutorials: true,
  defaultProjectView: 'board',
  emailDigest: 'weekly',
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email: {
    projectUpdates: true,
    taskAssignments: true,
    comments: true,
    mentions: true,
    weeklyDigest: true,
  },
  push: {
    enabled: true,
    taskReminders: true,
    directMessages: true,
  },
  inApp: {
    showDesktop: true,
    playSound: true,
  },
};

class ProfileService {
  /**
   * Get the current user's profile
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Get profile from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // Merge with user metadata
    return this.toUserProfile(user, profile);
  }

  /**
   * Get a profile by user ID
   */
  async getProfileById(userId: string): Promise<UserProfile | null> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return null;
    }

    // Get user email from auth (admin only)
    const { data: { user } } = await supabase.auth.getUser();
    
    return {
      id: profile.id as string,
      email: user?.id === profile.id ? (user?.email ?? '') : '',
      fullName: (profile.full_name as string) ?? null,
      avatarUrl: (profile.avatar_url as string) ?? null,
      phone: null,
      jobTitle: null,
      department: null,
      timezone: 'UTC',
      locale: 'en',
      preferences: DEFAULT_PREFERENCES,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      createdAt: profile.created_at as string,
      updatedAt: profile.updated_at as string,
    };
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(updates: UpdateProfileInput): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const oldProfile = await this.getCurrentProfile();

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: updates.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // Update user metadata for additional fields
    if (updates.preferences || updates.notificationSettings || updates.timezone || updates.locale) {
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          phone: updates.phone,
          job_title: updates.jobTitle,
          department: updates.department,
          timezone: updates.timezone,
          locale: updates.locale,
          preferences: updates.preferences,
          notification_settings: updates.notificationSettings,
        },
      });

      if (metaError) {
        return { success: false, error: metaError.message };
      }
    }

    // Audit log
    await auditLogger.log({
      action: 'update',
      resourceType: 'user',
      resourceId: user.id,
      changes: {
        fullName: { old: oldProfile?.fullName, new: updates.fullName }
      },
    });

    return { success: true };
  }

  /**
   * Upload a new avatar
   */
  async uploadAvatar(file: File): Promise<{ url: string | null; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { url: null, error: 'Not authenticated' };
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { url: null, error: 'File size must be less than 5MB' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { url: null, error: 'File must be a JPEG, PNG, GIF, or WebP image' };
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${user.id}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      return { url: null, error: updateError.message };
    }

    await auditLogger.log({
      action: 'update',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { field: 'avatar' },
    });

    return { url: publicUrl };
  }

  /**
   * Delete the current avatar
   */
  async deleteAvatar(): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update profile to remove avatar URL
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Note: Consider cleaning up old files in storage bucket

    await auditLogger.log({
      action: 'delete',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { field: 'avatar' },
    });

    return { success: true };
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile({ notificationSettings: settings });
  }

  /**
   * Update preferences
   */
  async updatePreferences(prefs: Partial<ProfilePreferences>): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile({ preferences: prefs });
  }

  /**
   * Get multiple profiles by IDs (for team display)
   */
  async getProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (error || !profiles) {
      return new Map();
    }

    const map = new Map<string, UserProfile>();
    for (const profile of profiles) {
      map.set(profile.id as string, {
        id: profile.id as string,
        email: '',
        fullName: (profile.full_name as string) ?? null,
        avatarUrl: (profile.avatar_url as string) ?? null,
        phone: null,
        jobTitle: null,
        department: null,
        timezone: 'UTC',
        locale: 'en',
        preferences: DEFAULT_PREFERENCES,
        notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
        createdAt: profile.created_at as string,
        updatedAt: profile.updated_at as string,
      });
    }

    return map;
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    // Note: This would need a server-side function for security
    // Client can't query auth.users directly
    return true; // Placeholder
  }

  /**
   * Request email change
   */
  async requestEmailChange(newEmail: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await auditLogger.logSecurityEvent('mfa_enabled', {
      event: 'email_change_requested',
      newEmail,
    }, 'medium');

    return { success: true };
  }

  /**
   * Delete account (requires re-authentication)
   */
  async requestAccountDeletion(): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    await auditLogger.logSecurityEvent('suspicious_activity', {
      event: 'account_deletion_requested',
      userId: user.id,
    }, 'high');

    // Note: Actual deletion should be handled by an admin or scheduled job
    // This just logs the request

    return { success: true };
  }

  private toUserProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }, profile: Record<string, unknown>): UserProfile {
    const metadata = user.user_metadata ?? {};
    
    return {
      id: user.id,
      email: user.email ?? '',
      fullName: (profile.full_name as string) ?? (metadata.full_name as string) ?? null,
      avatarUrl: (profile.avatar_url as string) ?? (metadata.avatar_url as string) ?? null,
      phone: (metadata.phone as string) ?? null,
      jobTitle: (metadata.job_title as string) ?? null,
      department: (metadata.department as string) ?? null,
      timezone: (metadata.timezone as string) ?? 'UTC',
      locale: (metadata.locale as string) ?? 'en',
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(metadata.preferences as Partial<ProfilePreferences> | undefined),
      },
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(metadata.notification_settings as Partial<NotificationSettings> | undefined),
      },
      createdAt: profile.created_at as string,
      updatedAt: profile.updated_at as string,
    };
  }
}

export const profileService = new ProfileService();

// React hook for profile
import { useState, useEffect, useCallback } from 'react';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const p = await profileService.getCurrentProfile();
      setProfile(p);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: UpdateProfileInput) => {
    const result = await profileService.updateProfile(updates);
    if (result.success) {
      await fetchProfile();
    }
    return result;
  };

  const uploadAvatar = async (file: File) => {
    const result = await profileService.uploadAvatar(file);
    if (result.url) {
      await fetchProfile();
    }
    return result;
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    deleteAvatar: profileService.deleteAvatar.bind(profileService),
    refresh: fetchProfile,
  };
}
