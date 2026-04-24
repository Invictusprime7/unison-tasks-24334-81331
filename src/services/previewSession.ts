/**
 * Preview Session Service
 * 
 * Manages ECS Vite runtime preview sessions:
 * - Start: Create session with VFS snapshot
 * - Patch: Send file updates for HMR
 * - Logs: Stream stdout/stderr
 * - Stop: Terminate session
 * - Keepalive: Ping to maintain session
 * 
 * Architecture:
 * VFS → FileMap Snapshot → ECS Worker (Vite) → Gateway → iframe
 */

import { extractDependencies } from '@/utils/dependencyExtractor';
import type { RuntimeManifest } from '@/types/runtimeManifest';

// ============================================
// TYPES
// ============================================

/**
 * FileMap: The standard format for VFS snapshots
 * Key = path (e.g., "/src/App.tsx")
 * Value = file content
 */
export type FileMap = Record<string, string>;

export interface PreviewSession {
  id: string;
  projectId: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  iframeUrl: string;
  createdAt: string;
  lastActivityAt: string;
  error?: string;
}

export interface StartSessionRequest {
  projectId: string;
  files: FileMap;
}

export interface StartSessionResponse {
  success: boolean;
  session?: PreviewSession;
  error?: string;
}

export interface PatchFileRequest {
  path: string;
  content: string;
}

export interface PatchFileResponse {
  success: boolean;
  error?: string;
}

export interface SessionLogsResponse {
  logs: string[];
  hasMore: boolean;
}

// ============================================
// VITE ROOT FILES (Auto-injected if missing)
// ============================================

const DEFAULT_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

const DEFAULT_PACKAGE_JSON = `{
  "name": "unison-preview",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 4173",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}`;

const DEFAULT_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 4173,
    strictPort: true,
    hmr: {
      clientPort: 443,
    },
  },
});`;

const DEFAULT_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;

const DEFAULT_TSCONFIG_NODE = `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`;

const DEFAULT_POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`;

const DEFAULT_TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`;

const DEFAULT_MAIN_TSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

const DEFAULT_INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
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

* {
  border-color: hsl(var(--border));
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  margin: 0;
  min-height: 100vh;
}`;

const DEFAULT_APP_TSX = `export default function App() {
  return null;
}`;

// ============================================
// REQUIRED ROOT FILES
// ============================================

const REQUIRED_ROOT_FILES: FileMap = {
  '/index.html': DEFAULT_INDEX_HTML,
  '/package.json': DEFAULT_PACKAGE_JSON,
  '/vite.config.ts': DEFAULT_VITE_CONFIG,
  '/tsconfig.json': DEFAULT_TSCONFIG,
  '/tsconfig.node.json': DEFAULT_TSCONFIG_NODE,
  '/postcss.config.js': DEFAULT_POSTCSS_CONFIG,
  '/tailwind.config.js': DEFAULT_TAILWIND_CONFIG,
};

const REQUIRED_SRC_FILES: FileMap = {
  '/src/main.tsx': DEFAULT_MAIN_TSX,
  '/src/index.css': DEFAULT_INDEX_CSS,
  '/src/App.tsx': DEFAULT_APP_TSX,
};

// ============================================
// VFS SNAPSHOT UTILITIES
// ============================================

import type { VirtualNode, VirtualFile } from '@/hooks/useVirtualFileSystem';

/**
 * Convert VFS nodes to FileMap snapshot
 * Excludes folders, only includes files with content
 */
export function vfsToFileMap(nodes: VirtualNode[]): FileMap {
  const fileMap: FileMap = {};

  nodes.forEach(node => {
    if (node.type === 'file') {
      const file = node as VirtualFile;
      const path = file.path || `/${file.name}`;
      fileMap[path] = file.content;
    }
  });

  return fileMap;
}

/**
 * Ensure all required Vite root files exist
 * Injects missing files from defaults.
 * Generates a dynamic package.json with dependencies extracted from VFS imports.
 */
