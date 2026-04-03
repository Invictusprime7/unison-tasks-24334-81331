/**
 * SimplePreview - Production Preview Component with ECS Runtime
 * 
 * A preview component that supports three modes:
 * 1. Runtime: ECS Vite container with true HMR (primary)
 * 2. Sandpack: Browser-based bundling (fallback)
 * 3. HTML: Static HTML conversion (last resort)
 * 
 * Features:
 * - ECS Vite runtime with real HMR via iframe
 * - Direct VirtualFileSystem → FileMap → Preview Session
 * - Automatic fallback to Sandpack/HTML when runtime unavailable
 * - Debounced file patching for live updates
 * - Session keepalive with 30-second pings
 * - Pre-bundled common dependencies for Sandpack fallback
 * - Tailwind CSS support via CDN
 */

import React, { useMemo, useState, forwardRef, useImperativeHandle, useCallback, useEffect, useRef } from 'react';
import { 
  SandpackProvider, 
  SandpackPreview,
  SandpackLayout,
  useSandpack,
  SandpackConsole
} from '@codesandbox/sandpack-react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Terminal, X, ChevronDown, ChevronUp, Code2, Globe, Server, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type FileMap,
  type PreviewSession,
  startPreviewSession,
  patchFile,
  stopPreviewSession,
  getCurrentSession,
  clearCurrentSession,
  ensureViteRootFiles,
} from '@/services/previewSession';
import { createCodeSandbox, openInCodeSandbox, type CodeSandboxSession } from '@/services/codesandbox';

// ============================================================================
// Types
// ============================================================================

type PreviewMode = 'runtime' | 'sandpack' | 'codesandbox' | 'html' | 'loading';

interface SimplePreviewProps {
  /** Files from VirtualFileSystem - Record<path, content> */
  files: Record<string, string>;
  /** Project ID for preview session */
  projectId?: string;
  /** Active file path for initial focus */
  activeFile?: string;
  /** Additional CSS class */
  className?: string;
  /** Callback when preview loads successfully */
  onReady?: () => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Show console panel */
  showConsole?: boolean;
  /** Show file navigator in preview */
  showNavigator?: boolean;
  /** Force a specific preview mode */
  forceMode?: 'runtime' | 'sandpack' | 'codesandbox' | 'html';
  /** Disable runtime mode (use Sandpack as primary). Sandpack is the recommended default - it provides browser-based HMR without needing a backend. */
  disableRuntime?: boolean;
  /** Enable runtime mode explicitly (requires ECS backend deployment) */
  enableRuntime?: boolean;
  /** Use CodeSandbox cloud preview instead of local Sandpack */
  useCodeSandbox?: boolean;
}

export interface SimplePreviewHandle {
  refresh: () => void;
  getSession: () => PreviewSession | null;
  stopSession: () => Promise<void>;
  openInCodeSandbox: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const SANDPACK_TIMEOUT_MS = 30000; // 30 seconds timeout for Sandpack

// Common dependencies that are always available
const BUNDLED_DEPENDENCIES = {
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "lucide-react": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest",
  "class-variance-authority": "latest",
  "@radix-ui/react-slot": "latest",
  "framer-motion": "latest",
  "date-fns": "latest",
  "recharts": "latest",
};

// Modules that can be imported (won't be stripped)
const ALLOWED_IMPORTS = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'lucide-react',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  '@radix-ui/react-slot',
  'framer-motion',
  'date-fns',
  'recharts',
]);

// CSS Variables for shadcn/ui theming
const BASE_CSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.75rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}

* {
  border-color: hsl(var(--border));
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  margin: 0;
  padding: 0;
}
`;

// Default main.tsx entry point
const DEFAULT_MAIN = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

// Default empty app
const DEFAULT_APP = `import React from 'react';

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p className="text-muted-foreground">Start coding to see preview</p>
    </div>
  );
}
`;

// React hooks shim - provides safe mock implementations for preview
// This helps when custom hooks from the project can't be resolved
const HOOKS_SHIM = `
// Mock implementations of common React hooks patterns
// These prevent "Invalid hook call" errors in preview

import { useState as reactUseState, useEffect as reactUseEffect, useCallback as reactUseCallback, useMemo as reactUseMemo, useRef as reactUseRef, useContext as reactUseContext, createContext } from 'react';

// Re-export React's built-in hooks
export const useState = reactUseState;
export const useEffect = reactUseEffect;
export const useCallback = reactUseCallback;
export const useMemo = reactUseMemo;
export const useRef = reactUseRef;
export const useContext = reactUseContext;

// ============================================================================
// INTERACTIVE AUTH MOCK - Simulates real authentication behavior
// ============================================================================

// Mock user type
interface MockUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

// Mock session type
interface MockSession {
  user: MockUser;
  accessToken: string;
  expiresAt: Date;
}

// Auth state stored in module scope (persists across component renders)
let _authState: { user: MockUser | null; session: MockSession | null; loading: boolean } = {
  user: null,
  session: null,
  loading: false,
};

// Subscribers for auth state changes
const _authSubscribers: Set<() => void> = new Set();

function notifyAuthSubscribers() {
  _authSubscribers.forEach(fn => fn());
}

// Mock auth functions with simulated delays
export const mockAuth = {
  signIn: async (email: string, password: string): Promise<{ user: MockUser; session: MockSession } | { error: string }> => {
    _authState.loading = true;
    notifyAuthSubscribers();
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));
    
    // Simple validation
    if (!email || !email.includes('@')) {
      _authState.loading = false;
      notifyAuthSubscribers();
      return { error: 'Invalid email address' };
    }
    if (!password || password.length < 4) {
      _authState.loading = false;
      notifyAuthSubscribers();
      return { error: 'Password must be at least 4 characters' };
    }
    
    const user: MockUser = {
      id: 'mock-user-' + Date.now(),
      email,
      name: email.split('@')[0],
      createdAt: new Date(),
    };
    
    const session: MockSession = {
      user,
      accessToken: 'mock-token-' + Math.random().toString(36).substr(2),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
    
    _authState = { user, session, loading: false };
    notifyAuthSubscribers();
    
    console.log('[MockAuth] Signed in:', user.email);
    return { user, session };
  },
  
  signUp: async (email: string, password: string, name?: string): Promise<{ user: MockUser } | { error: string }> => {
    _authState.loading = true;
    notifyAuthSubscribers();
    
    await new Promise(r => setTimeout(r, 1000));
    
    if (!email || !email.includes('@')) {
      _authState.loading = false;
      notifyAuthSubscribers();
      return { error: 'Invalid email address' };
    }
    if (!password || password.length < 6) {
      _authState.loading = false;
      notifyAuthSubscribers();
      return { error: 'Password must be at least 6 characters' };
    }
    
    const user: MockUser = {
      id: 'mock-user-' + Date.now(),
      email,
      name: name || email.split('@')[0],
      createdAt: new Date(),
    };
    
    _authState.loading = false;
    notifyAuthSubscribers();
    
    console.log('[MockAuth] Signed up:', user.email);
    return { user };
  },
  
  signOut: async (): Promise<void> => {
    _authState.loading = true;
    notifyAuthSubscribers();
    
    await new Promise(r => setTimeout(r, 300));
    
    console.log('[MockAuth] Signed out');
    _authState = { user: null, session: null, loading: false };
    notifyAuthSubscribers();
  },
  
  getSession: (): MockSession | null => _authState.session,
  getUser: (): MockUser | null => _authState.user,
};

// Interactive useAuth hook - actually responds to login/logout
export const useAuth = () => {
  const [, forceUpdate] = reactUseState({});
  
  reactUseEffect(() => {
    const update = () => forceUpdate({});
    _authSubscribers.add(update);
    return () => { _authSubscribers.delete(update); };
  }, []);
  
  return {
    user: _authState.user,
    session: _authState.session,
    loading: _authState.loading,
    isAuthenticated: !!_authState.user,
    signIn: mockAuth.signIn,
    signUp: mockAuth.signUp,
    signOut: mockAuth.signOut,
  };
};

// Supabase-compatible mock client
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const result = await mockAuth.signIn(email, password);
      if ('error' in result) return { data: null, error: { message: result.error } };
      return { data: { user: result.user, session: result.session }, error: null };
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: { name?: string } } }) => {
      const result = await mockAuth.signUp(email, password, options?.data?.name);
      if ('error' in result) return { data: null, error: { message: result.error } };
      return { data: { user: result.user }, error: null };
    },
    signOut: async () => {
      await mockAuth.signOut();
      return { error: null };
    },
    getSession: async () => ({ data: { session: mockAuth.getSession() }, error: null }),
    getUser: async () => ({ data: { user: mockAuth.getUser() }, error: null }),
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const handler = () => callback(_authState.user ? 'SIGNED_IN' : 'SIGNED_OUT', _authState.session);
      _authSubscribers.add(handler);
      return { data: { subscription: { unsubscribe: () => _authSubscribers.delete(handler) } } };
    },
  },
  from: (table: string) => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
};

// ============================================================================
// Common custom hook mocks
// ============================================================================

export const useToast = () => {
  const toast = (opts: { title?: string; description?: string; variant?: string }) => {
    console.log('[Toast]', opts.title, opts.description);
    // In preview, we can show a simple alert or console log
  };
  return { toast, dismiss: () => {} };
};
export const useMobile = () => false;
export const useSidebar = () => ({ open: false, toggle: () => {}, setOpen: () => {} });
export const useTheme = () => {
  const [theme, setTheme] = reactUseState('light');
  return { theme, setTheme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
};
export const useRouter = () => ({ push: () => {}, replace: () => {}, pathname: '/', back: () => {} });
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), () => {}];
export const useQuery = () => ({ data: null, loading: false, error: null, refetch: () => Promise.resolve() });
export const useMutation = () => [() => Promise.resolve(), { loading: false, error: null }];
export const useForm = () => ({ register: () => ({}), handleSubmit: (fn) => fn, watch: () => '', errors: {}, reset: () => {} });
export const useDebounce = (value) => value;
export const useLocalStorage = (key, initial) => {
  const [value, setValue] = reactUseState(initial);
  return [value, setValue];
};
export const useMediaQuery = () => false;
export const useOnClickOutside = () => {};
export const useWindowSize = () => ({ width: 1024, height: 768 });
export const useIntersectionObserver = () => ({ ref: { current: null }, inView: true });
export const useAnimation = () => ({ ref: { current: null }, controls: {} });
export const useReducer = (reducer, initial) => [initial, () => {}];
export const useLayoutEffect = reactUseEffect;

// Project-specific hook mocks
export const useAssetRegistry = () => ({ assets: [], registerAsset: () => {}, getAsset: () => null, removeAsset: () => {} });
export const useSceneModel = () => ({ scene: null, updateScene: () => {}, selectedNode: null, selectNode: () => {} });
export const useDesignStudio = () => ({ scene: null, updateScene: () => {}, undo: () => {}, redo: () => {}, canUndo: false, canRedo: false });
export const useVirtualFileSystem = () => ({ files: {}, createFile: () => {}, updateFile: () => {}, deleteFile: () => {}, readFile: () => '' });
export const usePreviewSession = () => ({ session: null, isLoading: false, error: null, refresh: () => {} });
export const useAIFileAnalysis = () => ({ analyze: () => Promise.resolve({}), isAnalyzing: false });
export const useAITemplate = () => ({ generate: () => Promise.resolve(''), isGenerating: false });
export const useCodeHistory = () => ({ history: [], push: () => {}, undo: () => '', redo: () => '', canUndo: false, canRedo: false });
export const useDocument = () => ({ document: null, isLoading: false, save: () => Promise.resolve() });
export const useGoHighLevelCRM = () => ({ contacts: [], pipelines: [], isLoading: false });
export const useKeyboardShortcuts = () => {};
export const usePageGenerator = () => ({ generate: () => Promise.resolve(''), isGenerating: false });
export const useSubscription = () => ({ subscription: null, isLoading: false, tier: 'free' });
export const useCanvasHistory = () => ({ history: [], push: () => {}, undo: () => {}, redo: () => {}, canUndo: false, canRedo: false });
export const useTemplateAutomation = () => ({ automate: () => Promise.resolve(), isAutomating: false });
export const useTemplateFiles = () => ({ files: [], upload: () => Promise.resolve(), delete: () => Promise.resolve() });
export const useTemplateState = () => ({ state: {}, setState: () => {}, reset: () => {} });
export const useWebBuilder = () => ({ pages: [], components: [], addPage: () => {}, addComponent: () => {} });
export const useWebBuilderAI = () => ({ generate: () => Promise.resolve(''), isGenerating: false });
export const useWebBuilderState = () => ({ state: {}, setState: () => {} });
export const useWorkflowTrigger = () => ({ trigger: () => Promise.resolve(), isTriggering: false });
export const useCounter = (initial = 0) => { const [count, setCount] = reactUseState(initial); return { count, increment: () => setCount(c => c + 1), decrement: () => setCount(c => c - 1) }; };
export const useToggle = (initial = false) => { const [value, setValue] = reactUseState(initial); return [value, () => setValue(v => !v)]; };

