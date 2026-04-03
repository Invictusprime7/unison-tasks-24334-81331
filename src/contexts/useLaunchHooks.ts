/**
 * Launch Context Hooks
 * 
 * Custom hooks for accessing launch state.
 * Separated from LaunchContext.tsx to comply with react-refresh/only-export-components rule.
 */

import { useContext } from 'react';
import type { LaunchContextType } from '@/types/launchState';
import { LaunchContext } from './LaunchContextDef';

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