export function ensureViteRootFiles(
  fileMap: FileMap,
  options?: {
    extraDependencies?: Record<string, string>;
  },
): FileMap {
  const result = { ...fileMap };

  // --- Dynamic dependency extraction ---
  // Scan VFS code for import statements and build a real package.json
  const { dependencies: extractedDeps } = extractDependencies(fileMap);

  // Parse any existing VFS package.json to preserve user overrides
  let existingPkg: Record<string, unknown> = {};
  let existingDeps: Record<string, string> = {};
  let existingDevDeps: Record<string, string> = {};
  const existingContent = fileMap['/package.json'] || fileMap['package.json'];
  if (existingContent) {
    try {
      existingPkg = JSON.parse(existingContent);
      existingDeps = (existingPkg.dependencies as Record<string, string>) || {};
      existingDevDeps = (existingPkg.devDependencies as Record<string, string>) || {};
    } catch { /* ignore malformed JSON */ }
  }

  // Merge: extracted deps (widest coverage) < worker-template base < VFS pkg overrides
  const baseDeps: Record<string, string> = {
    'react': '^18.3.1',
    'react-dom': '^18.3.1',
  };

  const mergedDeps: Record<string, string> = {
    ...baseDeps,
    ...extractedDeps,   // auto-detected from code
    ...(options?.extraDependencies || {}),
    ...existingDeps,    // user-specified always wins
  };

  // Standard devDependencies for the Vite/React/TS toolchain
  const defaultDevDeps: Record<string, string> = {
    '@types/react': '^18.3.12',
    '@types/react-dom': '^18.3.1',
    '@vitejs/plugin-react': '^4.3.4',
    'autoprefixer': '^10.4.20',
    'postcss': '^8.4.49',
    'tailwindcss': '^3.4.17',
    'typescript': '^5.6.3',
    'vite': '^5.4.11',
  };

  const mergedDevDeps: Record<string, string> = {
    ...defaultDevDeps,
    ...existingDevDeps,
  };

  // Build the final package.json
  const generatedPkg = {
    name: (existingPkg.name as string) || 'unison-preview',
    private: true,
    version: (existingPkg.version as string) || '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite --host 0.0.0.0 --port 4173',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: mergedDeps,
    devDependencies: mergedDevDeps,
  };

  // Always overwrite package.json with the dynamically resolved version
  result['/package.json'] = JSON.stringify(generatedPkg, null, 2);

  console.log('[ensureViteRootFiles] Generated dynamic package.json with', 
    Object.keys(mergedDeps).length, 'dependencies');

  // Inject remaining required root files if missing (skip package.json — already set)
  Object.entries(REQUIRED_ROOT_FILES).forEach(([path, content]) => {
    if (path === '/package.json') return; // already handled above
    if (!result[path]) {
      result[path] = content;
    }
  });

  // Inject required src files if missing
  Object.entries(REQUIRED_SRC_FILES).forEach(([path, content]) => {
    if (!result[path]) {
      result[path] = content;
    }
  });

  return result;
}

/**
 * Get list of all file paths in the snapshot
 */
export function getFilePaths(fileMap: FileMap): string[] {
  return Object.keys(fileMap).sort();
}

/**
 * Calculate total size of snapshot in bytes
 */
export function getSnapshotSize(fileMap: FileMap): number {
  return Object.values(fileMap).reduce((total, content) => {
    return total + new Blob([content]).size;
  }, 0);
}

// ============================================
// PREVIEW SESSION API
// ============================================

// Base URL for preview service
// Uses Vercel API routes by default (same-origin /api/preview)
// Can be overridden with VITE_PREVIEW_API_URL for external Docker gateway
const PREVIEW_API_BASE = import.meta.env.VITE_PREVIEW_API_URL || '/api/preview';

// Session cache
let currentSession: PreviewSession | null = null;
let keepaliveInterval: NodeJS.Timeout | null = null;
let currentSessionFingerprint:
  | {
      projectId: string;
      sessionKey: string;
      fileSignature: string;
    }
  | null = null;

function safeParseJson<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function buildFileSignature(fileMap: FileMap): string {
  const digest = Object.keys(fileMap)
    .sort()
    .map((path) => {
      const content = fileMap[path] || '';
      return `${path}:${content.length}:${content.slice(0, 120)}:${content.slice(-120)}`;
    })
    .join('|');

  return hashString(digest);
}

function deriveSessionKey(projectId: string, fileMap: FileMap): string {
  const manifest = safeParseJson<RuntimeManifest>(fileMap['/.unison/runtime-manifest.json']);
  if (typeof manifest?.sessionKey === 'string' && manifest.sessionKey.trim()) {
    return manifest.sessionKey;
  }

  const appContext = manifest?.appContext
    || safeParseJson<{ projectId?: string; snapshotId?: string; entryPoint?: string; templateName?: string }>(
      fileMap['/.unison/app-context.json'],
    );

  return [
    appContext?.projectId || projectId,
    appContext?.snapshotId || appContext?.templateName || 'preview',
    appContext?.entryPoint || manifest?.entryPoint || '/src/App.tsx',
  ].join('::');
}

/**
 * Start a new preview session
 * 
 * The Vercel API route creates a session and returns metadata.
 * If a Docker gateway is configured, it proxies to that.
 * Otherwise, a Vercel-native session is created and the client
 * renders via hardened Sandpack with Docker runtime dependencies.
 */
