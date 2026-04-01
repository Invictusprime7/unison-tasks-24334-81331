/**
 * Runtime Manifest — the contract between Launcher/Editor and Preview Engine.
 *
 * Every preview session is driven by a RuntimeManifest that tells the preview
 * compiler what to render, how to route, and which engine to use.
 *
 * Architecture:
 *   Launcher → { sourceFiles, runtimeManifest } → compileLauncherOutputForPreview()
 *                                                      ↓
 *                                              prepareSandpackFiles()
 *                                                      ↓
 *                                                  Sandpack / Docker
 */

// ─── Core Manifest ──────────────────────────────────────────────────────────

export type PreviewEngine = 'sandpack' | 'docker';

export interface RuntimeManifest {
  /** Canonical entry point path (e.g. "/src/App.tsx") */
  entryPoint: string;

  /** Whether the project requires backend capabilities (auth, DB, edge functions) */
  backendRequired: boolean;

  /** Which preview engine to use — determined by backendRequired + feature flags */
  previewEngine: PreviewEngine;

  /** Declared routes for the site */
  routes: string[];

  /** NPM dependencies the generated code expects */
  dependencies: Record<string, string>;

  /** Environment variables / secrets the project needs at runtime */
  envRequirements: string[];

  /** Industry vertical (for contextual component synthesis) */
  industry?: string;

  /** Business/brand name */
  brandName?: string;

  /** Aesthetic theme ID */
  aesthetic?: string;
}

// ─── Launcher Handoff Payload ───────────────────────────────────────────────

export interface LauncherHandoff {
  /** Source VFS files in /src/ structure */
  sourceFiles: Record<string, string>;

  /** Runtime manifest describing the project shape */
  runtimeManifest: RuntimeManifest;

  /** Optional SiteBundle for structured site data */
  siteBundle?: {
    pages?: Record<string, any>;
    theme?: Record<string, any>;
    metadata?: { name?: string; industry?: string };
  };

  /** Navigation state passed to WebBuilder */
  navState: {
    templateName: string;
    aesthetic?: string;
    templateCategory?: string;
    systemType?: string;
    systemName?: string;
    startInPreview?: boolean;
    preloadedIntents?: string[];
  };
}

// ─── Manifest Factory ───────────────────────────────────────────────────────

/**
 * Create a RuntimeManifest from launcher metadata.
 * Infers routes from VFS file paths and detects backend requirements.
 */
export function createRuntimeManifest(
  sourceFiles: Record<string, string>,
  options?: {
    entryPoint?: string;
    industry?: string;
    brandName?: string;
    aesthetic?: string;
    backendRequired?: boolean;
  }
): RuntimeManifest {
  const filePaths = Object.keys(sourceFiles);

  // Infer routes from /src/pages/ files
  const routes = filePaths
    .filter(p => /\/src\/pages\/[^/]+\.(tsx|jsx)$/i.test(p))
    .map(p => {
      const name = p.match(/\/pages\/([^/]+)\.(tsx|jsx)$/i)?.[1] || '';
      if (/^(home|index)$/i.test(name)) return '/';
      return '/' + name.toLowerCase();
    });

  if (routes.length === 0) routes.push('/');

  // Detect backend requirements from code content
  const allContent = Object.values(sourceFiles).join('\n');
  const backendRequired = options?.backendRequired ??
    /supabase\.|createClient|auth\.(signIn|signUp|getSession)|\.from\(|edge.function/i.test(allContent);

  // Extract npm imports
  const dependencies: Record<string, string> = {};
  const importRegex = /import\s+.*?\s+from\s+['"]([^./][^'"]*)['"]/g;
  let match;
  while ((match = importRegex.exec(allContent)) !== null) {
    const pkg = match[1].startsWith('@')
      ? match[1].split('/').slice(0, 2).join('/')
      : match[1].split('/')[0];
    if (!dependencies[pkg] && pkg !== 'react' && pkg !== 'react-dom') {
      dependencies[pkg] = 'latest';
    }
  }

  return {
    entryPoint: options?.entryPoint || '/src/App.tsx',
    backendRequired,
    previewEngine: backendRequired ? 'docker' : 'sandpack',
    routes,
    dependencies,
    envRequirements: backendRequired
      ? ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
      : [],
    industry: options?.industry,
    brandName: options?.brandName,
    aesthetic: options?.aesthetic,
  };
}

// ─── Preview Engine Resolution ──────────────────────────────────────────────

/**
 * Resolve which preview engine to use.
 * Falls back to sandpack with a banner if docker is required but unavailable.
 */
export function resolvePreviewEngine(
  manifest: RuntimeManifest,
  capabilities: { dockerAvailable?: boolean } = {}
): { engine: PreviewEngine; frontendOnly: boolean } {
  if (manifest.previewEngine === 'docker' && !capabilities.dockerAvailable) {
    return { engine: 'sandpack', frontendOnly: true };
  }
  return {
    engine: manifest.previewEngine,
    frontendOnly: manifest.previewEngine === 'sandpack',
  };
}
