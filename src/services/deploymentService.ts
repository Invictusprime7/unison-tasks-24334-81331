/**
 * Deployment Service
 * 
 * Client-side service for deploying VFS templates to hosting providers.
 * Uses the publish-site Supabase Edge Function for actual deployments.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getPublishBlockers,
  type CompiledContract,
  type PublishBlocker,
} from '@/contracts';

export type DeploymentProvider = 'vercel' | 'netlify';

export interface DeploymentRequest {
  provider: DeploymentProvider;
  siteName?: string;
  customDomain?: string;
  files: Record<string, string>; // path -> content
  /**
   * Optional compiled contract. When supplied, the publish gate runs before
   * any network call — preventing a half-wired site from going live.
   */
  contract?: CompiledContract | null;
}

export interface DeploymentResponse {
  status: 'success' | 'error';
  url?: string;
  dashboardUrl?: string;
  provider: string;
  note?: string;
  error?: string;
  isLocalDevelopment?: boolean;
}

export interface DeploymentStatus {
  isDeploying: boolean;
  progress: number; // 0-100
  message: string;
  result?: DeploymentResponse;
  /** Publish blockers when the gate rejects deployment. */
  blockers?: PublishBlocker[];
}

/**
 * Wrap raw HTML content with full document structure including Tailwind CSS
 */
export function wrapHtmlForDeployment(html: string, title: string = 'Unison Site'): string {
  const trimmed = html.trim();
  const lowerTrimmed = trimmed.toLowerCase();
  
  // If already a complete HTML document with Tailwind, return as-is
  if (lowerTrimmed.includes('<!doctype html') && lowerTrimmed.includes('tailwindcss')) {
    return trimmed;
  }
  
  // If it's a complete document but missing Tailwind, inject it
  if (lowerTrimmed.startsWith('<!doctype') || lowerTrimmed.startsWith('<html')) {
    // Inject Tailwind CDN and Lucide icons into existing document
    let result = trimmed.replace(
      /<head([^>]*)>/i,
      `<head$1>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: {} }
    }
  </script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>`
    );
    // Add lucide.createIcons() if not present
    if (result.includes('data-lucide') && !result.includes('lucide.createIcons')) {
      result = result.replace('</body>', '<script>if(typeof lucide!=="undefined"){lucide.createIcons();}</script>\n</body>');
    }
    return result;
  }
  
  // Wrap fragment with full document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          animation: {
            'fade-in': 'fadeIn 0.5s ease-out',
            'bounce-slow': 'bounce 3s infinite',
          },
          keyframes: {
            fadeIn: {
              '0%': { opacity: '0', transform: 'translateY(10px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
            }
          }
        }
      }
    }
  </script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <style>
    :root {
      color-scheme: light;
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --primary: 221.2 83.2% 53.3%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --border: 214.3 31.8% 91.4%;
      --radius: 0.75rem;
    }
    * { border-color: hsl(var(--border)); box-sizing: border-box; }
    body { 
      font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      margin: 0;
      min-height: 100vh;
      background-color: white;
      color: #1a1a2e;
    }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; text-decoration: none; }
    /* Smooth scrolling */
    html { scroll-behavior: smooth; }
    /* Icon fallbacks */
    .icon-ArrowRight::before { content: '→'; }
    .icon-Play::before { content: '▶'; }
    .icon-Star::before { content: '★'; }
    .icon-Check::before { content: '✓'; }
    .icon-ChevronRight::before { content: '›'; }
    /* Grid and flex fixes */
    .grid { display: grid; }
    .flex { display: flex; }
  </style>
</head>
<body class="antialiased">
  ${html}
  <script>if(typeof lucide!=="undefined"){lucide.createIcons();}</script>
</body>
</html>`;
}

/**
 * Deploy files to a hosting provider (Vercel or Netlify)
 */
export async function deployToProvider(
  request: DeploymentRequest,
  onProgress?: (status: DeploymentStatus) => void
): Promise<DeploymentResponse> {
  const updateProgress = (progress: number, message: string) => {
    onProgress?.({
      isDeploying: true,
      progress,
      message,
    });
  };

  try {
    updateProgress(10, 'Preparing files for deployment...');

    // Normalize file paths (remove leading slashes for Vercel)
    const normalizedFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(request.files)) {
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      normalizedFiles[normalizedPath] = content;
    }

    // Ensure index.html exists
    if (!normalizedFiles['index.html']) {
      throw new Error('Missing index.html - required for deployment');
    }

    updateProgress(30, `Connecting to ${request.provider}...`);

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('publish-site', {
      body: {
        provider: request.provider,
        siteName: request.siteName || `unison-site-${Date.now()}`,
        customDomain: request.customDomain,
        files: normalizedFiles,
      },
    });

    if (error) {
      console.error('[deploymentService] Supabase function error:', error);
      throw new Error(error.message || 'Deployment failed');
    }

    const response = data as DeploymentResponse;

    if (response.status === 'error') {
      throw new Error(response.error || 'Deployment failed');
    }

    updateProgress(100, 'Deployment complete!');
    
    onProgress?.({
      isDeploying: false,
      progress: 100,
      message: 'Deployment complete!',
      result: response,
    });

    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorResponse: DeploymentResponse = {
      status: 'error',
      provider: request.provider,
      error: errorMessage,
    };
    
    onProgress?.({
      isDeploying: false,
      progress: 0,
      message: `Deployment failed: ${errorMessage}`,
      result: errorResponse,
    });

    return errorResponse;
  }
}

/**
 * Deploy to Vercel specifically
 */
export async function deployToVercel(
  files: Record<string, string>,
  siteName?: string,
  onProgress?: (status: DeploymentStatus) => void
): Promise<DeploymentResponse> {
  return deployToProvider(
    {
      provider: 'vercel',
      siteName,
      files,
    },
    onProgress
  );
}

/**
 * Deploy to Netlify specifically
 */
export async function deployToNetlify(
  files: Record<string, string>,
  siteName?: string,
  onProgress?: (status: DeploymentStatus) => void
): Promise<DeploymentResponse> {
  return deployToProvider(
    {
      provider: 'netlify',
      siteName,
      files,
    },
    onProgress
  );
}

/**
 * Convert VFS nodes to a flat file map for deployment
 */
export function vfsNodesToFileMap(
  nodes: Array<{ name: string; type: 'file' | 'folder'; content?: string; children?: unknown[] }>,
  basePath: string = ''
): Record<string, string> {
  const files: Record<string, string> = {};

  for (const node of nodes) {
    const path = basePath ? `${basePath}/${node.name}` : node.name;
    
    if (node.type === 'file' && node.content !== undefined) {
      files[path] = node.content;
    } else if (node.type === 'folder' && node.children) {
      const childFiles = vfsNodesToFileMap(
        node.children as Array<{ name: string; type: 'file' | 'folder'; content?: string; children?: unknown[] }>,
        path
      );
      Object.assign(files, childFiles);
    }
  }

  return files;
}