// Default export for convenience
export default {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useToast,
  useMobile,
  useSidebar,
  useTheme,
  useAuth,
  useRouter,
  useParams,
  useSearchParams,
  useQuery,
  useMutation,
  useForm,
  useDebounce,
  useLocalStorage,
  useMediaQuery,
  useOnClickOutside,
  useWindowSize,
  useIntersectionObserver,
  useAnimation,
  useReducer,
  useLayoutEffect,
  useAssetRegistry,
  useSceneModel,
  useDesignStudio,
  useVirtualFileSystem,
  usePreviewSession,
  useAIFileAnalysis,
  useAITemplate,
  useCodeHistory,
  useDocument,
  useGoHighLevelCRM,
  useKeyboardShortcuts,
  usePageGenerator,
  useSubscription,
  useCanvasHistory,
  useTemplateAutomation,
  useTemplateFiles,
  useTemplateState,
  useWebBuilder,
  useWebBuilderAI,
  useWebBuilderState,
  useWorkflowTrigger,
  useCounter,
  useToggle,
  // Auth & Supabase mocks
  mockAuth,
  supabase,
};
`;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Strip imports that Sandpack can't resolve
 */
function processCode(code: string, filePath: string): string {
  // Only process TypeScript/JavaScript files
  if (!/\.(tsx?|jsx?|mjs)$/.test(filePath)) {
    return code;
  }

  let processed = code;

  // Handle @/ path alias imports - redirect hooks and integrations to shim, strip others
  processed = processed.replace(
    /^import\s+(?:(?:\{([^}]*)\}|\*\s+as\s+(\w+)|(\w+))\s*,?\s*)*\s*from\s+['"]@\/([^'"]+)['"];?\s*$/gm,
    (match, namedImports, namespaceImport, defaultImport, modulePath) => {
      // Redirect @/hooks/ imports to the shim
      if (modulePath.startsWith('hooks/') || modulePath === 'hooks') {
        if (namedImports) {
          return `import { ${namedImports} } from './hooks-shim';`;
        } else if (defaultImport) {
          return `import ${defaultImport} from './hooks-shim';`;
        } else if (namespaceImport) {
          return `import * as ${namespaceImport} from './hooks-shim';`;
        }
        return `import hooks from './hooks-shim'; // [Preview] Shimmed: @/${modulePath}`;
      }
      // Redirect @/integrations/supabase imports to the shim (mock supabase)
      if (modulePath.startsWith('integrations/supabase')) {
        if (namedImports) {
          return `import { ${namedImports} } from './hooks-shim';`;
        } else if (defaultImport) {
          return `import ${defaultImport} from './hooks-shim';`;
        }
        return `import { supabase } from './hooks-shim'; // [Preview] Shimmed: @/${modulePath}`;
      }
      // Strip other @/ imports
      return `// [Preview] Stripped: ${match.trim()}`;
    }
  );

  // Remove relative imports that reference project-specific files
  // Keep: react, react-dom, lucide-react, and allowed packages
  processed = processed.replace(
    /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"];?\s*$/gm,
    (match, modulePath) => {
      // Check if it's an allowed module
      const baseModule = modulePath.split('/')[0];
      if (ALLOWED_IMPORTS.has(modulePath) || ALLOWED_IMPORTS.has(baseModule)) {
        return match;
      }
      
      // Keep CSS imports
      if (/\.(css|scss|less)$/.test(modulePath)) {
        return match;
      }
      
      // Keep relative imports (user-created components)
      // Both ./ and ../ paths should be kept as they reference local files
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        // Redirect hook imports to our shim file
        if (modulePath.includes('hooks/')) {
          // Replace with shim import - extract what's being imported
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) {
              return `import { ${namedImports} } from './hooks-shim';`;
            } else if (defaultImport) {
              return `import ${defaultImport} from './hooks-shim';`;
            }
          }
          return `import hooks from './hooks-shim'; // [Preview] Shimmed: ${modulePath}`;
        }
        return match;
      }
      
      // Strip @/ alias imports (not resolvable in Sandpack)
      if (modulePath.startsWith('@/')) {
        return `// [Preview] Stripped: ${match.trim()}`;
      }
      
      return match;
    }
  );

  // Remove hook calls that would break (useAssetRegistry, etc.)
  const unsupportedHooks = [
    'useAssetRegistry',
    'useTemplateState',
    'useGoHighLevelCRM',
    'useSupabaseClient',
  ];
  
  for (const hook of unsupportedHooks) {
    // Remove destructured hook results
    processed = processed.replace(
      new RegExp(`const\\s+\\{[^}]*\\}\\s*=\\s*${hook}\\([^)]*\\);?`, 'g'),
      `// [Preview] Stripped ${hook} call`
    );
    // Remove simple hook results
    processed = processed.replace(
      new RegExp(`const\\s+\\w+\\s*=\\s*${hook}\\([^)]*\\);?`, 'g'),
      `// [Preview] Stripped ${hook} call`
    );
    // Replace any remaining calls with empty object
    processed = processed.replace(
      new RegExp(`${hook}\\([^)]*\\)`, 'g'),
      '{}'
    );
  }

  // Clean up multiple blank lines
  processed = processed.replace(/\n{3,}/g, '\n\n');

  return processed;
}

/**
 * Convert VFS files to Sandpack format
 * Sandpack's react-ts template expects files at root level (e.g., /App.tsx, not /src/App.tsx)
 */
