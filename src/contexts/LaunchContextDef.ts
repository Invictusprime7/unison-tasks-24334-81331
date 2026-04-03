/**
 * LaunchContext Definition
 * 
 * Creates and exports the React context for launch state management.
 * Separated from LaunchContext.tsx to comply with react-refresh/only-export-components rule.
 */

import { createContext } from 'react';
import type { LaunchContextType } from '@/types/launchState';

export const LaunchContext = createContext<LaunchContextType | null>(null);
