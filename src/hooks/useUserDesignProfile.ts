/**
 * User Design Profile Hook
 * 
 * Fetches user's saved projects (local + cloud) and builds a design profile
 * that Systems AI uses to generate personalized, style-matched websites.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  UserDesignProfile,
  buildUserDesignProfile,
  designProfileToPromptContext,
  extractDesignPatterns,
  DesignPattern,
} from '@/utils/designPatternExtractor';

// Local storage keys
const LOCAL_TEMPLATES_KEY = 'webbuilder_templates';
const PROFILE_CACHE_KEY = 'user_design_profile_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface SavedTemplate {
  id: string;
  name: string;
  canvas_data: {
    html: string;
    css?: string;
    previewCode?: string;
  };
  updated_at: string;
}

interface CachedProfile {
  profile: UserDesignProfile;
  cachedAt: number;
  projectIds: string[];
}

/**
 * Get local templates from browser storage
 */
function getLocalTemplates(): SavedTemplate[] {
  try {
    const stored = localStorage.getItem(LOCAL_TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get cached profile if still valid
 */
function getCachedProfile(projectIds: string[]): UserDesignProfile | null {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedProfile = JSON.parse(cached);
    const now = Date.now();

    // Check TTL
    if (now - parsed.cachedAt > CACHE_TTL_MS) {
      return null;
    }

    // Check if project list changed
    const currentIds = projectIds.sort().join(',');
    const cachedIds = parsed.projectIds.sort().join(',');
    if (currentIds !== cachedIds) {
      return null;
    }

    return parsed.profile;
  } catch {
    return null;
  }
}

/**
 * Save profile to cache
 */
function setCachedProfile(profile: UserDesignProfile, projectIds: string[]): void {
  try {
    const cached: CachedProfile = {
      profile,
      cachedAt: Date.now(),
      projectIds,
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

export interface UseUserDesignProfileResult {
  /** The user's design profile (null if not loaded or no projects) */
  profile: UserDesignProfile | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Number of projects analyzed */
  projectCount: number;
  /** Fetch/refresh the design profile */
  fetchProfile: () => Promise<UserDesignProfile | null>;
  /** Get prompt context for AI */
  getPromptContext: () => string | null;
  /** Clear cached profile */
  clearCache: () => void;
  /** Check if profile is ready for use */
  hasProfile: boolean;
}

/**
 * Hook to manage user design profile extraction and caching
 */
export function useUserDesignProfile(): UseUserDesignProfileResult {
  const [profile, setProfile] = useState<UserDesignProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectCount, setProjectCount] = useState(0);

  /**
   * Fetch all saved projects (local + cloud) and build design profile
   */
  const fetchProfile = useCallback(async (): Promise<UserDesignProfile | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get local templates
      const localTemplates = getLocalTemplates();
      
      // Get cloud templates if authenticated
      let cloudTemplates: SavedTemplate[] = [];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error: fetchError } = await supabase
          .from('design_templates')
          .select('id, name, canvas_data, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(50); // Limit to most recent 50 for performance

        if (fetchError) {
          console.warn('[useUserDesignProfile] Cloud fetch error:', fetchError);
        } else {
          cloudTemplates = (data || []).map(t => ({
            ...t,
            canvas_data: t.canvas_data as unknown as SavedTemplate['canvas_data'],
          }));
        }
      }

      // Combine all templates
      const allTemplates = [...localTemplates, ...cloudTemplates];
      const projectIds = allTemplates.map(t => t.id);
      setProjectCount(allTemplates.length);

      // Check cache first
      const cachedProfile = getCachedProfile(projectIds);
      if (cachedProfile) {
        console.log('[useUserDesignProfile] Using cached profile');
        setProfile(cachedProfile);
        setLoading(false);
        return cachedProfile;
      }

      // No projects = no profile
      if (allTemplates.length === 0) {
        console.log('[useUserDesignProfile] No saved projects found');
        setProfile(null);
        setLoading(false);
        return null;
      }

      // Extract HTML from templates
      const projectsWithHtml = allTemplates
        .filter(t => t.canvas_data?.html || t.canvas_data?.previewCode)
        .map(t => ({
          html: t.canvas_data.html || t.canvas_data.previewCode || '',
          name: t.name,
        }))
        .filter(p => p.html.length > 100); // Filter out empty/minimal templates

      if (projectsWithHtml.length === 0) {
        console.log('[useUserDesignProfile] No valid HTML content in saved projects');
        setProfile(null);
        setLoading(false);
        return null;
      }

      // Build design profile
      console.log(`[useUserDesignProfile] Building profile from ${projectsWithHtml.length} projects`);
      const newProfile = buildUserDesignProfile(projectsWithHtml);

      // Cache the result
      setCachedProfile(newProfile, projectIds);

      setProfile(newProfile);
      setLoading(false);
      return newProfile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build design profile';
      console.error('[useUserDesignProfile] Error:', err);
      setError(message);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Get AI prompt context from current profile
   */
  const getPromptContext = useCallback((): string | null => {
    if (!profile) return null;
    return designProfileToPromptContext(profile);
  }, [profile]);

  /**
   * Clear cached profile
   */
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      setProfile(null);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    projectCount,
    fetchProfile,
    getPromptContext,
    clearCache,
    hasProfile: profile !== null && profile.projectCount > 0,
  };
}

/**
 * Standalone function to get design profile for edge functions
 * Returns serializable data that can be passed to AI
 */
export async function getDesignProfileForAI(): Promise<{
  hasProfile: boolean;
  promptContext: string | null;
  projectCount: number;
  dominantStyle: string | null;
  industryHints: string[];
}> {
  try {
    // Get local templates
    const localTemplates = getLocalTemplates();

    // Get cloud templates if authenticated
    let cloudTemplates: SavedTemplate[] = [];
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('design_templates')
        .select('id, name, canvas_data, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (data) {
        cloudTemplates = data.map(t => ({
          ...t,
          canvas_data: t.canvas_data as unknown as SavedTemplate['canvas_data'],
        }));
      }
    }

    const allTemplates = [...localTemplates, ...cloudTemplates];

    if (allTemplates.length === 0) {
      return {
        hasProfile: false,
        promptContext: null,
        projectCount: 0,
        dominantStyle: null,
        industryHints: [],
      };
    }

    // Extract HTML
    const projectsWithHtml = allTemplates
      .filter(t => t.canvas_data?.html || t.canvas_data?.previewCode)
      .map(t => ({
        html: t.canvas_data.html || t.canvas_data.previewCode || '',
        name: t.name,
      }))
      .filter(p => p.html.length > 100);

    if (projectsWithHtml.length === 0) {
      return {
        hasProfile: false,
        promptContext: null,
        projectCount: 0,
        dominantStyle: null,
        industryHints: [],
      };
    }

    // Build profile
    const profile = buildUserDesignProfile(projectsWithHtml);

    return {
      hasProfile: true,
      promptContext: designProfileToPromptContext(profile),
      projectCount: profile.projectCount,
      dominantStyle: profile.dominantStyle,
      industryHints: profile.industryHints,
    };
  } catch (error) {
    console.error('[getDesignProfileForAI] Error:', error);
    return {
      hasProfile: false,
      promptContext: null,
      projectCount: 0,
      dominantStyle: null,
      industryHints: [],
    };
  }
}
