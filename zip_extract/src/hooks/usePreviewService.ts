import { useState, useCallback, useRef, useEffect } from 'react';
import type { VirtualFile, VirtualNode } from './useVirtualFileSystem';

const PREVIEW_GATEWAY_URL = import.meta.env.VITE_PREVIEW_GATEWAY_URL || 'http://localhost:3001';

export interface PreviewSession {
  id: string;
  iframeUrl: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  containerId?: string;
  port?: number;
}

export interface PreviewServiceState {
  session: PreviewSession | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

interface StartSessionResponse {
  success: boolean;
  session?: {
    id: string;
    iframeUrl: string;
    status: string;
    containerId?: string;
    port?: number;
  };
  error?: string;
}

interface PatchFileResponse {
  success: boolean;
  error?: string;
}

/**
 * Hook for integrating VFS with Docker-based preview service
 * Provides session management, file syncing, and HMR support
 */
export function usePreviewService() {
  const [state, setState] = useState<PreviewServiceState>({
    session: null,
    loading: false,
    error: null,
    connected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pendingPatchesRef = useRef<Map<string, string>>(new Map());
  const patchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Convert VFS nodes to file map for the preview service
  const vfsToFileMap = useCallback((nodes: VirtualNode[]): Record<string, string> => {
    const files: Record<string, string> = {};
    
    // Add index.html at root
    files['/index.html'] = `<!DOCTYPE html>
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

    // Add all files from VFS
    for (const node of nodes) {
      if (node.type === 'file') {
        const file = node as VirtualFile;
        const path = file.path || `/${file.name}`;
        files[path] = file.content;
      }
    }

    // Add vite.config.ts if not present
    if (!files['/vite.config.ts']) {
      files['/vite.config.ts'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    hmr: true,
  },
});`;
    }

    // Add package.json if not present
    if (!files['/package.json']) {
      files['/package.json'] = JSON.stringify({
        name: 'preview-project',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        },
        devDependencies: {
          '@types/react': '^18.3.18',
          '@types/react-dom': '^18.3.5',
          '@vitejs/plugin-react': '^4.3.4',
          typescript: '^5.7.2',
          vite: '^6.0.7',
          autoprefixer: '^10.4.20',
          postcss: '^8.4.49',
          tailwindcss: '^3.4.17',
        },
      }, null, 2);
    }

    // Add tailwind.config.js if not present
    if (!files['/tailwind.config.js']) {
      files['/tailwind.config.js'] = `/** @type {import('tailwindcss').Config} */
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
    }

    // Add postcss.config.js if not present
    if (!files['/postcss.config.js']) {
      files['/postcss.config.js'] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`;
    }

    // Add tsconfig.json if not present
    if (!files['/tsconfig.json']) {
      files['/tsconfig.json'] = JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }],
      }, null, 2);
    }

    return files;
  }, []);

  // Start a new preview session
  const startSession = useCallback(async (nodes: VirtualNode[], projectId?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const files = vfsToFileMap(nodes);
      
      const response = await fetch(`${PREVIEW_GATEWAY_URL}/api/preview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || `project-${Date.now()}`,
          files,
        }),
      });

      const data: StartSessionResponse = await response.json();

      if (!data.success || !data.session) {
        throw new Error(data.error || 'Failed to start session');
      }

      const session: PreviewSession = {
        id: data.session.id,
        iframeUrl: data.session.iframeUrl,
        status: data.session.status as PreviewSession['status'],
        containerId: data.session.containerId,
        port: data.session.port,
      };

      setState(prev => ({
        ...prev,
        session,
        loading: false,
        error: null,
      }));

      // Connect WebSocket for real-time updates
      connectWebSocket(session.id);

      return session;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
      return null;
    }
  }, [vfsToFileMap]);

  // Stop the current session
  const stopSession = useCallback(async () => {
    if (!state.session) return;

    try {
      await fetch(`${PREVIEW_GATEWAY_URL}/api/preview/${state.session.id}/stop`, {
        method: 'POST',
      });

      // Disconnect WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setState(prev => ({
        ...prev,
        session: null,
        connected: false,
      }));
    } catch (err: any) {
      console.error('Failed to stop session:', err);
    }
  }, [state.session]);

  // Patch a file (triggers HMR)
  const patchFile = useCallback(async (filePath: string, content: string) => {
    if (!state.session) {
      console.warn('No active session to patch');
      return false;
    }

    // Debounce patches for the same file
    pendingPatchesRef.current.set(filePath, content);

    if (patchDebounceRef.current) {
      clearTimeout(patchDebounceRef.current);
    }

    return new Promise<boolean>((resolve) => {
      patchDebounceRef.current = setTimeout(async () => {
        const patches = Array.from(pendingPatchesRef.current.entries());
        pendingPatchesRef.current.clear();

        try {
          // Send all pending patches
          for (const [path, fileContent] of patches) {
            const response = await fetch(
              `${PREVIEW_GATEWAY_URL}/api/preview/${state.session!.id}/file`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content: fileContent }),
              }
            );

            const data: PatchFileResponse = await response.json();
            if (!data.success) {
              console.error('Patch failed:', data.error);
              resolve(false);
              return;
            }
          }

          resolve(true);
        } catch (err) {
          console.error('Patch error:', err);
          resolve(false);
        }
      }, 150); // 150ms debounce
    });
  }, [state.session]);

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback((sessionId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = PREVIEW_GATEWAY_URL.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws?sessionId=${sessionId}`);

    ws.onopen = () => {
      console.log('Preview WebSocket connected');
      setState(prev => ({ ...prev, connected: true }));
    };

    ws.onclose = () => {
      console.log('Preview WebSocket disconnected');
      setState(prev => ({ ...prev, connected: false }));
    };

    ws.onerror = (err) => {
      console.error('Preview WebSocket error:', err);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    wsRef.current = ws;
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'session:ready':
        setState(prev => ({
          ...prev,
          session: prev.session ? { ...prev.session, status: 'running' } : null,
        }));
        break;

      case 'session:error':
        setState(prev => ({
          ...prev,
          error: message.error,
          session: prev.session ? { ...prev.session, status: 'error' } : null,
        }));
        break;

      case 'hmr:update':
        console.log('HMR update:', message.file);
        break;

      case 'build:error':
        console.error('Build error:', message.errors);
        break;

      default:
        console.log('Unknown message:', message);
    }
  }, []);

  // Get session logs
  const getLogs = useCallback(async () => {
    if (!state.session) return [];

    try {
      const response = await fetch(
        `${PREVIEW_GATEWAY_URL}/api/preview/${state.session.id}/logs`
      );
      const data = await response.json();
      return data.logs || [];
    } catch (err) {
      console.error('Failed to get logs:', err);
      return [];
    }
  }, [state.session]);

  // Ping to keep session alive
  const ping = useCallback(async () => {
    if (!state.session) return;

    try {
      await fetch(`${PREVIEW_GATEWAY_URL}/api/preview/${state.session.id}/ping`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Ping failed:', err);
    }
  }, [state.session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (patchDebounceRef.current) {
        clearTimeout(patchDebounceRef.current);
      }
    };
  }, []);

  // Keep-alive interval
  useEffect(() => {
    if (!state.session) return;

    const interval = setInterval(ping, 30000); // Ping every 30 seconds
    return () => clearInterval(interval);
  }, [state.session, ping]);

  return {
    ...state,
    startSession,
    stopSession,
    patchFile,
    getLogs,
    ping,
    vfsToFileMap,
  };
}