export async function startPreviewSession(
  projectId: string,
  files: FileMap
): Promise<StartSessionResponse> {
  try {
    // Ensure all required files exist
    const completeFiles = ensureViteRootFiles(files);
    const sessionKey = deriveSessionKey(projectId, completeFiles);
    const fileSignature = buildFileSignature(completeFiles);

    if (
      currentSession &&
      currentSessionFingerprint &&
      currentSessionFingerprint.projectId === projectId &&
      currentSessionFingerprint.sessionKey === sessionKey &&
      currentSessionFingerprint.fileSignature === fileSignature
    ) {
      return { success: true, session: currentSession };
    }

    if (
      currentSession &&
      currentSessionFingerprint &&
      currentSessionFingerprint.projectId === projectId &&
      currentSessionFingerprint.sessionKey === sessionKey &&
      currentSessionFingerprint.fileSignature !== fileSignature
    ) {
      await stopPreviewSession(currentSession.id);
    }

    const response = await fetch(`${PREVIEW_API_BASE}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        files: completeFiles,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();

    // Handle deprecated 410 response from old API (should not happen anymore)
    if (data.deprecated) {
      return { success: false, error: 'Preview API deprecated — using Sandpack fallback' };
    }

    currentSession = data.session;
    currentSessionFingerprint = {
      projectId,
      sessionKey,
      fileSignature,
    };

    // Start keepalive pings
    startKeepalive(data.session.id);

    return { success: true, session: data.session };
  } catch (error) {
    console.error('[PreviewSession] Start failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start session' 
    };
  }
}

/**
 * Patch a file in the running session (for HMR)
 */
export async function patchFile(
  sessionId: string,
  path: string,
  content: string
): Promise<PatchFileResponse> {
  try {
    const response = await fetch(`${PREVIEW_API_BASE}/${sessionId}/file`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, content }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    // Update last activity
    if (currentSession?.id === sessionId) {
      currentSession.lastActivityAt = new Date().toISOString();
    }

    return { success: true };
  } catch (error) {
    console.error('[PreviewSession] Patch failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to patch file' 
    };
  }
}

/**
 * Get logs from the session
 */
export async function getSessionLogs(
  sessionId: string,
  since?: string
): Promise<SessionLogsResponse> {
  try {
    const url = since 
      ? `${PREVIEW_API_BASE}/${sessionId}/logs?since=${encodeURIComponent(since)}`
      : `${PREVIEW_API_BASE}/${sessionId}/logs`;

    const response = await fetch(url);

    if (!response.ok) {
      return { logs: [], hasMore: false };
    }

    return await response.json();
  } catch (error) {
    console.error('[PreviewSession] Get logs failed:', error);
    return { logs: [], hasMore: false };
  }
}

/**
 * Stop the preview session
 */
export async function stopPreviewSession(sessionId: string): Promise<boolean> {
  try {
    // Stop keepalive
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      keepaliveInterval = null;
    }

    const response = await fetch(`${PREVIEW_API_BASE}/${sessionId}/stop`, {
      method: 'POST',
    });

    if (currentSession?.id === sessionId) {
      currentSession = null;
      currentSessionFingerprint = null;
    }

    return response.ok;
  } catch (error) {
    console.error('[PreviewSession] Stop failed:', error);
    return false;
  }
}

/**
 * Ping the session to keep it alive
 */
export async function pingSession(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${PREVIEW_API_BASE}/${sessionId}/ping`, {
      method: 'POST',
    });

    return response.ok;
  } catch (error) {
    console.error('[PreviewSession] Ping failed:', error);
    return false;
  }
}

/**
 * Get current session status
 */
export async function getSessionStatus(sessionId: string): Promise<PreviewSession | null> {
  try {
    const response = await fetch(`${PREVIEW_API_BASE}/${sessionId}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[PreviewSession] Get status failed:', error);
    return null;
  }
}

// ============================================
// KEEPALIVE MANAGEMENT
// ============================================

const KEEPALIVE_INTERVAL = 30000; // 30 seconds

function startKeepalive(sessionId: string): void {
  // Clear any existing interval
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
  }

  // Start new interval
  keepaliveInterval = setInterval(() => {
    pingSession(sessionId);
  }, KEEPALIVE_INTERVAL);
}

export function stopKeepalive(): void {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
}

// ============================================
// SESSION STATE
// ============================================

export function getCurrentSession(): PreviewSession | null {
  return currentSession;
}

export function clearCurrentSession(): void {
  stopKeepalive();
  currentSession = null;
  currentSessionFingerprint = null;
}

// ============================================
// LOCAL FALLBACK (when backend not available)
// ============================================

/**
 * Generate a static HTML preview as fallback
 * when the ECS runtime is not available
 */
export function generateStaticPreview(files: FileMap): string {
  // Get the main App content
  const appContent = files['/src/App.tsx'] || files['/src/App.jsx'] || '';
  const cssContent = files['/src/index.css'] || files['/src/styles/index.css'] || '';

  // Simple JSX to HTML conversion (very basic)
  let htmlContent = appContent
    .replace(/import.*?;?\n/g, '') // Remove imports
    .replace(/export default.*?;?\n/g, '') // Remove export
    .replace(/function \w+\(\) \{/, '') // Remove function declaration
    .replace(/return \(/, '') // Remove return
    .replace(/\);?\s*\}$/, '') // Remove closing
    .replace(/className=/g, 'class=') // Convert className to class
    .replace(/\{`([^`]*)`\}/g, '$1') // Template literals
    .replace(/\{([^}]+)\}/g, '') // Remove JS expressions
    .trim();

  // If we couldn't extract JSX, use a placeholder
  if (!htmlContent || htmlContent.length < 10) {
    htmlContent = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc;">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="font-size: 2rem; font-weight: bold; color: #1e293b; margin-bottom: 1rem;">
            Preview
          </h1>
          <p style="color: #64748b;">
            Edit the code to see changes
          </p>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}