function prepareFiles(files: Record<string, string>): Record<string, string> {
  const sandpackFiles: Record<string, string> = {};
  let hasApp = false;
  let hasMain = false;
  let hasCSS = false;

  // Debug: log input files
  console.log('[SimplePreview] Input VFS files:', Object.keys(files));

  // Process each file
  for (const [path, content] of Object.entries(files)) {
    // Normalize path to start with /
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Skip node_modules, hidden files, config files that Sandpack doesn't need
    if (normalizedPath.includes('node_modules') || 
        normalizedPath.includes('/.') ||
        normalizedPath.endsWith('.json') ||
        normalizedPath.endsWith('.config.ts') ||
        normalizedPath.endsWith('.config.js') ||
        normalizedPath.includes('/public/')) {
      continue;
    }

    // Flatten /src/ paths to root for Sandpack compatibility
    // e.g., /src/App.tsx -> /App.tsx, /src/components/ui/Button.tsx -> /components/ui/Button.tsx
    if (normalizedPath.startsWith('/src/')) {
      normalizedPath = normalizedPath.replace('/src/', '/');
    }

    // Also flatten /styles/ to root (e.g., /styles/index.css -> /index.css)
    // This ensures './styles/index.css' imports work after transformation
    if (normalizedPath.startsWith('/styles/')) {
      normalizedPath = normalizedPath.replace('/styles/', '/');
    }

    // Also fix imports in the content to remove src/ prefix and flatten styles/
    let processedContent = content;
    
    // Fix imports: './components/ui/Button' stays the same
    // Fix imports: '../components/ui/Button' -> './components/ui/Button' (if coming from src/)
    // Fix CSS imports: './styles/index.css' -> './index.css'
    processedContent = processedContent
      // Remove 'src/' from import paths
      .replace(/from\s+['"]\.\/src\//g, "from './")
      .replace(/from\s+['"]src\//g, "from './")
      // Flatten styles/ path for CSS imports (both import and from syntax)
      .replace(/from\s+['"]\.\/styles\//g, "from './")
      .replace(/import\s+['"]\.\/styles\//g, "import './");

    // Now process the code (strip unsupported imports)
    processedContent = processCode(processedContent, normalizedPath);
    sandpackFiles[normalizedPath] = processedContent;

    // Track what we have
    if (normalizedPath === '/App.tsx' || normalizedPath === '/App.jsx') {
      hasApp = true;
    }
    if (normalizedPath === '/main.tsx' || normalizedPath === '/main.jsx' || normalizedPath === '/index.tsx') {
      hasMain = true;
    }
    if (normalizedPath.endsWith('.css')) {
      hasCSS = true;
    }
  }

  // Add missing essential files
  if (!hasCSS) {
    sandpackFiles['/index.css'] = BASE_CSS;
  }

  if (!hasApp) {
    sandpackFiles['/App.tsx'] = DEFAULT_APP;
  }

  if (!hasMain) {
    sandpackFiles['/main.tsx'] = DEFAULT_MAIN;
  }

  // Always add the hooks shim file for safe fallback imports
  sandpackFiles['/hooks-shim.ts'] = HOOKS_SHIM;

  // Inject SMART_NAVIGATION_SCRIPT into index.html (or create it if missing)
  const SMART_NAVIGATION_SCRIPT_TAG = `<script>\n${SMART_NAVIGATION_SCRIPT.replace(/<script>|<\/script>/g, '')}\n<\/script>`;
  if (sandpackFiles['/index.html']) {
    // Inject before </body> or </html>
    let html = sandpackFiles['/index.html'];
    if (/<\/body>/.test(html)) {
      html = html.replace(/<\/body>/, `${SMART_NAVIGATION_SCRIPT_TAG}\n</body>`);
    } else if (/<\/html>/.test(html)) {
      html = html.replace(/<\/html>/, `${SMART_NAVIGATION_SCRIPT_TAG}\n</html>`);
    } else {
      html += `\n${SMART_NAVIGATION_SCRIPT_TAG}`;
    }
    sandpackFiles['/index.html'] = html;
  } else {
    // Create a minimal index.html with the script
    sandpackFiles['/index.html'] = `<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Preview</title>\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n</head>\n<body>\n  <div id=\"root\"></div>\n  ${SMART_NAVIGATION_SCRIPT_TAG}\n</body>\n</html>`;
  }

  // Debug: log prepared files
  console.log('[SimplePreview] Prepared files for Sandpack:', Object.keys(sandpackFiles));

  return sandpackFiles;
}

// ============================================================================
// Status Component (uses Sandpack context)
// ============================================================================

const PreviewStatus: React.FC<{
  onReady?: () => void;
  onError?: (error: string) => void;
}> = ({ onReady, onError }) => {
  const { sandpack } = useSandpack();
  const { status, error } = sandpack;
  const [hasNotifiedReady, setHasNotifiedReady] = useState(false);

  useEffect(() => {
    if (error && onError) {
      onError(error.message);
    }
    if (status === 'idle' && !error && onReady && !hasNotifiedReady) {
      onReady();
      setHasNotifiedReady(true);
    }
  }, [status, error, onReady, onError, hasNotifiedReady]);

  // Reset ready notification when status changes away from idle
  useEffect(() => {
    if (status !== 'idle') {
      setHasNotifiedReady(false);
    }
  }, [status]);

  const getStatusDisplay = () => {
    if (error) {
      return {
        icon: <AlertCircle className="w-3 h-3 text-destructive" />,
        text: 'Error',
        className: 'bg-destructive/10 border-destructive/20 text-destructive'
      };
    }
    
    switch (status) {
      case 'running':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin text-blue-500" />,
          text: 'Compiling...',
          className: 'bg-blue-50 border-blue-200'
        };
      case 'idle':
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-green-500" />,
          text: 'Live',
          className: 'bg-green-50 border-green-200'
        };
      default:
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />,
          text: 'Loading...',
          className: 'bg-muted'
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className={cn(
      "absolute top-2 right-2 z-10 px-2 py-1 rounded-md border flex items-center gap-1.5 text-xs backdrop-blur-sm",
      display.className
    )}>
      {display.icon}
      <span>{display.text}</span>
    </div>
  );
};

// ============================================================================
// Console Panel
// ============================================================================

const ConsolePanel: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
}> = ({ isOpen, onToggle }) => {
  return (
    <div className="border-t bg-slate-900 text-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Console</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="h-32 overflow-auto">
          <SandpackConsole 
            showHeader={false}
            className="!bg-slate-900 !border-0"
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Inner Preview Component (has Sandpack context)
// ============================================================================

const PreviewInner: React.FC<{
  onReady?: () => void;
  onError?: (error: string) => void;
  onTimeout?: () => void;
  showNavigator?: boolean;
  showConsole?: boolean;
}> = ({ onReady, onError, onTimeout, showNavigator, showConsole }) => {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const { sandpack } = useSandpack();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTimedOut = useRef(false);

  // Set up timeout detection
  useEffect(() => {
    hasTimedOut.current = false;
    
    // Only start timeout if we're not already idle
    if (sandpack.status === 'idle') {
      return;
    }
    
    timeoutRef.current = setTimeout(() => {
      // Check if still not ready after timeout
      if (sandpack.status !== 'idle') {
        console.warn('[SimplePreview] Sandpack timeout - status:', sandpack.status);
        hasTimedOut.current = true;
        onTimeout?.();
      }
    }, SANDPACK_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sandpack.status, onTimeout]);

  // Clear timeout when ready
  useEffect(() => {
    if (sandpack.status === 'idle' && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [sandpack.status]);

  return (
    <div className="relative w-full h-full min-h-0 flex flex-col bg-white">
      <PreviewStatus onReady={onReady} onError={onError} />
      
      <div className="flex-1 min-h-0">
        <SandpackLayout className="!flex-1 !min-h-0 !border-0 !rounded-none !bg-transparent">
          <SandpackPreview
            showNavigator={showNavigator}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            style={{ height: '100%', minHeight: 0 }}
          />
        </SandpackLayout>
      </div>

      {showConsole && (
        <ConsolePanel isOpen={consoleOpen} onToggle={() => setConsoleOpen(!consoleOpen)} />
      )}
    </div>
  );
};

// ============================================================================
// HTML Fallback Preview
// ============================================================================

/**
 * Check if content is a complete HTML document
 */
function isCompleteHTML(content: string): boolean {
  return content.trim().toLowerCase().startsWith('<!doctype html') || 
         content.trim().toLowerCase().startsWith('<html');
}

/**
 * Smart Navigation System - Intercepts navigation and shows themed redirect pages
 * Supports: Auth (sign in/up/login), Payment, Contact, Pricing, Dashboard, etc.
 */
const SMART_NAVIGATION_SCRIPT = `
<script>
(function() {
  'use strict';

  // ============================================================================
  // Dynamic State/Prop Bridge
  // ============================================================================
  window.__PREVIEW_STATE = {};
  function updatePreviewState(newState) {
    window.__PREVIEW_STATE = { ...window.__PREVIEW_STATE, ...newState };
    if (typeof window.__onPreviewStateChange === 'function') {
      window.__onPreviewStateChange(window.__PREVIEW_STATE);
    }
  }

  // Default implementation: update all {{state.key}} placeholders
  window.__onPreviewStateChange = function(state) {
    // Replace all {{key}} in text nodes
    function walk(node) {
      if (node.nodeType === 3) { // Text node
        node.nodeValue = node.nodeValue.replace(/\{\{\s*(\w+)\s*\}\}/g, function(_, key) {
          return state[key] !== undefined ? state[key] : '';
        });
      } else if (node.nodeType === 1 && node.childNodes) {
        for (var i = 0; i < node.childNodes.length; i++) {
          walk(node.childNodes[i]);
        }
      }
    }
    walk(document.body);
  };
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'updateState') {
      updatePreviewState(event.data.state || {});
    }
  });
  // Example: window.__onPreviewStateChange = (state) => { ... rerender ... }

  // ============================================================================
  // Theme Extraction - Intelligently capture page styles
  // ============================================================================
  function extractTheme() {
    const computed = getComputedStyle(document.documentElement);
    const bodyComputed = document.body ? getComputedStyle(document.body) : computed;
    
    // Try to get CSS custom properties first
    const getCSSVar = (name) => computed.getPropertyValue(name).trim();
    
    // Extract primary colors from various sources
    const primaryBtn = document.querySelector('button[class*="primary"], .btn-primary, [class*="bg-primary"], [class*="bg-blue"], [class*="bg-indigo"]');
    const primaryBtnStyle = primaryBtn ? getComputedStyle(primaryBtn) : null;
    
    // Find accent/primary color
    let primaryColor = getCSSVar('--primary') || getCSSVar('--accent') || getCSSVar('--brand');
    if (!primaryColor && primaryBtnStyle) {
      primaryColor = primaryBtnStyle.backgroundColor;
    }
    if (!primaryColor || primaryColor === 'rgba(0, 0, 0, 0)') {
      primaryColor = '#3b82f6'; // Default blue
    }
    
    // Background detection
    let bgColor = getCSSVar('--background') || bodyComputed.backgroundColor;
    if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)') {
      bgColor = '#ffffff';
    }
    
    // Text color detection
    let textColor = getCSSVar('--foreground') || bodyComputed.color;
    if (!textColor) textColor = '#1f2937';
    
    // Detect if dark mode
    const isDark = isColorDark(bgColor);
    
    // Border radius from buttons
    let borderRadius = '0.5rem';
    if (primaryBtnStyle) {
      borderRadius = primaryBtnStyle.borderRadius || '0.5rem';
    }
    
    // Font family
    const fontFamily = bodyComputed.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    // Secondary/muted colors
    const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
    
    return {
      primary: normalizeColor(primaryColor),
      background: normalizeColor(bgColor),
      foreground: normalizeColor(textColor),
      muted: mutedColor,
      border: borderColor,
      cardBg: cardBg,
      borderRadius: borderRadius,
      fontFamily: fontFamily,
      isDark: isDark
    };
  }
  
  function normalizeColor(color) {
    if (!color) return '#3b82f6';
    if (color.startsWith('#')) return color;
    if (color.startsWith('rgb')) return color;
    if (color.includes('hsl')) {
      // Convert HSL CSS var format to usable color
      const match = color.match(/([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%/);
      if (match) {
        return 'hsl(' + match[1] + ', ' + match[2] + '%, ' + match[3] + '%)';
      }
    }
    return color;
  }
  
  function isColorDark(color) {
    if (!color) return false;
    let r, g, b;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\\d+/g);
      if (match) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      }
    }
    if (r === undefined) return false;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
  
  // ============================================================================
  // Navigation Type Detection - Extended patterns for full pipeline coverage
  // ============================================================================
  const NAV_PATTERNS = {
    auth: {
      keywords: ['sign in', 'signin', 'sign up', 'signup', 'log in', 'login', 'register', 'create account', 'get started', 'join', 'welcome back'],
      paths: ['/login', '/signin', '/sign-in', '/signup', '/sign-up', '/register', '/auth', '/join'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>'
    },
    payment: {
      keywords: ['checkout', 'pay now', 'complete purchase', 'place order', 'buy now', 'add to cart', 'cart', 'payment'],
      paths: ['/checkout', '/payment', '/pay', '/cart', '/order'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'
    },
    pricing: {
      keywords: ['pricing', 'plans', 'subscribe', 'upgrade', 'pro', 'premium', 'enterprise', 'free trial', 'start trial', 'choose plan', 'select plan'],
      paths: ['/pricing', '/plans', '/subscribe', '/upgrade'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
    },
    features: {
      keywords: ['features', 'capabilities', 'what we offer', 'solutions', 'products', 'services', 'how it works', 'benefits', 'why choose'],
      paths: ['/features', '/solutions', '/products', '/services', '/how-it-works'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    },
    scheduling: {
      keywords: ['schedule', 'book', 'appointment', 'calendar', 'meeting', 'demo', 'consultation', 'book a call', 'book now', 'reserve', 'availability'],
      paths: ['/schedule', '/book', '/calendar', '/appointment', '/demo', '/meeting'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    },
    contact: {
      keywords: ['contact', 'get in touch', 'reach out', 'support', 'help', 'feedback', 'message', 'talk to us', 'chat', 'inquiry'],
      paths: ['/contact', '/support', '/help', '/feedback', '/inquiry'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    },
    dashboard: {
      keywords: ['dashboard', 'my account', 'profile', 'settings', 'admin', 'overview', 'analytics', 'reports'],
      paths: ['/dashboard', '/account', '/profile', '/settings', '/admin', '/analytics'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
    },
    about: {
      keywords: ['about', 'about us', 'our story', 'team', 'who we are', 'our mission', 'company', 'careers'],
      paths: ['/about', '/about-us', '/team', '/story', '/careers', '/company'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    },
    download: {
      keywords: ['download', 'get app', 'install', 'app store', 'play store', 'mobile app'],
      paths: ['/download', '/app', '/install', '/mobile'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    },
    blog: {
      keywords: ['blog', 'articles', 'news', 'resources', 'learn', 'guides', 'tutorials', 'documentation', 'docs'],
      paths: ['/blog', '/articles', '/news', '/resources', '/learn', '/docs', '/guides'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
    },
    portfolio: {
      keywords: ['portfolio', 'work', 'projects', 'case studies', 'showcase', 'gallery', 'examples'],
      paths: ['/portfolio', '/work', '/projects', '/case-studies', '/gallery'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
    },
    newsletter: {
      keywords: ['newsletter', 'subscribe', 'stay updated', 'join list', 'get updates', 'notify me', 'email list'],
      paths: ['/newsletter', '/subscribe'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
    },
    faq: {
      keywords: ['faq', 'questions', 'help center', 'knowledge base', 'answers'],
      paths: ['/faq', '/help', '/questions', '/knowledge-base'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    },
    testimonials: {
      keywords: ['testimonials', 'reviews', 'customers', 'success stories', 'what people say'],
      paths: ['/testimonials', '/reviews', '/customers'],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
    }
  };
  
  function detectNavigationType(element, href) {
    const text = (element.textContent || '').toLowerCase().trim();
    const path = (href || '').toLowerCase();
    const className = (element.className || '').toLowerCase();
    
    for (const [type, config] of Object.entries(NAV_PATTERNS)) {
      // Check text content
      for (const keyword of config.keywords) {
        if (text.includes(keyword)) return { type, ...config };
      }
      // Check href path
      for (const p of config.paths) {
        if (path.includes(p)) return { type, ...config };
      }
    }
    
    // Default to generic page
    return {
      type: 'page',
      keywords: [],
      paths: [],
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    };
  }
  
  // ============================================================================
  // Navigation History & State Management
  // ============================================================================
  var navHistory = [];
  var currentOverlay = null;
  
  function storeOriginalPage() {
    if (navHistory.length === 0) {
      navHistory.push({ type: 'origin', title: document.title || 'Home' });
    }
  }
  
  // ============================================================================
  // Social Sign-In Flow Simulations
  // ============================================================================
  function showGoogleSignIn(theme, onComplete) {
    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    popup.innerHTML = '<div style="background:white;border-radius:8px;width:380px;max-width:90%;box-shadow:0 4px 24px rgba(0,0,0,0.2);overflow:hidden;">' +
      '<div style="padding:24px 24px 20px;border-bottom:1px solid #e5e5e5;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
          '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
          '<span style="font-size:18px;color:#202124;">Sign in with Google</span>' +
        '</div>' +
        '<p style="color:#5f6368;font-size:14px;margin:0;">Choose an account to continue</p>' +
      '</div>' +
      '<div style="padding:8px 0;">' +
        '<div class="google-account" style="display:flex;align-items:center;gap:16px;padding:12px 24px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'transparent\'">' +
          '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#4285F4,#34A853);display:flex;align-items:center;justify-content:center;color:white;font-weight:500;">JD</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:14px;color:#202124;font-weight:500;">John Doe</div>' +
            '<div style="font-size:12px;color:#5f6368;">john.doe@gmail.com</div>' +
          '</div>' +
        '</div>' +
        '<div class="google-account" style="display:flex;align-items:center;gap:16px;padding:12px 24px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'transparent\'">' +
          '<div style="width:40px;height:40px;border-radius:50%;background:#ea4335;display:flex;align-items:center;justify-content:center;color:white;font-weight:500;">W</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:14px;color:#202124;font-weight:500;">Work Account</div>' +
            '<div style="font-size:12px;color:#5f6368;">john@company.com</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:16px;padding:12px 24px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'transparent\'">' +
          '<div style="width:40px;height:40px;border-radius:50%;border:2px dashed #dadce0;display:flex;align-items:center;justify-content:center;color:#5f6368;">+</div>' +
          '<div style="font-size:14px;color:#1a73e8;">Use another account</div>' +
        '</div>' +
      '</div>' +
      '<div style="padding:16px 24px;border-top:1px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center;">' +
        '<a href="#" style="font-size:13px;color:#1a73e8;text-decoration:none;">Privacy Policy</a>' +
        '<button style="padding:8px 16px;background:transparent;border:1px solid #dadce0;border-radius:4px;color:#5f6368;cursor:pointer;font-size:13px;">Cancel</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(popup);
    
    popup.querySelectorAll('.google-account').forEach(function(acc) {
      acc.onclick = function() {
        popup.querySelector('div > div').innerHTML = '<div style="padding:40px;text-align:center;"><div style="width:40px;height:40px;border:3px solid #4285F4;border-top-color:transparent;border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite;"></div><p style="color:#5f6368;margin:0;">Signing in...</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
        setTimeout(function() {
          popup.remove();
          onComplete({ provider: 'google', email: 'john.doe@gmail.com', name: 'John Doe' });
        }, 1500);
      };
    });
    
    popup.querySelector('button').onclick = function() { popup.remove(); };
    popup.onclick = function(e) { if (e.target === popup) popup.remove(); };
  }
  
  function showGitHubSignIn(theme, onComplete) {
    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    popup.innerHTML = '<div style="background:#0d1117;border-radius:8px;width:340px;max-width:90%;box-shadow:0 4px 24px rgba(0,0,0,0.4);overflow:hidden;color:#c9d1d9;">' +
      '<div style="padding:24px;text-align:center;border-bottom:1px solid #30363d;">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="#c9d1d9" style="margin-bottom:16px;"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>' +
        '<h2 style="margin:0 0 8px;font-size:20px;color:#c9d1d9;">Sign in to GitHub</h2>' +
        '<p style="margin:0;font-size:13px;color:#8b949e;">to continue to App</p>' +
      '</div>' +
      '<div style="padding:24px;">' +
        '<div style="margin-bottom:16px;">' +
          '<label style="display:block;font-size:13px;color:#c9d1d9;margin-bottom:6px;">Username or email address</label>' +
          '<input type="text" value="johndoe" style="width:100%;padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="margin-bottom:16px;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
            '<label style="font-size:13px;color:#c9d1d9;">Password</label>' +
            '<a href="#" style="font-size:12px;color:#58a6ff;text-decoration:none;">Forgot password?</a>' +
          '</div>' +
          '<input type="password" value="••••••••" style="width:100%;padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<button class="github-signin" style="width:100%;padding:10px;background:#238636;border:none;border-radius:6px;color:white;font-size:14px;font-weight:500;cursor:pointer;">Sign in</button>' +
      '</div>' +
      '<div style="padding:16px 24px;border-top:1px solid #30363d;text-align:center;">' +
        '<span style="font-size:13px;color:#8b949e;">New to GitHub? </span>' +
        '<a href="#" style="font-size:13px;color:#58a6ff;text-decoration:none;">Create an account</a>' +
      '</div>' +
    '</div>';
    document.body.appendChild(popup);
    
    popup.querySelector('.github-signin').onclick = function() {
      this.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>';
      this.disabled = true;
      setTimeout(function() {
        popup.remove();
        onComplete({ provider: 'github', email: 'johndoe@github.com', name: 'johndoe' });
      }, 1500);
    };
    
    popup.onclick = function(e) { if (e.target === popup) popup.remove(); };
  }
  
  function showSignInSuccess(theme, user) {
    if (currentOverlay) {
      var content = currentOverlay.querySelector('div');
      content.innerHTML = '<div style="text-align:center;padding:2rem;">' +
        '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,' + theme.primary + ',' + theme.primary + '88);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</div>' +
        '<h2 style="color:' + theme.foreground + ';margin:0 0 0.5rem;">Welcome back!</h2>' +
        '<p style="color:' + theme.muted + ';margin:0 0 1rem;">Signed in as ' + user.email + '</p>' +
        '<p style="color:' + theme.muted + ';font-size:0.85rem;margin:0 0 2rem;">Redirecting to dashboard...</p>' +
        '<div style="width:200px;height:4px;background:' + theme.border + ';border-radius:2px;margin:0 auto;overflow:hidden;">' +
          '<div style="width:0%;height:100%;background:' + theme.primary + ';border-radius:2px;animation:progress 2s ease forwards;"></div>' +
        '</div>' +
        '<style>@keyframes progress{to{width:100%}}</style>' +
      '</div>';
      
      setTimeout(function() {
        showDashboardAfterLogin(theme, user);
      }, 2500);
    }
  }
  
  function showDashboardAfterLogin(theme, user) {
    if (currentOverlay) {
      var stat = 'background:' + theme.background + ';padding:1rem;border-radius:0.5rem;border:1px solid ' + theme.border + ';';
      var label = 'font-size:0.75rem;color:' + theme.muted + ';margin-bottom:0.25rem;';
      var val = 'font-size:1.25rem;font-weight:600;color:' + theme.foreground + ';';
      
      currentOverlay.querySelector('div').innerHTML = '<div style="width:100%;max-width:500px;padding:2rem;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;">' +
          '<div style="display:flex;align-items:center;gap:0.75rem;">' +
            '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,' + theme.primary + ',' + theme.primary + '88);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;">' + (user.name ? user.name[0].toUpperCase() : 'U') + '</div>' +
            '<div><div style="font-weight:600;color:' + theme.foreground + ';">' + (user.name || 'User') + '</div><div style="font-size:0.8rem;color:' + theme.muted + ';">' + user.email + '</div></div>' +
          '</div>' +
          '<button onclick="window.__closeRedirectOverlay()" style="padding:0.5rem 1rem;background:transparent;border:1px solid ' + theme.border + ';border-radius:0.5rem;color:' + theme.muted + ';cursor:pointer;font-size:0.85rem;">Sign Out</button>' +
        '</div>' +
        '<h2 style="color:' + theme.foreground + ';margin:0 0 1.5rem;font-size:1.5rem;">Dashboard</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:1.5rem;">' +
          '<div style="' + stat + '"><div style="' + label + '">Revenue</div><div style="' + val + '">$12.4k</div><div style="color:#10b981;font-size:0.75rem;">↑ 12%</div></div>' +
          '<div style="' + stat + '"><div style="' + label + '">Users</div><div style="' + val + '">1,429</div><div style="color:#10b981;font-size:0.75rem;">↑ 8%</div></div>' +
          '<div style="' + stat + '"><div style="' + label + '">Orders</div><div style="' + val + '">89</div><div style="color:#ef4444;font-size:0.75rem;">↓ 3%</div></div>' +
        '</div>' +
        '<div style="height:100px;background:linear-gradient(90deg,' + theme.primary + '22 0%,' + theme.primary + '44 50%,' + theme.primary + '22 100%);border-radius:0.5rem;display:flex;align-items:flex-end;padding:0.75rem;gap:3px;margin-bottom:1.5rem;">' +
          [40,60,45,70,55,80,65,75,90,70,85,95].map(function(h) { return '<div style="flex:1;background:' + theme.primary + ';border-radius:2px;height:' + h + '%;"></div>'; }).join('') +
        '</div>' +
        '<button onclick="window.__closeRedirectOverlay()" style="width:100%;padding:0.75rem;background:transparent;color:' + theme.muted + ';border:1px solid ' + theme.border + ';border-radius:0.5rem;cursor:pointer;">← Back to Home</button>' +
      '</div>';
    }
  }
  
  // ============================================================================
  // Themed Redirect Pages with Full Navigation
  // ============================================================================
  function createRedirectOverlay(navType, theme, originalText, href) {
    storeOriginalPage();
    
    // Remove existing overlay if any
    if (currentOverlay) currentOverlay.remove();
    
    var overlay = document.createElement('div');
    overlay.id = 'preview-redirect-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;overflow-y:auto;background:' + theme.background + ';font-family:' + theme.fontFamily + ';opacity:0;transition:opacity 0.3s ease;';
    
    currentOverlay = overlay;
    navHistory.push({ type: navType.type, title: originalText || navType.type });
    
    var pageTitle = getPageTitle(navType.type, originalText, href);
    var pageContent = getPageContent(navType.type, theme, originalText);
    
    // Build breadcrumb
    var breadcrumb = '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;font-size:0.85rem;">';
    breadcrumb += '<span style="color:' + theme.primary + ';cursor:pointer;" onclick="window.__closeRedirectOverlay()">Home</span>';
    breadcrumb += '<span style="color:' + theme.muted + ';">→</span>';
    breadcrumb += '<span style="color:' + theme.foreground + ';">' + pageTitle + '</span>';
    breadcrumb += '</div>';
    
    overlay.innerHTML = '<div style="width:100%;max-width:440px;padding:2rem;text-align:center;">' +
      breadcrumb +
      '<div style="color:' + theme.primary + ';margin-bottom:1rem;opacity:0.9;">' + navType.icon + '</div>' +
      '<h1 style="font-size:1.5rem;font-weight:600;color:' + theme.foreground + ';margin:0 0 0.5rem 0;">' + pageTitle + '</h1>' +
      '<p style="color:' + theme.muted + ';margin:0 0 1.5rem 0;font-size:0.9rem;">Preview demonstration</p>' +
      pageContent +
      '<button onclick="window.__closeRedirectOverlay()" style="margin-top:1.5rem;padding:0.625rem 1.5rem;background:transparent;color:' + theme.muted + ';border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';cursor:pointer;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Origin Page</button>' +
    '</div>';
    
    document.body.appendChild(overlay);
    
    // Wire up social sign-in buttons
    setTimeout(function() {
      var googleBtn = overlay.querySelector('[data-social="google"]');
      var githubBtn = overlay.querySelector('[data-social="github"]');
      
      if (googleBtn) {
        googleBtn.onclick = function(e) {
          e.preventDefault();
          showGoogleSignIn(theme, function(user) {
            showSignInSuccess(theme, user);
          });
        };
      }
      
      if (githubBtn) {
        githubBtn.onclick = function(e) {
          e.preventDefault();
          showGitHubSignIn(theme, function(user) {
            showSignInSuccess(theme, user);
          });
        };
      }
    }, 100);
    
    // Animate in
    requestAnimationFrame(function() {
      overlay.style.opacity = '1';
    });
    
    // Close handler - return to origin
    window.__closeRedirectOverlay = function() {
      overlay.style.opacity = '0';
      setTimeout(function() {
        overlay.remove();
        currentOverlay = null;
        navHistory = [];
        delete window.__closeRedirectOverlay;
      }, 300);
    };
    
    // ESC to close
    function escHandler(e) {
      if (e.key === 'Escape') {
        window.__closeRedirectOverlay();
        document.removeEventListener('keydown', escHandler);
      }
    }
    document.addEventListener('keydown', escHandler);
  }
  
  function getPageTitle(type, text, href) {
    const titles = {
      auth: 'Sign In',
      payment: 'Checkout',
      contact: 'Contact Us',
      dashboard: 'Dashboard',
      about: 'About Us',
      download: 'Download',
      page: text || href || 'Page'
    };
    return titles[type] || text || 'Page';
  }
  
  function getPageContent(type, theme) {
    const input = 'width:100%;padding:0.75rem 1rem;border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';background:' + theme.cardBg + ';color:' + theme.foreground + ';font-size:0.95rem;margin-bottom:0.75rem;outline:none;';
    const btn = 'width:100%;padding:0.75rem 1rem;background:' + theme.primary + ';color:white;border:none;border-radius:' + theme.borderRadius + ';font-size:0.95rem;font-weight:500;cursor:pointer;';
    const card = 'background:' + theme.cardBg + ';border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';padding:1.5rem;margin-bottom:1rem;text-align:left;';
    const stat = 'background:' + theme.background + ';padding:1rem;border-radius:0.5rem;border:1px solid ' + theme.border + ';';
    const label = 'font-size:0.75rem;color:' + theme.muted + ';margin-bottom:0.25rem;';
    const val = 'font-size:1.25rem;font-weight:600;color:' + theme.foreground + ';';
    const row = 'display:flex;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid ' + theme.border + ';';
    const check = 'color:' + theme.primary + ';margin-right:0.5rem;';

    if (type === 'auth') {
      return '<div style="' + card + '">' +
        '<div style="display:flex;gap:1rem;margin-bottom:1rem;border-bottom:1px solid ' + theme.border + ';">' +
          '<button style="flex:1;padding:0.75rem;background:transparent;border:none;border-bottom:2px solid ' + theme.primary + ';color:' + theme.foreground + ';font-weight:500;cursor:pointer;">Sign In</button>' +
          '<button style="flex:1;padding:0.75rem;background:transparent;border:none;color:' + theme.muted + ';cursor:pointer;">Sign Up</button>' +
        '</div>' +
        '<input type="email" placeholder="Email address" style="' + input + '">' +
        '<input type="password" placeholder="Password" style="' + input + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">' +
          '<label style="color:' + theme.muted + ';font-size:0.85rem;display:flex;align-items:center;gap:0.5rem;"><input type="checkbox" checked> Remember me</label>' +
          '<a href="#" style="color:' + theme.primary + ';font-size:0.85rem;text-decoration:none;">Forgot password?</a>' +
        '</div>' +
        '<button style="' + btn + '">Sign In with Email</button>' +
        '<div style="text-align:center;margin:1.25rem 0;color:' + theme.muted + ';font-size:0.85rem;display:flex;align-items:center;gap:1rem;"><div style="flex:1;height:1px;background:' + theme.border + ';"></div>or<div style="flex:1;height:1px;background:' + theme.border + ';"></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:0.75rem;">' +
          '<button data-social="google" style="width:100%;padding:0.75rem 1rem;border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.75rem;color:' + theme.foreground + ';font-size:0.95rem;transition:background 0.2s;" onmouseover="this.style.background=\'' + theme.cardBg + '\'" onmouseout="this.style.background=\'transparent\'"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continue with Google</button>' +
          '<button data-social="github" style="width:100%;padding:0.75rem 1rem;border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';background:#24292e;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.75rem;color:white;font-size:0.95rem;"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>Continue with GitHub</button>' +
        '</div>' +
        '<p style="text-align:center;margin-top:1.25rem;font-size:0.8rem;color:' + theme.muted + ';">By continuing, you agree to our <a href="#" style="color:' + theme.primary + ';text-decoration:none;">Terms</a> and <a href="#" style="color:' + theme.primary + ';text-decoration:none;">Privacy Policy</a></p>' +
      '</div>';
    }

    if (type === 'pricing') {
      return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
        '<div style="' + card + 'position:relative;">' +
          '<div style="' + label + '">STARTER</div>' +
          '<div style="' + val + 'margin-bottom:0.5rem;">$9<span style="font-size:0.875rem;font-weight:normal;color:' + theme.muted + '">/mo</span></div>' +
          '<div style="color:' + theme.muted + ';font-size:0.85rem;margin-bottom:1rem;">Perfect for individuals</div>' +
          '<div style="font-size:0.85rem;color:' + theme.foreground + ';"><span style="' + check + '">✓</span>5 projects</div>' +
          '<div style="font-size:0.85rem;color:' + theme.foreground + ';"><span style="' + check + '">✓</span>Basic analytics</div>' +
          '<div style="font-size:0.85rem;color:' + theme.foreground + ';"><span style="' + check + '">✓</span>Email support</div>' +
          '<button style="' + btn + 'margin-top:1rem;background:transparent;border:1px solid ' + theme.primary + ';color:' + theme.primary + ';">Select Plan</button>' +
        '</div>' +
        '<div style="' + card + 'border-color:' + theme.primary + ';position:relative;">' +
          '<div style="position:absolute;top:-0.75rem;right:1rem;background:' + theme.primary + ';color:white;padding:0.25rem 0.75rem;border-radius:1rem;font-size:0.7rem;">POPULAR</div>' +
          '<div style="' + label + '">PRO</div>' +
          '<div style="' + val + 'margin-bottom:0.5rem;">$29<span style="font-size:0.875rem;font-weight:normal;color:' + theme.muted + '">/mo</span></div>' +
          '<div style="color:' + theme.muted + ';font-size:0.85rem;margin-bottom:1rem;">For growing teams</div>' +
          '<div style="font-size:0.85rem;color:' + theme.foreground + ';"><span style="' + check + '">✓</span>Unlimited projects</div>' +
          '<div style="font-size:0.85rem;color:' + theme.foreground + ';"><span style="' + check + '">✓</span>Advanced analytics</div>' +
          '<div style="font-size:0.85rem;color:' + theme.foreground + ';"><span style="' + check + '">✓</span>Priority support</div>' +
          '<button style="' + btn + 'margin-top:1rem;">Get Started</button>' +
        '</div>' +
      '</div>';
    }

    if (type === 'payment') {
      return '<div style="' + card + '">' +
        '<div style="' + row + '"><span>Pro Plan (Annual)</span><span style="font-weight:600;">$290.00</span></div>' +
        '<div style="' + row + 'border:none;"><span>Tax</span><span>$29.00</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:1rem 0;border-top:2px solid ' + theme.foreground + ';font-weight:600;font-size:1.1rem;"><span>Total</span><span>$319.00</span></div>' +
        '<div style="margin-top:1rem;">' +
          '<div style="' + label + '">Card Number</div><input placeholder="4242 4242 4242 4242" style="' + input + '">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">' +
            '<div><div style="' + label + '">Expiry</div><input placeholder="MM/YY" style="' + input + '"></div>' +
            '<div><div style="' + label + '">CVC</div><input placeholder="123" style="' + input + '"></div>' +
          '</div>' +
          '<button style="' + btn + '">Pay $319.00</button>' +
          '<div style="text-align:center;margin-top:1rem;color:' + theme.muted + ';font-size:0.8rem;">🔒 Secured by Stripe</div>' +
        '</div>' +
      '</div>';
    }

    if (type === 'scheduling') {
      var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      var times = ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'];
      return '<div style="' + card + '">' +
        '<div style="' + label + '">SELECT A DATE</div>' +
        '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;">' +
          days.map(function(d, i) { return '<div style="flex:1;padding:0.75rem 0.5rem;text-align:center;border:1px solid ' + (i === 2 ? theme.primary : theme.border) + ';border-radius:' + theme.borderRadius + ';cursor:pointer;background:' + (i === 2 ? theme.primary : 'transparent') + ';color:' + (i === 2 ? 'white' : theme.foreground) + ';"><div style="font-size:0.7rem;opacity:0.7;">' + d + '</div><div style="font-weight:600;">' + (15 + i) + '</div></div>'; }).join('') +
        '</div>' +
        '<div style="' + label + '">AVAILABLE TIMES</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1rem;">' +
          times.map(function(t, i) { return '<button style="padding:0.75rem;border:1px solid ' + (i === 1 ? theme.primary : theme.border) + ';border-radius:' + theme.borderRadius + ';background:' + (i === 1 ? theme.primary : 'transparent') + ';color:' + (i === 1 ? 'white' : theme.foreground) + ';cursor:pointer;">' + t + '</button>'; }).join('') +
        '</div>' +
        '<input placeholder="Your name" style="' + input + '">' +
        '<input placeholder="Email address" style="' + input + '">' +
        '<button style="' + btn + '">Confirm Booking</button>' +
      '</div>';
    }

    if (type === 'features') {
      var features = [
        { icon: '⚡', title: 'Lightning Fast', desc: 'Optimized for speed and performance' },
        { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security built-in' },
        { icon: '🔄', title: 'Real-time Sync', desc: 'Changes sync across all devices' },
        { icon: '📊', title: 'Analytics', desc: 'Deep insights into your data' }
      ];
      return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
        features.map(function(f) { return '<div style="' + card + 'text-align:center;"><div style="font-size:2rem;margin-bottom:0.5rem;">' + f.icon + '</div><div style="font-weight:600;color:' + theme.foreground + ';margin-bottom:0.25rem;">' + f.title + '</div><div style="font-size:0.8rem;color:' + theme.muted + ';">' + f.desc + '</div></div>'; }).join('') +
      '</div>';
    }

    if (type === 'dashboard') {
      return '<div style="' + card + '">' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:1rem;">' +
          '<div style="' + stat + '"><div style="' + label + '">Revenue</div><div style="' + val + '">$12.4k</div><div style="color:#10b981;font-size:0.75rem;">↑ 12%</div></div>' +
          '<div style="' + stat + '"><div style="' + label + '">Users</div><div style="' + val + '">1,429</div><div style="color:#10b981;font-size:0.75rem;">↑ 8%</div></div>' +
          '<div style="' + stat + '"><div style="' + label + '">Orders</div><div style="' + val + '">89</div><div style="color:#ef4444;font-size:0.75rem;">↓ 3%</div></div>' +
        '</div>' +
        '<div style="height:80px;background:linear-gradient(90deg,' + theme.primary + '22 0%,' + theme.primary + '44 50%,' + theme.primary + '22 100%);border-radius:' + theme.borderRadius + ';display:flex;align-items:flex-end;padding:0.5rem;gap:2px;">' +
          [40,60,45,70,55,80,65,75,90,70,85,95].map(function(h) { return '<div style="flex:1;background:' + theme.primary + ';border-radius:2px;height:' + h + '%;"></div>'; }).join('') +
        '</div>' +
      '</div>';
    }

    if (type === 'contact') {
      return '<div style="' + card + '">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
          '<div><div style="' + label + '">First Name</div><input placeholder="John" style="' + input + '"></div>' +
          '<div><div style="' + label + '">Last Name</div><input placeholder="Doe" style="' + input + '"></div>' +
        '</div>' +
        '<div style="' + label + '">Email</div><input type="email" placeholder="john@example.com" style="' + input + '">' +
        '<div style="' + label + '">Subject</div>' +
        '<select style="' + input + '"><option>General Inquiry</option><option>Support</option><option>Sales</option><option>Partnership</option></select>' +
        '<div style="' + label + '">Message</div><textarea rows="4" placeholder="How can we help?" style="' + input + 'resize:none;"></textarea>' +
        '<button style="' + btn + '">Send Message</button>' +
      '</div>';
    }

    if (type === 'newsletter') {
      return '<div style="' + card + 'text-align:center;">' +
        '<div style="font-size:2.5rem;margin-bottom:0.5rem;">📬</div>' +
        '<div style="font-weight:600;font-size:1.1rem;color:' + theme.foreground + ';margin-bottom:0.5rem;">Stay in the loop</div>' +
        '<div style="color:' + theme.muted + ';font-size:0.9rem;margin-bottom:1.5rem;">Get the latest updates delivered to your inbox</div>' +
        '<div style="display:flex;gap:0.5rem;">' +
          '<input placeholder="Enter your email" style="' + input + 'flex:1;margin:0;">' +
          '<button style="padding:0.75rem 1.5rem;background:' + theme.primary + ';color:white;border:none;border-radius:' + theme.borderRadius + ';cursor:pointer;white-space:nowrap;">Subscribe</button>' +
        '</div>' +
        '<div style="color:' + theme.muted + ';font-size:0.75rem;margin-top:1rem;">No spam. Unsubscribe anytime.</div>' +
      '</div>';
    }

    if (type === 'testimonials') {
      return '<div style="' + card + '">' +
        '<div style="font-size:2rem;color:' + theme.primary + ';margin-bottom:0.5rem;">"</div>' +
        '<div style="color:' + theme.foreground + ';font-size:1rem;line-height:1.6;margin-bottom:1rem;">This product completely transformed how our team works. The intuitive interface and powerful features saved us countless hours every week.</div>' +
        '<div style="display:flex;align-items:center;gap:0.75rem;">' +
          '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,' + theme.primary + ',' + theme.primary + '88);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;">JD</div>' +
          '<div><div style="font-weight:600;color:' + theme.foreground + ';">Jane Doe</div><div style="font-size:0.8rem;color:' + theme.muted + ';">CEO at TechCorp</div></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem;">' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + theme.primary + ';"></div>' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + theme.border + ';"></div>' +
          '<div style="width:8px;height:8px;border-radius:50%;background:' + theme.border + ';"></div>' +
        '</div>' +
      '</div>';
    }

    if (type === 'blog') {
      return '<div style="display:flex;flex-direction:column;gap:1rem;">' +
        '<div style="' + card + 'display:flex;gap:1rem;padding:1rem;">' +
          '<div style="width:80px;height:60px;background:' + theme.primary + '22;border-radius:0.5rem;flex-shrink:0;"></div>' +
          '<div style="flex:1;"><div style="font-weight:600;color:' + theme.foreground + ';margin-bottom:0.25rem;">Getting Started Guide</div><div style="font-size:0.8rem;color:' + theme.muted + ';">Learn the basics in under 5 minutes</div></div>' +
        '</div>' +
        '<div style="' + card + 'display:flex;gap:1rem;padding:1rem;">' +
          '<div style="width:80px;height:60px;background:' + theme.primary + '22;border-radius:0.5rem;flex-shrink:0;"></div>' +
          '<div style="flex:1;"><div style="font-weight:600;color:' + theme.foreground + ';margin-bottom:0.25rem;">Advanced Techniques</div><div style="font-size:0.8rem;color:' + theme.muted + ';">Pro tips for power users</div></div>' +
        '</div>' +
      '</div>';
    }

    if (type === 'download') {
      return '<div style="' + card + '">' +
        '<div style="display:flex;flex-direction:column;gap:0.75rem;">' +
          '<button style="' + btn + 'display:flex;align-items:center;justify-content:center;gap:0.75rem;background:#000;"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg><div style="text-align:left;"><div style="font-size:0.7rem;opacity:0.8;">Download on the</div><div style="font-weight:600;">App Store</div></div></button>' +
          '<button style="' + btn + 'display:flex;align-items:center;justify-content:center;gap:0.75rem;background:#000;"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg><div style="text-align:left;"><div style="font-size:0.7rem;opacity:0.8;">Get it on</div><div style="font-weight:600;">Google Play</div></div></button>' +
        '</div>' +
        '<div style="text-align:center;margin-top:1rem;color:' + theme.muted + ';font-size:0.8rem;">Available on iOS 14+ and Android 8+</div>' +
      '</div>';
    }

    if (type === 'about') {
      return '<div style="' + card + 'text-align:center;">' +
        '<div style="font-size:1.5rem;margin-bottom:1rem;">🚀</div>' +
        '<div style="font-weight:600;font-size:1.1rem;color:' + theme.foreground + ';margin-bottom:0.75rem;">Our Mission</div>' +
        '<div style="color:' + theme.muted + ';font-size:0.9rem;line-height:1.6;margin-bottom:1.5rem;">We are building the future of productivity, one feature at a time. Founded in 2020, our team is passionate about creating tools that make work easier.</div>' +
        '<div style="display:flex;justify-content:center;gap:2rem;text-align:center;">' +
          '<div><div style="' + val + '">50+</div><div style="' + label + '">Team Members</div></div>' +
          '<div><div style="' + val + '">10M+</div><div style="' + label + '">Users</div></div>' +
          '<div><div style="' + val + '">99.9%</div><div style="' + label + '">Uptime</div></div>' +
        '</div>' +
      '</div>';
    }

    if (type === 'faq') {
      return '<div style="' + card + '">' +
        '<div style="border-bottom:1px solid ' + theme.border + ';padding:1rem 0;cursor:pointer;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:500;color:' + theme.foreground + ';">How do I get started?</span><span style="color:' + theme.muted + ';">−</span></div>' +
          '<div style="color:' + theme.muted + ';font-size:0.9rem;margin-top:0.75rem;">Sign up for a free account and follow our quick setup guide. You will be up and running in less than 5 minutes.</div>' +
        '</div>' +
        '<div style="border-bottom:1px solid ' + theme.border + ';padding:1rem 0;cursor:pointer;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:500;color:' + theme.foreground + ';">What payment methods do you accept?</span><span style="color:' + theme.muted + ';">+</span></div>' +
        '</div>' +
        '<div style="padding:1rem 0;cursor:pointer;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:500;color:' + theme.foreground + ';">Can I cancel anytime?</span><span style="color:' + theme.muted + ';">+</span></div>' +
        '</div>' +
      '</div>';
    }

    if (type === 'portfolio') {
      return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
        '<div style="aspect-ratio:1;background:linear-gradient(135deg,' + theme.primary + '33,' + theme.primary + '11);border-radius:' + theme.borderRadius + ';display:flex;align-items:center;justify-content:center;color:' + theme.primary + ';font-size:2rem;">🎨</div>' +
        '<div style="aspect-ratio:1;background:linear-gradient(135deg,' + theme.primary + '22,' + theme.primary + '44);border-radius:' + theme.borderRadius + ';display:flex;align-items:center;justify-content:center;color:' + theme.primary + ';font-size:2rem;">📱</div>' +
        '<div style="aspect-ratio:1;background:linear-gradient(135deg,' + theme.primary + '44,' + theme.primary + '22);border-radius:' + theme.borderRadius + ';display:flex;align-items:center;justify-content:center;color:' + theme.primary + ';font-size:2rem;">🌐</div>' +
        '<div style="aspect-ratio:1;background:linear-gradient(135deg,' + theme.primary + '11,' + theme.primary + '33);border-radius:' + theme.borderRadius + ';display:flex;align-items:center;justify-content:center;color:' + theme.primary + ';font-size:2rem;">✨</div>' +
      '</div>';
    }

    return '<div style="' + card + 'text-align:center;padding:3rem 1.5rem;">' +
      '<div style="color:' + theme.muted + ';font-size:0.9rem;">Page content preview</div>' +
    '</div>';
  }
  
  // ============================================================================
  // Intent System Integration - Comprehensive Label → Intent Mapping
  // ============================================================================
  const LABEL_INTENTS = {
    // AUTH
    'sign in': 'auth.signin', 'log in': 'auth.signin', 'login': 'auth.signin', 'member login': 'auth.signin',
    'sign up': 'auth.signup', 'register': 'auth.signup', 'get started': 'auth.signup', 'create account': 'auth.signup',
    'join now': 'auth.signup', 'sign up free': 'auth.signup', 'start now': 'auth.signup', 'join free': 'auth.signup',
    'sign out': 'auth.signout', 'log out': 'auth.signout', 'logout': 'auth.signout',
    
    // TRIALS & DEMOS
    'start free trial': 'trial.start', 'start trial': 'trial.start', 'free trial': 'trial.start', 'try free': 'trial.start',
    'try it free': 'trial.start', 'try for free': 'trial.start', 'get free trial': 'trial.start', 'begin trial': 'trial.start',
    'watch demo': 'demo.request', 'request demo': 'demo.request', 'see demo': 'demo.request', 'book demo': 'demo.request',
    'schedule demo': 'demo.request', 'get demo': 'demo.request', 'view demo': 'demo.request',
    
    // WAITLIST & BETA
    'join waitlist': 'join.waitlist', 'join the waitlist': 'join.waitlist', 'get early access': 'join.waitlist',
    'early access': 'join.waitlist', 'notify me': 'join.waitlist', 'coming soon': 'join.waitlist',
    'join beta': 'beta.apply', 'beta access': 'beta.apply', 'apply for beta': 'beta.apply',
    
    // NEWSLETTER & SUBSCRIBE
    'subscribe': 'newsletter.subscribe', 'get updates': 'newsletter.subscribe', 'join newsletter': 'newsletter.subscribe',
    'stay updated': 'newsletter.subscribe', 'get notified': 'newsletter.subscribe', 'keep me posted': 'newsletter.subscribe',
    'sign up for updates': 'newsletter.subscribe', 'subscribe now': 'newsletter.subscribe',
    
    // CONTACT & INQUIRY
    'contact': 'contact.submit', 'contact us': 'contact.submit', 'get in touch': 'contact.submit', 'send message': 'contact.submit',
    'reach out': 'contact.submit', 'talk to us': 'contact.submit', 'message us': 'contact.submit', 'let\\'s talk': 'contact.submit',
    'contact sales': 'sales.contact', 'talk to sales': 'sales.contact', 'speak to sales': 'sales.contact',
    
    // E-COMMERCE
    'add to cart': 'cart.add', 'add to bag': 'cart.add', 'add item': 'cart.add',
    'buy now': 'checkout.start', 'purchase': 'checkout.start', 'buy': 'checkout.start', 'order': 'checkout.start',
    'shop now': 'shop.browse', 'browse shop': 'shop.browse', 'explore shop': 'shop.browse', 'view products': 'shop.browse',
    'checkout': 'checkout.start', 'proceed to checkout': 'checkout.start', 'complete purchase': 'checkout.start',
    'view cart': 'cart.view', 'see cart': 'cart.view', 'my cart': 'cart.view', 'shopping cart': 'cart.view',
    'add to wishlist': 'wishlist.add', 'save for later': 'wishlist.add', 'save item': 'wishlist.add',
    'start your box': 'checkout.start', 'start my box': 'checkout.start', 'build your box': 'checkout.start',
    'customize box': 'checkout.start', 'choose plan': 'checkout.start', 'select plan': 'checkout.start',
    
    // BOOKING & RESERVATION
    'book now': 'booking.create', 'reserve': 'booking.create', 'reserve table': 'booking.create', 'book service': 'booking.create',
    'make reservation': 'booking.create', 'book appointment': 'booking.create', 'schedule now': 'booking.create',
    'reserve now': 'booking.create', 'book a table': 'booking.create', 'table for': 'booking.create',
    'book': 'booking.create', 'book this service': 'booking.create', 'request appointment': 'booking.create',
    'book with': 'booking.create', 'schedule appointment': 'booking.create', 'make booking': 'booking.create',
    'book a call': 'calendar.book', 'schedule call': 'calendar.book', 'book meeting': 'calendar.book',
    'book consultation': 'consultation.book', 'free consultation': 'consultation.book', 'schedule consultation': 'consultation.book',
    
    // QUOTES & ESTIMATES
    'get quote': 'quote.request', 'get free quote': 'quote.request', 'request quote': 'quote.request', 'free estimate': 'quote.request',
    'get estimate': 'quote.request', 'request estimate': 'quote.request', 'free quote': 'quote.request',
    'get pricing': 'quote.request', 'request pricing': 'quote.request',
    
    // PORTFOLIO & PROJECTS
    'hire me': 'project.inquire', 'work with me': 'project.inquire', 'hire us': 'project.inquire',
    'start a project': 'project.start', 'start project': 'project.start', 'new project': 'project.start',
    'view work': 'portfolio.view', 'see work': 'portfolio.view', 'our work': 'portfolio.view', 'view portfolio': 'portfolio.view',
    'case study': 'case.study', 'view case study': 'case.study', 'read case study': 'case.study',
    'download resume': 'resume.download', 'download cv': 'resume.download', 'get resume': 'resume.download',
    
    // RESTAURANT & FOOD
    'order online': 'order.online', 'order now': 'order.online', 'order food': 'order.online', 'place order': 'order.online',
    'order pickup': 'order.pickup', 'pickup order': 'order.pickup', 'curbside pickup': 'order.pickup',
    'order delivery': 'order.delivery', 'get delivery': 'order.delivery', 'deliver to me': 'order.delivery',
    'view menu': 'menu.view', 'see menu': 'menu.view', 'our menu': 'menu.view', 'browse menu': 'menu.view',
    'gift card': 'gift.purchase', 'buy gift card': 'gift.purchase', 'gift cards': 'gift.purchase',
    'private event': 'event.inquire', 'book event': 'event.inquire', 'host event': 'event.inquire',
    
    // CONTENT & BLOG
    'read more': 'content.read', 'continue reading': 'content.read', 'read article': 'content.read', 'learn more': 'content.read',
    'share': 'content.share', 'share article': 'content.share', 'share post': 'content.share',
    'bookmark': 'content.bookmark', 'save article': 'content.bookmark', 'save post': 'content.bookmark',
    'follow': 'author.follow', 'follow author': 'author.follow', 'follow writer': 'author.follow',
    
    // CONTRACTOR & EMERGENCY
    'call now': 'call.now', 'call us': 'call.now', 'phone us': 'call.now', 'give us a call': 'call.now',
    'emergency': 'emergency.service', 'emergency service': 'emergency.service', '24/7 service': 'emergency.service',
    'urgent help': 'emergency.service', 'need help now': 'emergency.service',
    
    // NAVIGATION & PRICING
    'see plans': 'pricing.view', 'view plans': 'pricing.view', 'pricing': 'pricing.view', 'our plans': 'pricing.view',
    'compare plans': 'pricing.view', 'see pricing': 'pricing.view', 'view pricing': 'pricing.view'
  };
  
  function inferIntent(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim().replace(/[^a-z0-9\\s]/g, '');
    // Exact match first
    if (LABEL_INTENTS[lower]) return LABEL_INTENTS[lower];
    // Partial match - check if label contains any key or key contains label
    for (const key in LABEL_INTENTS) {
      const cleanKey = key.replace(/[^a-z0-9\\s]/g, '');
      if (lower.includes(cleanKey) || cleanKey.includes(lower)) return LABEL_INTENTS[key];
    }
    // Word-based matching for compound phrases
    const words = lower.split(/\\s+/);
    for (const key in LABEL_INTENTS) {
      const keyWords = key.split(/\\s+/);
      if (keyWords.every(kw => words.includes(kw))) return LABEL_INTENTS[key];
    }
    return null;
  }
  
  function collectPayload(el) {
    const payload = {};
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-') && attr.name !== 'data-intent' && attr.name !== 'data-ut-intent' && attr.name !== 'data-ut-cta' && attr.name !== 'data-ut-section') {
        const key = attr.name.replace('data-', '').replace(/-([a-z])/g, function(_, l) { return l.toUpperCase(); });
        try { payload[key] = JSON.parse(attr.value); } catch(e) { payload[key] = attr.value; }
      }
    });
    const form = el.closest('form');
    if (form) {
      new FormData(form).forEach(function(v, k) { if (typeof v === 'string') payload[k] = v; });
    }
    return payload;
  }
  
  // ============================================================================
  // Booking/Form Confirmation Page
  // ============================================================================
  function showConfirmationPage(intent, payload, result, theme) {
    if (!theme) theme = extractTheme();
    
    // Remove existing overlay if any
    if (currentOverlay) currentOverlay.remove();
    
    var overlay = document.createElement('div');
    overlay.id = 'preview-confirmation-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;overflow-y:auto;background:' + theme.background + ';font-family:' + theme.fontFamily + ';opacity:0;transition:opacity 0.3s ease;';
    
    currentOverlay = overlay;
    
    var isBooking = intent.includes('booking');
    var isContact = intent.includes('contact');
    var isNewsletter = intent.includes('newsletter');
    
    // Build confirmation content based on intent type
    var icon, title, subtitle, details;
    
    if (isBooking) {
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="' + theme.primary + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>';
      title = 'Appointment Request Received!';
      subtitle = 'We\\'ll confirm your booking shortly';
      
      var serviceName = payload.service || payload.serviceName || payload.serviceType || 'Your appointment';
      var customerName = payload.name || payload.customerName || 'Valued Customer';
      var customerEmail = payload.email || payload.customerEmail || '';
      var date = payload.date || payload.preferredDate || '';
      var time = payload.time || payload.preferredTime || '';
      var confirmationId = (result && result.bookingId) || (result && result.confirmationId) || 'BK-' + Date.now().toString(36).toUpperCase();
      
      details = '<div style="background:' + theme.cardBg + ';border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';padding:1.5rem;margin:1.5rem 0;text-align:left;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid ' + theme.border + ';">' +
          '<span style="font-size:0.85rem;color:' + theme.muted + ';">Confirmation #</span>' +
          '<span style="font-family:monospace;font-weight:600;color:' + theme.primary + ';">' + confirmationId + '</span>' +
        '</div>' +
        '<div style="display:grid;gap:0.75rem;">' +
          '<div style="display:flex;justify-content:space-between;"><span style="color:' + theme.muted + ';font-size:0.9rem;">Service</span><span style="font-weight:500;color:' + theme.foreground + ';">' + serviceName + '</span></div>' +
          (date ? '<div style="display:flex;justify-content:space-between;"><span style="color:' + theme.muted + ';font-size:0.9rem;">Date</span><span style="font-weight:500;color:' + theme.foreground + ';">' + date + '</span></div>' : '') +
          (time ? '<div style="display:flex;justify-content:space-between;"><span style="color:' + theme.muted + ';font-size:0.9rem;">Time</span><span style="font-weight:500;color:' + theme.foreground + ';">' + time + '</span></div>' : '') +
          '<div style="display:flex;justify-content:space-between;"><span style="color:' + theme.muted + ';font-size:0.9rem;">Name</span><span style="font-weight:500;color:' + theme.foreground + ';">' + customerName + '</span></div>' +
          (customerEmail ? '<div style="display:flex;justify-content:space-between;"><span style="color:' + theme.muted + ';font-size:0.9rem;">Email</span><span style="font-weight:500;color:' + theme.foreground + ';">' + customerEmail + '</span></div>' : '') +
        '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:1rem;">' +
        '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(34,197,94,0.1);border-radius:' + theme.borderRadius + ';">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
          '<span style="font-size:0.9rem;color:' + theme.foreground + ';">Confirmation email will be sent shortly</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(59,130,246,0.1);border-radius:' + theme.borderRadius + ';">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
          '<span style="font-size:0.9rem;color:' + theme.foreground + ';">We may call to confirm your appointment</span>' +
        '</div>' +
      '</div>';
    } else if (isContact) {
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="' + theme.primary + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/><path d="M9 16l2 2 4-4" stroke="#22c55e" stroke-width="2"/></svg>';
      title = 'Message Sent!';
      subtitle = 'Thank you for reaching out';
      details = '<div style="background:' + theme.cardBg + ';border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';padding:1.5rem;margin:1.5rem 0;text-align:center;">' +
        '<p style="color:' + theme.foreground + ';margin:0 0 1rem 0;">We\\'ve received your message and will get back to you within 24 hours.</p>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;color:' + theme.muted + ';font-size:0.9rem;">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
          '<span>Typical response time: 2-4 hours</span>' +
        '</div>' +
      '</div>';
    } else if (isNewsletter) {
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="' + theme.primary + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
      title = 'You\\'re Subscribed!';
      subtitle = 'Welcome to our newsletter';
      details = '<div style="background:' + theme.cardBg + ';border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';padding:1.5rem;margin:1.5rem 0;text-align:center;">' +
        '<p style="color:' + theme.foreground + ';margin:0;">You\\'ll receive our latest updates, tips, and exclusive offers straight to your inbox.</p>' +
      '</div>';
    } else {
      icon = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="' + theme.primary + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      title = 'Success!';
      subtitle = 'Your request has been processed';
      details = '<div style="background:' + theme.cardBg + ';border:1px solid ' + theme.border + ';border-radius:' + theme.borderRadius + ';padding:1.5rem;margin:1.5rem 0;text-align:center;">' +
        '<p style="color:' + theme.foreground + ';margin:0;">We\\'ve received your submission and will be in touch soon.</p>' +
      '</div>';
    }
    
    overlay.innerHTML = '<div style="width:100%;max-width:480px;padding:2rem;text-align:center;">' +
      '<div style="width:80px;height:80px;margin:0 auto 1.5rem;background:rgba(34,197,94,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
      '</div>' +
      '<h1 style="font-size:1.75rem;font-weight:700;color:' + theme.foreground + ';margin:0 0 0.5rem 0;">' + title + '</h1>' +
      '<p style="color:' + theme.muted + ';margin:0 0 1rem 0;font-size:1rem;">' + subtitle + '</p>' +
      details +
      '<div style="display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;">' +
        '<button onclick="window.__closeConfirmationOverlay()" style="padding:0.75rem 2rem;background:' + theme.primary + ';color:white;border:none;border-radius:' + theme.borderRadius + ';font-size:0.95rem;font-weight:500;cursor:pointer;">Continue</button>' +
      '</div>' +
      '<p style="margin-top:1.5rem;font-size:0.8rem;color:' + theme.muted + ';">This is a preview demonstration</p>' +
    '</div>';
    
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(function() {
      overlay.style.opacity = '1';
    });
    
    // Close handler - return to origin
    window.__closeConfirmationOverlay = function() {
      overlay.style.opacity = '0';
      setTimeout(function() {
        overlay.remove();
        currentOverlay = null;
        delete window.__closeConfirmationOverlay;
      }, 300);
    };
    
    // ESC to close
    function escHandler(e) {
      if (e.key === 'Escape') {
        window.__closeConfirmationOverlay();
        document.removeEventListener('keydown', escHandler);
      }
    }
    document.addEventListener('keydown', escHandler);
  }
  
  // Track pending intents for confirmation page display
  var pendingIntents = {};
  
  function triggerIntent(intent, payload, element) {
    console.log('[Preview] Intent triggered:', intent, payload);
    
    // Generate a request ID for tracking
    var requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Store pending intent info
    pendingIntents[requestId] = {
      intent: intent,
      payload: payload,
      element: element,
      timestamp: Date.now()
    };
    
    // Add loading state
    if (element) {
      element.classList.add('intent-loading');
      element.disabled = true;
    }
    
    // Post message to parent window for handling
    window.parent.postMessage({
      type: 'INTENT_TRIGGER',
      intent: intent,
      payload: payload,
      requestId: requestId
    }, '*');
    
    // For booking/contact/newsletter intents, wait for result to show confirmation
    var isConfirmableIntent = intent.includes('booking') || intent.includes('contact') || intent.includes('newsletter') || intent.includes('quote') || intent.includes('form');
    
    if (isConfirmableIntent) {
      // Set timeout for fallback (if parent doesn't respond)
      setTimeout(function() {
        if (pendingIntents[requestId]) {
          delete pendingIntents[requestId];
          if (element) {
            element.classList.remove('intent-loading');
            element.classList.add('intent-success');
            element.disabled = false;
          }
          // Show confirmation page with mock success
          if (!theme) theme = extractTheme();
          showConfirmationPage(intent, payload, { success: true }, theme);
        }
      }, 2000);
    } else {
      // Non-confirmable intents: just reset button after short delay
      if (element) {
        setTimeout(function() {
          element.classList.remove('intent-loading');
          element.classList.add('intent-success');
          element.disabled = false;
          setTimeout(function() { element.classList.remove('intent-success'); }, 2000);
        }, 500);
      }
    }
  }
  
  // Listen for intent results from parent
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'INTENT_RESULT') return;
    
    var requestId = e.data.requestId;
    var result = e.data.result || {};
    
    console.log('[Preview] Intent result received:', requestId, result);
    
    var pending = pendingIntents[requestId];
    if (!pending) return;
    
    delete pendingIntents[requestId];
    
    // Reset element state
    if (pending.element) {
      pending.element.classList.remove('intent-loading');
      pending.element.classList.add('intent-success');
      pending.element.disabled = false;
    }
    
    // Show confirmation page for successful confirmable intents
    if (result.success !== false) {
      if (!theme) theme = extractTheme();
      showConfirmationPage(pending.intent, pending.payload, result, theme);
    }
  });
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  let theme = null;
  
  // Intercept all link and button clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    const button = e.target.closest('button, [role="button"], [data-intent], [data-ut-intent]');
    const el = link || button;
    
    if (!el) return;
    
    // Check for explicit data-intent or data-ut-intent attribute (data-ut-intent takes precedence)
    const intentAttr = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
    if (intentAttr === 'none' || intentAttr === 'ignore') {
      // Explicitly marked as no intent - allow default behavior or show overlay
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        if (!theme) theme = extractTheme();
        createRedirectOverlay(detectNavigationType(link, link.getAttribute('href')), theme, link.textContent.trim(), link.getAttribute('href'));
      }
      return;
    }
    
    // Determine intent from attribute or text
    const text = el.textContent ? el.textContent.trim() : '';
    const intent = intentAttr || inferIntent(text) || inferIntent(el.getAttribute('aria-label'));
    
    if (intent) {
      // Intent found - trigger it via parent window
      e.preventDefault();
      e.stopPropagation();
      triggerIntent(intent, collectPayload(el), el);
      return;
    }
    
    // No intent - handle navigation for links, run button automations for buttons
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      
      const href = link.getAttribute('href');
      console.log('[Preview] Link clicked (no intent):', href);
      
      // Check for internal navigation patterns
      if (href && (href.startsWith('#') || href.startsWith('/'))) {
        // Internal navigation - try to scroll to anchor or handle as page nav
        if (href.startsWith('#')) {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }
        // Page navigation - trigger nav intent
        triggerIntent('nav.goto', { path: href, text: text }, link);
        return;
      }
      
      // External links - open in new tab or trigger external nav intent
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        triggerIntent('nav.external', { url: href, text: text }, link);
        return;
      }
      
      // Fallback: show overlay for complex navigation
      if (!theme) theme = extractTheme();
      const navType = detectNavigationType(link, href);
      createRedirectOverlay(navType, theme, text, href);
    } else if (button) {
      // BUTTONS: No overlay - fire automation event or show visual feedback
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[Preview] Button clicked - triggering automation:', text);
      
      // Infer intent from button context/text for automation routing
      const buttonId = button.id || button.getAttribute('data-button-id') || '';
      const buttonType = button.getAttribute('type') || 'button';
      const ariaLabel = button.getAttribute('aria-label') || '';
      
      // Fire a generic button automation event that the automation engine can route
      triggerIntent('button.click', {
        buttonId: buttonId,
        buttonLabel: text,
        buttonType: buttonType,
        ariaLabel: ariaLabel,
        classList: button.className || '',
        timestamp: new Date().toISOString()
      }, button);
    }
  }, true);
  
  // Handle form submissions with intent
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (!form) return;
    
    // Check for form intent (data-ut-intent takes precedence over data-intent)
    let intent = form.getAttribute('data-ut-intent') || form.getAttribute('data-intent');
    if (!intent) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) intent = btn.getAttribute('data-ut-intent') || btn.getAttribute('data-intent') || inferIntent(btn.textContent);
    }
    if (!intent) {
      const id = (form.id || '').toLowerCase();
      const cls = (form.className || '').toLowerCase();
      if (id.includes('contact') || cls.includes('contact')) intent = 'contact.submit';
      else if (id.includes('newsletter') || cls.includes('subscribe')) intent = 'newsletter.subscribe';
      else if (id.includes('waitlist')) intent = 'join.waitlist';
      else if (id.includes('booking') || id.includes('reservation')) intent = 'booking.create';
    }
    
    if (intent) {
      e.preventDefault();
      e.stopPropagation();
      
      const payload = {};
      new FormData(form).forEach(function(v, k) { if (typeof v === 'string') payload[k] = v; });
      
      triggerIntent(intent, payload, form.querySelector('button[type="submit"]'));
      return;
    }
    
    // No explicit intent - infer from form and fire automation event (no overlay)
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[Preview] Form submit - triggering automation');
    
    // Collect form data
    const payload = {};
    new FormData(form).forEach(function(v, k) { if (typeof v === 'string') payload[k] = v; });
    
    // Determine form type from structure
    const hasEmail = form.querySelector('input[type="email"]');
    const hasPhone = form.querySelector('input[type="tel"]');
    const hasPassword = form.querySelector('input[type="password"]');
    const hasDate = form.querySelector('input[type="date"], input[type="datetime-local"]');
    
    let formIntent = 'form.submit'; // Default generic form intent
    
    if (hasPassword) {
      formIntent = 'auth.login';
    } else if (hasDate && (hasEmail || hasPhone)) {
      formIntent = 'booking.create';
    } else if (hasEmail && !hasPhone) {
      formIntent = 'newsletter.subscribe';
    } else if (hasEmail || hasPhone) {
      formIntent = 'contact.submit';
    }
    
    // Fire the automation intent
    triggerIntent(formIntent, {
      ...payload,
      formId: form.id || '',
      formName: form.getAttribute('name') || form.getAttribute('aria-label') || '',
      formAction: form.getAttribute('action') || '',
      timestamp: new Date().toISOString()
    }, form.querySelector('button[type="submit"]'));
  }, true);
  
  // ============================================================================
  // Parent Window Command Handler (for booking.scroll, etc.)
  // ============================================================================
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'INTENT_COMMAND') return;
    
    var command = e.data.command;
    var requestId = e.data.requestId;
    
    console.log('[Preview] Received command:', command, requestId);
    
    if (command === 'booking.scroll') {
      // Find booking form on page
      var bookingForm = document.querySelector(
        'form[data-booking], form[id*="booking"], form[class*="booking"], ' +
        'form[id*="reservation"], form[class*="reservation"], ' +
        'form[id*="appointment"], form[class*="appointment"], ' +
        '[data-section="booking"], [id*="booking-form"], ' +
        '#booking, #reservation, #appointment, .booking-form, .reservation-form'
      );
      
      // Fallback: find any form with date/time inputs
      if (!bookingForm) {
        var forms = document.querySelectorAll('form');
        for (var i = 0; i < forms.length; i++) {
          var form = forms[i];
          var hasDate = form.querySelector('input[type="date"], input[type="datetime-local"], select[name*="date"], select[name*="time"]');
          var hasName = form.querySelector('input[name*="name"], input[name*="client"], input[name*="customer"]');
          if (hasDate && hasName) {
            bookingForm = form;
            break;
          }
        }
      }
      
      var handled = false;
      if (bookingForm) {
        bookingForm.scrollIntoView({ behavior: 'auto', block: 'center' });
        // Focus first input after tiny delay
        setTimeout(function() {
          var firstInput = bookingForm.querySelector('input:not([type="hidden"]), select, textarea');
          if (firstInput) firstInput.focus();
        }, 50);
        handled = true;
        console.log('[Preview] Scrolled to booking form');
      } else {
        console.log('[Preview] No booking form found on page');
      }
      
      // Reply to parent
      window.parent.postMessage({
        type: 'INTENT_COMMAND_RESULT',
        command: command,
        requestId: requestId,
        handled: handled
      }, '*');
    }
  });
  
  console.log('[Preview] Smart navigation system initialized');
})();
</script>
`;

/**
 * Inject smart navigation script into HTML content
 */
function injectNavigationPrevention(html: string): string {
  // Try to inject before </body> for proper DOM access
  if (html.includes('</body>')) {
    return html.replace('</body>', SMART_NAVIGATION_SCRIPT + '</body>');
  }
  // Try to inject before </html>
  if (html.includes('</html>')) {
    return html.replace('</html>', SMART_NAVIGATION_SCRIPT + '</html>');
  }
  // Fallback: append to end
  return html + SMART_NAVIGATION_SCRIPT;
}

/**
 * Convert React JSX to static HTML for fallback preview
 * Also handles pure HTML files directly
 */
function convertToStaticHTML(files: Record<string, string>): string {
  // First check if any file is already a complete HTML document
  const htmlFile = Object.entries(files).find(([path, content]) => 
    (path.endsWith('.html') || path.endsWith('.htm')) && isCompleteHTML(content)
  );
  
  if (htmlFile) {
    return injectNavigationPrevention(htmlFile[1]); // Inject script and return
  }

  // Check if the App file or any main file is actually HTML
  const appFile = Object.entries(files).find(([path]) => 
    path.includes('App.tsx') || path.includes('App.jsx') || path.includes('App.ts') || path.includes('App.js')
  );
  
  if (appFile && isCompleteHTML(appFile[1])) {
    return injectNavigationPrevention(appFile[1]); // Inject script and return
  }

  // Check if there's any file that's complete HTML
  const anyHtmlFile = Object.entries(files).find(([_, content]) => isCompleteHTML(content));
  if (anyHtmlFile) {
    return injectNavigationPrevention(anyHtmlFile[1]); // Inject script and return
  }

  const appContent = appFile?.[1] || '';
  
  // Extract JSX from the return statement
  const returnMatch = appContent.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}?\s*$/);
  let jsx = returnMatch?.[1] || '<div class="p-8 text-center text-gray-500">Preview unavailable - no content found</div>';
  
  // Clean up JSX for HTML
  // Convert className to class
  jsx = jsx.replace(/className=/g, 'class=');
  
  // Remove React-specific attributes
  jsx = jsx.replace(/\s(onClick|onChange|onSubmit|onFocus|onBlur|ref)=\{[^}]+\}/g, '');
  
  // Convert self-closing tags to HTML
  jsx = jsx.replace(/<(\w+)([^>]*)\s*\/>/g, '<$1$2></$1>');
  
  // Remove {expressions} - replace with placeholder or remove
  jsx = jsx.replace(/\{[^}]+\}/g, '');
  
  // Find CSS content
  const cssFile = Object.entries(files).find(([path]) => path.includes('.css'));
  const cssContent = cssFile?.[1] || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${cssContent}
    
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --primary: 221.2 83.2% 53.3%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --destructive: 0 84.2% 60.2%;
      --border: 214.3 31.8% 91.4%;
      --radius: 0.75rem;
    }
    
    * { border-color: hsl(var(--border)); }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="root">
    ${jsx}
  </div>
  ${SMART_NAVIGATION_SCRIPT}
</body>
</html>`;
}

const HTMLFallbackPreview: React.FC<{
  files: Record<string, string>;
  onRetry: () => void;
  isPureHTML?: boolean;
}> = ({ files, onRetry, isPureHTML = false }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const htmlContent = useMemo(() => {
    const content = convertToStaticHTML(files);
    console.log('[HTMLFallbackPreview] Generated HTML length:', content.length);
    console.log('[HTMLFallbackPreview] HTML preview (first 500 chars):', content.substring(0, 500));
    return content;
  }, [files]);


  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      console.log('[HTMLFallbackPreview] Setting iframe content via Blob URL');
      // Use Blob URL to ensure inline scripts execute
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      // Cleanup Blob URL on unmount or content change
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [htmlContent]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Banner - different for pure HTML vs fallback */}
      {isPureHTML ? (
        <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">HTML Preview</span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">Static HTML Preview (Sandpack unavailable)</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRetry}
            className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry Sandpack
          </Button>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="HTML Preview"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};

// ============================================================================
// CodeSandbox Preview Component
// ============================================================================

const CodeSandboxPreview: React.FC<{
  files: Record<string, string>;
  projectId: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  onFallback: () => void;
}> = ({ files, projectId, onReady, onError, onFallback }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<CodeSandboxSession | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const createSandbox = async () => {
      setStatus('loading');
      try {
        const csSession = await createCodeSandbox(files, { title: projectId });
        
        if (cancelled) return;
        
        setSession(csSession);
        setStatus('ready');
        onReady?.();
      } catch (error) {
        if (cancelled) return;
        
        const message = error instanceof Error ? error.message : 'Failed to create CodeSandbox';
        setErrorMessage(message);
        setStatus('error');
        onError?.(message);
        
        // Fallback after 3 seconds
        setTimeout(() => {
          if (!cancelled) onFallback();
        }, 3000);
      }
    };

    createSandbox();

    return () => {
      cancelled = true;
    };
  }, [projectId]); // Only recreate on projectId change

  if (status === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="flex items-center gap-3">
          <Code2 className="w-6 h-6 text-purple-500" />
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Creating CodeSandbox...</p>
          <p className="text-xs text-slate-500 mt-1">Setting up cloud preview</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-red-50 gap-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <div className="text-center">
          <p className="text-sm font-medium text-red-700">CodeSandbox Unavailable</p>
          <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
          <p className="text-xs text-slate-500 mt-2">Falling back to Sandpack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* CodeSandbox banner */}
      <div className="bg-purple-50 border-b border-purple-200 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-800">
          <Code2 className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">CodeSandbox Cloud</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={session?.editorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-600 hover:text-purple-800 underline"
          >
            Open in Editor
          </a>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
      </div>
      
      <iframe
        ref={iframeRef}
        src={session?.embedUrl}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        title="CodeSandbox Preview"
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
      />
    </div>
  );
};

// ============================================================================
// Runtime Preview Component (ECS Vite Container)
// ============================================================================

const PATCH_DEBOUNCE_MS = 300;

const RuntimePreview: React.FC<{
  files: Record<string, string>;
  projectId: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  onFallback: () => void;
  onSessionStart?: (session: PreviewSession) => void;
}> = ({ files, projectId, onReady, onError, onFallback, onSessionStart }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<PreviewSession | null>(null);
  const [status, setStatus] = useState<'connecting' | 'running' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastPatchedRef = useRef<Record<string, string>>({});
  const patchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Start session on mount
  useEffect(() => {
    mountedRef.current = true;
    
    const initSession = async () => {
      setStatus('connecting');
      
      // Ensure files have required Vite root files
      const completeFiles = ensureViteRootFiles(files);
      
      const result = await startPreviewSession(projectId, completeFiles);
      
      if (!mountedRef.current) return;
      
      if (result.success && result.session) {
        setSession(result.session);
        setStatus('running');
        lastPatchedRef.current = { ...completeFiles };
        onSessionStart?.(result.session);
        onReady?.();
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to start preview session');
        onError?.(result.error || 'Failed to start preview session');
        
        // Fallback to Sandpack after 3 seconds
        setTimeout(() => {
          if (mountedRef.current) {
            onFallback();
          }
        }, 3000);
      }
    };
    
    initSession();
    
    return () => {
      mountedRef.current = false;
      // Session cleanup is handled by the parent component
    };
  }, [projectId]); // Only re-init on projectId change

  // Debounced file patching for HMR
  useEffect(() => {
    if (!session || status !== 'running') return;
    
    // Find changed files
    const changedFiles: Array<{ path: string; content: string }> = [];
    
    for (const [path, content] of Object.entries(files)) {
      if (lastPatchedRef.current[path] !== content) {
        changedFiles.push({ path, content });
      }
    }
    
    if (changedFiles.length === 0) return;
    
    // Clear existing timeout
    if (patchTimeoutRef.current) {
      clearTimeout(patchTimeoutRef.current);
    }
    
    // Debounce patches
    patchTimeoutRef.current = setTimeout(async () => {
      for (const { path, content } of changedFiles) {
        const result = await patchFile(session.id, path, content);
        if (result.success) {
          lastPatchedRef.current[path] = content;
        } else {
          console.warn(`[RuntimePreview] Failed to patch ${path}:`, result.error);
        }
      }
    }, PATCH_DEBOUNCE_MS);
    
    return () => {
      if (patchTimeoutRef.current) {
        clearTimeout(patchTimeoutRef.current);
      }
    };
  }, [files, session, status]);

  // Render based on status
  if (status === 'connecting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-blue-500 animate-pulse" />
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Starting Vite Runtime...</p>
          <p className="text-xs text-slate-500 mt-1">Provisioning ECS container with HMR support</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-red-50 gap-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <div className="text-center">
          <p className="text-sm font-medium text-red-700">Runtime Preview Unavailable</p>
          <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
          <p className="text-xs text-slate-500 mt-2">Falling back to Sandpack preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Runtime status banner */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-800">
          <Zap className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Vite Runtime (HMR Active)</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 rounded-full text-emerald-700">
            Session: {session?.id.slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-600">Live</span>
        </div>
      </div>
      
      {/* Preview iframe */}
      <iframe
        ref={iframeRef}
        src={session?.iframeUrl}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Vite Runtime Preview"
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
      />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SimplePreview = forwardRef<SimplePreviewHandle, SimplePreviewProps>(({
  files,
  projectId = 'default',
  activeFile = '/src/App.tsx',
  className,
  onReady,
  onError,
  showConsole = false,
  showNavigator = false,
  forceMode,
  disableRuntime = true, // Default to Sandpack until ECS backend is deployed
  enableRuntime = false, // Set to true to enable runtime mode
  useCodeSandbox = false, // Use CodeSandbox cloud instead of local Sandpack
}, ref) => {
  const [key, setKey] = useState(0);
  
  // Check if any file is a complete HTML document (not React)
  const hasPureHTML = useMemo(() => {
    const result = Object.entries(files).some(([path, content]) => {
      const isHtml = path.endsWith('.html') || path.endsWith('.htm') || isCompleteHTML(content);
      if (isHtml) {
        console.log('[SimplePreview] Detected pure HTML in:', path);
      }
      return isHtml;
    });
    console.log('[SimplePreview] hasPureHTML:', result, 'Files:', Object.keys(files));
    return result;
  }, [files]);
  
  // Determine the best mode: runtime > codesandbox > sandpack > html (for pure HTML)
  const useRuntimeMode = enableRuntime && !disableRuntime;
  const getDefaultMode = (): PreviewMode => {
    if (forceMode) return forceMode;
    // If content is pure HTML, use HTML mode directly
    if (hasPureHTML) return 'html';
    if (useRuntimeMode) return 'runtime';
    if (useCodeSandbox) return 'codesandbox';
    return 'sandpack';
  };
  const [mode, setMode] = useState<PreviewMode>(getDefaultMode());
  const [hasError, setHasError] = useState(false);
  const sessionRef = useRef<PreviewSession | null>(null);

  // Expose refresh method and session access
  useImperativeHandle(ref, () => ({
    refresh: () => {
      setHasError(false);
      setMode(getDefaultMode());
      setKey(k => k + 1);
    },
    getSession: () => sessionRef.current,
    stopSession: async () => {
      if (sessionRef.current) {
        await stopPreviewSession(sessionRef.current.id);
        sessionRef.current = null;
        clearCurrentSession();
      }
    },
    openInCodeSandbox: () => {
      openInCodeSandbox(files);
    }
  }));

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        stopPreviewSession(sessionRef.current.id);
        sessionRef.current = null;
        clearCurrentSession();
      }
    };
  }, []);

  // Update mode when content type changes (e.g., from React to HTML)
  useEffect(() => {
    if (hasPureHTML && mode !== 'html' && !forceMode) {
      setMode('html');
    } else if (!hasPureHTML && mode === 'html' && !forceMode) {
      setMode(getDefaultMode());
    }
  }, [hasPureHTML, forceMode]);

  // Prepare files for Sandpack (only when not in HTML mode)
  const sandpackFiles = useMemo(() => {
    if (hasPureHTML) return files; // Pass through for HTML mode
    return prepareFiles(files);
  }, [files, hasPureHTML]);

  // Determine entry file
  const entryFile = useMemo(() => {
    // Check if activeFile exists in processed files
    if (sandpackFiles[activeFile]) return activeFile;
    
    // Try common entry points
    const candidates = ['/src/App.tsx', '/App.tsx', '/src/App.jsx', '/App.jsx'];
    for (const candidate of candidates) {
      if (sandpackFiles[candidate]) return candidate;
    }
    
    // Fallback to first TSX/JSX file
    const firstCode = Object.keys(sandpackFiles).find(p => /\.(tsx?|jsx?)$/.test(p));
    return firstCode || '/App.tsx';
  }, [sandpackFiles, activeFile]);

  const handleError = useCallback((error: string) => {
    setHasError(true);
    onError?.(error);
  }, [onError]);

  const handleTimeout = useCallback(() => {
    console.warn('[SimplePreview] Sandpack timeout - falling back to HTML preview');
    setMode('html');
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setMode(getDefaultMode());
    setKey(k => k + 1);
  }, [forceMode, useRuntimeMode, useCodeSandbox]);

  const handleRuntimeFallback = useCallback(() => {
    console.warn('[SimplePreview] Runtime unavailable - falling back to Sandpack');
    setMode(useCodeSandbox ? 'codesandbox' : 'sandpack');
  }, [useCodeSandbox]);

  const handleSessionStart = useCallback((session: PreviewSession) => {
    sessionRef.current = session;
  }, []);

  // Runtime mode (ECS Vite container)
  if (mode === 'runtime') {
    return (
      <div className={cn('w-full h-full flex flex-col min-h-0 bg-background', className)} key={key}>
        <RuntimePreview
          files={files}
          projectId={projectId}
          onReady={onReady}
          onError={handleError}
          onFallback={handleRuntimeFallback}
          onSessionStart={handleSessionStart}
        />
      </div>
    );
  }

  // CodeSandbox mode (cloud preview)
  if (mode === 'codesandbox') {
    return (
      <div className={cn('w-full h-full flex flex-col min-h-0 bg-background', className)} key={key}>
        <CodeSandboxPreview
          files={files}
          projectId={projectId}
          onReady={onReady}
          onError={handleError}
          onFallback={() => setMode('sandpack')}
        />
      </div>
    );
  }

  // HTML fallback mode (also used for pure HTML content)
  if (mode === 'html') {
    return (
      <div className={cn('w-full h-full flex flex-col min-h-0 bg-background', className)}>
        <HTMLFallbackPreview 
          files={hasPureHTML ? files : sandpackFiles} 
          onRetry={handleRetry} 
          isPureHTML={hasPureHTML}
        />
      </div>
    );
  }

  // Sandpack mode (default fallback)
  return (
    <div className={cn('w-full h-full flex flex-col min-h-0 bg-background', className)} key={key}>
      {hasError && (
        <div className="absolute top-10 left-2 right-2 z-20 bg-destructive/10 border border-destructive/20 rounded-md p-2 flex items-center justify-between">
          <span className="text-xs text-destructive">Preview encountered an error</span>
          <Button variant="ghost" size="sm" onClick={handleRetry} className="h-6 px-2 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      <SandpackProvider
        template="react-ts"
        files={sandpackFiles}
        theme="light"
        options={{
          externalResources: ['https://cdn.tailwindcss.com'],
          activeFile: entryFile,
          visibleFiles: [entryFile],
          autorun: true,
          autoReload: true,
          recompileMode: 'delayed',
          recompileDelay: 300,
        }}
        customSetup={{
          dependencies: BUNDLED_DEPENDENCIES,
        }}
      >
        <PreviewInner
          onReady={onReady}
          onError={handleError}
          onTimeout={handleTimeout}
          showNavigator={showNavigator}
          showConsole={showConsole}
        />
      </SandpackProvider>
    </div>
  );
});

SimplePreview.displayName = 'SimplePreview';

export default SimplePreview;
