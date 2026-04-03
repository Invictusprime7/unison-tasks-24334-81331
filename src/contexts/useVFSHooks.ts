/**
 * VFS Context Hooks
 * 
 * Custom hooks for accessing VFS state.
 * Separated from VFSContext.tsx for Fast Refresh compatibility.
 */

import { useContext } from 'react';
import { VFSContext } from './VFSContext';

/**
 * Optional hook - returns null if not in VFSProvider
 */
export function useVFS() {
  return useContext(VFSContext);
}

/**
 * Required hook - throws if not in VFSProvider
 */
export function useVFSRequired() {
  const context = useContext(VFSContext);
  if (!context) {
    throw new Error('useVFSRequired must be used inside <VFSProvider>');
  }
  return context;
}
