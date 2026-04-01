/**
 * LaunchContext - Provides launch state across the app
 * 
 * Makes LaunchState (from SystemLauncher) available to:
 * - WebBuilder (for preview configuration)
 * - VFSPreview (for Sandpack file generation)
 * - SystemLauncher (for multi-step wizard state)
 * - AI panels (for context about the current launch)
 * 
 * This context bridges the gap between multiple preview truths by providing
 * a single source for launch metadata and VFS files.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { LaunchState, LaunchContextType } from '@/types/launchState';

// ============================================================================
// Context Creation
// ============================================================================

const LaunchContext = createContext<LaunchContextType | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface LaunchProviderProps {
  children: ReactNode;
}

export const LaunchProvider: React.FC<LaunchProviderProps> = ({ children }) => {
  const [launch, setLaunchState] = useState<LaunchState | null>(null);

  const value: LaunchContextType = {
    launch,
    setLaunch: setLaunchState,
    updateLaunch: (updates) => {
      setLaunchState((prev) => (prev ? { ...prev, ...updates } : null));
    },
    isFreshLaunch: !!launch && !!launch.createdAt,
    clearLaunch: () => setLaunchState(null),
  };

  return (
    <LaunchContext.Provider value={value}>
      {children}
    </LaunchContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Use launch state anywhere in the app
 * 
 * Returns null if no active launch (not in LaunchProvider or launch not started)
 * Use in components that need to know about the current launch context.
 */
export function useLaunch(): LaunchContextType {
  const ctx = useContext(LaunchContext);
  if (!ctx) {
    // Return a neutral context instead of throwing - allows optional usage
    return {
      launch: null,
      setLaunch: () => {},
      updateLaunch: () => {},
      isFreshLaunch: false,
      clearLaunch: () => {},
    };
  }
  return ctx;
}

/**
 * Strict hook - throws if LaunchContext is not available
 * Use in components that REQUIRE launch state
 */
export function useLaunchRequired(): LaunchContextType {
  const ctx = useContext(LaunchContext);
  if (!ctx) {
    throw new Error('useLaunchRequired() must be used inside <LaunchProvider>');
  }
  return ctx;
}

export default LaunchContext;
