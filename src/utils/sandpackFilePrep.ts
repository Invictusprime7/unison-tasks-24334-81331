/**
 * Sandpack File Preparation Utilities
 * 
 * Sandpack's react-ts template expects files at ROOT level (e.g., /App.tsx, not /src/App.tsx).
 * This module flattens VFS paths, processes imports, and ensures essential files exist.
 */

import { ensureReactImports, sanitizeSvgElements } from '@/utils/aiCodeCleaner';
import { LAUNCHER_BASE_THEME } from '@/sections/themes';
import { SANDPACK_ALLOWED_IMPORTS } from '@/utils/sandpackDependencies';

const ALLOWED_IMPORTS = SANDPACK_ALLOWED_IMPORTS;

const LAUNCHER_THEME_JSON = JSON.stringify(LAUNCHER_BASE_THEME, null, 2);

/**
 * Complete set of semantic CSS variables required for Tailwind utility classes
 * (bg-primary, text-foreground, etc.) to resolve correctly in the preview.
 */
const SEMANTIC_CSS_VARS = `
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
`;

const BASE_CSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;

${SEMANTIC_CSS_VARS}

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

/**
 * index.html with Tailwind CDN configured to recognize semantic design tokens.
 * Without this config, classes like bg-primary, text-foreground, bg-muted etc.
 * are unknown to the CDN and compile to nothing — causing invisible elements.
 */
const PREVIEW_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            border: 'hsl(var(--border))',
            input: 'hsl(var(--input))',
            ring: 'hsl(var(--ring))',
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            primary: {
              DEFAULT: 'hsl(var(--primary))',
              foreground: 'hsl(var(--primary-foreground))',
            },
            secondary: {
              DEFAULT: 'hsl(var(--secondary))',
              foreground: 'hsl(var(--secondary-foreground))',
            },
            destructive: {
              DEFAULT: 'hsl(var(--destructive))',
              foreground: 'hsl(var(--destructive-foreground))',
            },
            muted: {
              DEFAULT: 'hsl(var(--muted))',
              foreground: 'hsl(var(--muted-foreground))',
            },
            accent: {
              DEFAULT: 'hsl(var(--accent))',
              foreground: 'hsl(var(--accent-foreground))',
            },
            popover: {
              DEFAULT: 'hsl(var(--popover))',
              foreground: 'hsl(var(--popover-foreground))',
            },
            card: {
              DEFAULT: 'hsl(var(--card))',
              foreground: 'hsl(var(--card-foreground))',
            },
          },
          borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)',
          },
          fontFamily: {
            heading: 'var(--font-heading, ui-sans-serif, system-ui, sans-serif)',
            body: 'var(--font-body, ui-sans-serif, system-ui, sans-serif)',
          },
        },
      },
    }
  <\/script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;


const PREVIEW_NAV_BRIDGE = `function __initLovablePreviewNavBridge() {
  const bridgeWindow = window as Window & { __lovablePreviewNavBridgeInstalled?: boolean };
  if (bridgeWindow.__lovablePreviewNavBridgeInstalled) return;
  bridgeWindow.__lovablePreviewNavBridgeInstalled = true;

  const normalizePath = (rawPath: string) => rawPath.replace(/^\//, '').replace(/\.html(?:[?#].*)?$/, '').replace(/[?#].*$/, '') || 'index';

  document.addEventListener('click', function (event) {
    const target = event.target as HTMLElement | null;
    const el = target?.closest?.('a[href], [data-ut-intent="nav.goto"], [data-ut-path]') as HTMLElement | null;
    if (!el) return;

    const path = el.getAttribute('data-ut-path') || el.getAttribute('href') || '';
    if (!path || path === '#' || path.startsWith('http') || path.startsWith('mailto:') || path.startsWith('tel:') || path.startsWith('javascript:')) return;

    if (path.startsWith('#')) {
      const section = document.querySelector(path);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
        event.preventDefault();
      }
      return;
    }

    const pageName = normalizePath(path);
    if (pageName === 'index') return;

    event.preventDefault();
    event.stopPropagation();

    window.parent.postMessage({
      type: 'NAV_PAGE_GENERATE',
      pageName,
      navLabel: el.textContent ? el.textContent.trim().substring(0, 40) : pageName,
      requestId: 'click-' + Date.now(),
    }, '*');
  }, true);

  window.addEventListener('message', function (event) {
    if (event.data?.type === 'NAV_ROUTE' && event.data.route) {
      window.location.hash = event.data.route;
    }
  });
}
`;

const DEFAULT_MAIN = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

${PREVIEW_NAV_BRIDGE}
__initLovablePreviewNavBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

const HOOKS_SHIM = `
import { useState as reactUseState, useEffect as reactUseEffect, useCallback as reactUseCallback, useMemo as reactUseMemo, useRef as reactUseRef, useContext as reactUseContext, createContext } from 'react';

export const useState = reactUseState;
export const useEffect = reactUseEffect;
export const useCallback = reactUseCallback;
export const useMemo = reactUseMemo;
export const useRef = reactUseRef;
export const useContext = reactUseContext;

export const useToast = () => {
  const toast = (opts) => { console.log('[Toast]', opts.title, opts.description); };
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
export const useAuth = () => ({
  user: null, session: null, loading: false, isAuthenticated: false,
  signIn: () => Promise.resolve({ error: 'Preview mode' }),
  signUp: () => Promise.resolve({ error: 'Preview mode' }),
  signOut: () => Promise.resolve(),
});
export const supabase = {
  auth: {
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Preview mode' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Preview mode' } }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
};
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
export const useIntentHandlers = () => ({
  handleBooking: (service) => { const el = document.querySelector('[data-ut-intent="booking.create"]'); if (el) el.click(); else console.log('[Intent] booking.create:', service); },
  handleContact: (data) => { console.log('[Intent] contact.submit:', data); },
  handleNewsletter: (email) => { console.log('[Intent] newsletter.subscribe:', email); },
  handleNavigation: (path) => { const section = document.querySelector(path); if (section) section.scrollIntoView({ behavior: 'smooth' }); },
  handleAuth: (action) => { console.log('[Intent] auth.' + action); },
});
export const useNavigate = () => (path) => {
  if (path.startsWith('#')) {
    const el = document.querySelector(path);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  } else {
    // Post to parent for page generation / routing
    const requestId = 'nav-' + Date.now();
    const pageName = path.replace(/^\//, '').replace(/\.html$/, '') || 'index';
    window.parent.postMessage({
      type: 'NAV_PAGE_GENERATE',
      pageName,
      navLabel: pageName.charAt(0).toUpperCase() + pageName.slice(1),
      requestId,
    }, '*');
  }
};

export default {
  useState, useEffect, useCallback, useMemo, useRef, useContext,
  useToast, useMobile, useSidebar, useTheme, useAuth, useRouter,
  useParams, useSearchParams, useQuery, useMutation, useForm,
  useDebounce, useLocalStorage, useMediaQuery, useOnClickOutside,
  useWindowSize, useIntersectionObserver, useAnimation, useReducer,
  useLayoutEffect, useAssetRegistry, useSceneModel, useDesignStudio,
  useVirtualFileSystem, usePreviewSession, useAIFileAnalysis,
  useAITemplate, useCodeHistory, useDocument, useGoHighLevelCRM,
  useKeyboardShortcuts, usePageGenerator, useSubscription,
  useCanvasHistory, useTemplateAutomation, useTemplateFiles,
  useTemplateState, useWebBuilder, useWebBuilderAI, useWebBuilderState,
  useWorkflowTrigger, useCounter, useToggle, useIntentHandlers, useNavigate, supabase,
};
`;

/**
 * Detect if content is raw CSS (not valid JSX/TSX).
 * Returns true if the content looks like a stylesheet rather than a React component.
 */
function isRawCss(content: string): boolean {
  const trimmed = content.trim();
  // Must NOT have React indicators
  if (/\b(import\s+|export\s+(default\s+)?|function\s+\w+|const\s+\w+\s*=|class\s+\w+)/.test(trimmed)) {
    return false;
  }
  // Must have CSS indicators
  return /^(\s*(@import|@font-face|@media|@keyframes|@tailwind|:root|html|body|\*|\.[\w-]|#[\w-])\s*[{(])/m.test(trimmed);
}

function injectPreviewNavBridge(code: string, filePath: string): string {
  if (!/^\/(?:main|index)\.(?:tsx?|jsx?)$/.test(filePath)) return code;
  if (code.includes('__initLovablePreviewNavBridge')) return code;

  const importBlock = code.match(/^(?:import[^\n]*\n)+/);
  if (importBlock) {
    return `${importBlock[0]}\n${PREVIEW_NAV_BRIDGE}\n__initLovablePreviewNavBridge();\n\n${code.slice(importBlock[0].length)}`;
  }

  return `${PREVIEW_NAV_BRIDGE}\n__initLovablePreviewNavBridge();\n\n${code}`;
}

function getFileDirectory(filePath: string): string {
  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash <= 0 ? '/' : normalized.slice(0, lastSlash);
}

function toRelativeSandpackImport(fromFilePath: string, targetPath: string): string {
  const fromParts = getFileDirectory(fromFilePath).split('/').filter(Boolean);
  const targetParts = targetPath.replace(/^\//, '').split('/').filter(Boolean);

  let shared = 0;
  while (
    shared < fromParts.length &&
    shared < targetParts.length &&
    fromParts[shared] === targetParts[shared]
  ) {
    shared += 1;
  }

  const upLevels = fromParts.length - shared;
  const downParts = targetParts.slice(shared);
  const relativeParts = [...Array(upLevels).fill('..'), ...downParts];
  const relativePath = relativeParts.join('/');

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function aliasModuleToRelativeImport(fromFilePath: string, aliasModulePath: string): string {
  const normalizedModulePath = aliasModulePath.replace(/^@\//, '');
  return toRelativeSandpackImport(fromFilePath, `/${normalizedModulePath}`);
}

/**
 * Wrap raw CSS content in a valid React component so Sandpack can render it.
 * Uses JSON.stringify to safely embed CSS as a string constant (avoids template literal parsing issues).
 */
function wrapCssInReactComponent(css: string): string {
  const cssJsonStr = JSON.stringify(css);
  return `import React from 'react';

const CSS_CONTENT = ${cssJsonStr};

export default function App() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_CONTENT }} />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Styles applied. Add HTML content to see the design.</p>
      </div>
    </>
  );
}
`;
}

function createProxyApp(targetPath: string): string {
  const importPath = toRelativeSandpackImport('/App.tsx', targetPath).replace(/\.(tsx?|jsx?)$/, '');

  return `import React from 'react';
import * as PreviewEntryModule from '${importPath}';

const PreviewEntry = (PreviewEntryModule.default ?? Object.values(PreviewEntryModule)[0]) as React.ComponentType | undefined;

export default function App() {
  if (!PreviewEntry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Preview entry is missing a renderable component.</p>
      </div>
    );
  }

  return <PreviewEntry />;
}
`;
}

function createMissingEntryApp(): string {
  return `import React from 'react';

export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Invalid Launcher preview payload</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The preview did not receive a renderable industry-theme React entry file from Launcher.
        </p>
      </div>
    </div>
  );
}
`;
}

function pickPrimaryComponentPath(paths: string[]): string | null {
  const uniquePaths = [...new Set(paths)].filter((path) => path !== '/hooks-shim.ts');

  return uniquePaths.find((path) => path === '/App.tsx' || path === '/App.jsx')
    || uniquePaths.find((path) => /\/pages\/(Home|Index)[^/]*\.(tsx|jsx)$/i.test(path))
    || uniquePaths.find((path) => /\/pages\//.test(path))
    || uniquePaths.find((path) => !/\/(main|index)\.(tsx|jsx)$/.test(path))
    || uniquePaths[0]
    || null;
}

/**
 * Process code to strip/transform imports that Sandpack can't resolve.
 * Also fixes dangerouslySetInnerHTML template literals that contain CSS (which crash Babel).
 */
export function processCode(code: string, filePath: string): string {
  if (!/\.(tsx?|jsx?|mjs)$/.test(filePath)) {
    return code;
  }

  let processed = code;
  const hooksShimImport = toRelativeSandpackImport(filePath, '/hooks-shim');

  // Strip leaked markdown code-fence artifacts (```, </code></pre>)
  processed = processed.replace(/\s*```\s*$/g, '');
  processed = processed.replace(/\s*<\/code>\s*<\/pre>\s*$/g, '');
  processed = processed.replace(/^```(?:html|jsx|tsx|javascript|js|typescript|ts)?\s*\n/g, '');

  // FIX: Convert dangerouslySetInnerHTML={{ __html: `...CSS...` }} to use a string constant
  // Babel crashes when template literals contain CSS syntax like :root { --var: value }
  processed = processed.replace(
    /dangerouslySetInnerHTML=\{\{\s*__html:\s*`([\s\S]*?)`\s*\}\}/g,
    (_match, cssContent: string) => {
      // Only fix if content looks like CSS (not simple HTML)
      if (/:root|@import|@font-face|@media|@keyframes|--[\w-]+\s*:/.test(cssContent)) {
        const jsonStr = JSON.stringify(cssContent);
        return `dangerouslySetInnerHTML={{ __html: ${jsonStr} }}`;
      }
      return _match;
    }
  );

  // Handle @/ path alias imports — convert to correct relative paths for flattened Sandpack files
  processed = processed.replace(
    /^(import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"])@\/([^'"]+)(['"];?\s*)$/gm,
    (match, importPrefix, modulePath, importSuffix) => {
      if (modulePath.startsWith('hooks/') || modulePath === 'hooks') {
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${hooksShimImport}';`;
        if (defaultMatch) return `import ${defaultMatch[1]} from '${hooksShimImport}';`;
        return `import hooks from '${hooksShimImport}'; // [Preview] Shimmed: @/${modulePath}`;
      }

      if (modulePath.startsWith('integrations/supabase')) {
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${hooksShimImport}';`;
        if (defaultMatch) return `import ${defaultMatch[1]} from '${hooksShimImport}';`;
        return `import { supabase } from '${hooksShimImport}'; // [Preview] Shimmed: @/${modulePath}`;
      }

      return `${importPrefix}${aliasModuleToRelativeImport(filePath, `@/${modulePath}`)}${importSuffix}`;
    }
  );

  // Process remaining imports — strip unresolvable npm packages to prevent Sandpack crashes
  processed = processed.replace(
    /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"];?\s*$/gm,
    (match, modulePath) => {
      const baseModule = modulePath.split('/')[0];
      if (ALLOWED_IMPORTS.has(modulePath) || ALLOWED_IMPORTS.has(baseModule)) return match;
      if (/\.(css|scss|less)$/.test(modulePath)) return match;

      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        if (modulePath.includes('hooks/')) {
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '${hooksShimImport}';`;
            if (defaultImport) return `import ${defaultImport} from '${hooksShimImport}';`;
          }
          return `import hooks from '${hooksShimImport}'; // [Preview] Shimmed: ${modulePath}`;
        }
        return match;
      }

      if (modulePath.startsWith('@/')) {
        return match.replace(modulePath, aliasModuleToRelativeImport(filePath, modulePath));
      }

      // Unknown npm package — pass through to Sandpack for real resolution.
      // The dependency extractor will pick it up and add it to customSetup.dependencies.
      return match;
    }
  );

  // Remove unsupported hook calls
  const unsupportedHooks = [
    'useAssetRegistry', 'useTemplateState', 'useGoHighLevelCRM', 'useSupabaseClient',
  ];
  for (const hook of unsupportedHooks) {
    processed = processed.replace(
      new RegExp(`const\\s+\\{[^}]*\\}\\s*=\\s*${hook}\\([^)]*\\);?`, 'g'),
      `// [Preview] Stripped ${hook} call`
    );
    processed = processed.replace(
      new RegExp(`const\\s+\\w+\\s*=\\s*${hook}\\([^)]*\\);?`, 'g'),
      `// [Preview] Stripped ${hook} call`
    );
    processed = processed.replace(
      new RegExp(`${hook}\\([^)]*\\)`, 'g'),
      '{}'
    );
  }

  processed = processed.replace(/\n{3,}/g, '\n\n');
  return processed;
}

/**
 * Convert VFS files to Sandpack-compatible format.
 * Flattens /src/ paths to root, processes imports, adds missing essentials.
 */
export function prepareSandpackFiles(files: Record<string, string>): Record<string, string> {
  const sandpackFiles: Record<string, string> = {};
  let hasApp = false;
  let hasMain = false;
  let hasCSS = false;
  const componentFilePaths: string[] = [];

  console.log('[sandpackFilePrep] Input VFS files:', Object.keys(files));

  for (const [path, content] of Object.entries(files)) {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Skip files Sandpack doesn't need
    if (normalizedPath.includes('node_modules') ||
        normalizedPath.includes('/.') ||
        normalizedPath.endsWith('.json') ||
        normalizedPath.endsWith('.config.ts') ||
        normalizedPath.endsWith('.config.js') ||
        normalizedPath.includes('/public/')) {
      continue;
    }

    // Flatten /src/ paths to root for Sandpack compatibility
    if (normalizedPath.startsWith('/src/')) {
      normalizedPath = normalizedPath.replace('/src/', '/');
    }

    // Flatten /styles/ to root
    if (normalizedPath.startsWith('/styles/')) {
      normalizedPath = normalizedPath.replace('/styles/', '/');
    }

    // Fix imports in content to match flattened paths
    let processedContent = content;

    // Repair legacy/generated payloads that serialized THEME as undefined/null.
    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && /const\s+THEME\s*=\s*(undefined|null);/.test(processedContent)) {
      processedContent = processedContent.replace(
        /const\s+THEME\s*=\s*(undefined|null);/,
        `const THEME = ${LAUNCHER_THEME_JSON};`
      );
    }

    // SAFETY NET: If a .tsx/.jsx file contains raw CSS instead of React code, wrap it
    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && isRawCss(processedContent)) {
      console.warn(`[sandpackFilePrep] Raw CSS detected in ${normalizedPath} — wrapping in React component`);
      processedContent = wrapCssInReactComponent(processedContent);
    }

    // SAFETY NET: Ensure React imports are present for files using hooks
    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && !isRawCss(processedContent)) {
      processedContent = ensureReactImports(processedContent);
      // Fix broken SVG elements (dc.path, svg.circle, etc.)
      processedContent = sanitizeSvgElements(processedContent);
    }

    processedContent = processedContent
      .replace(/from\s+['"]\.\/src\//g, "from './")
      .replace(/from\s+['"]src\//g, "from './")
      .replace(/from\s+['"]\.\/styles\//g, "from './")
      .replace(/import\s+['"]\.\/styles\//g, "import './");

    processedContent = processCode(processedContent, normalizedPath);
    processedContent = injectPreviewNavBridge(processedContent, normalizedPath);
    sandpackFiles[normalizedPath] = processedContent;

    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && normalizedPath !== '/hooks-shim.ts') {
      componentFilePaths.push(normalizedPath);
    }
    if (normalizedPath === '/App.tsx' || normalizedPath === '/App.jsx') hasApp = true;
    if (normalizedPath === '/main.tsx' || normalizedPath === '/main.jsx' || normalizedPath === '/index.tsx') hasMain = true;
    if (normalizedPath.endsWith('.css')) hasCSS = true;
  }

  if (!hasCSS) {
    sandpackFiles['/index.css'] = BASE_CSS;
  } else {
    // Ensure semantic CSS variables exist even when user/Launcher provides CSS.
    // If the provided CSS is missing key tokens (--primary, --secondary, etc.)
    // prepend defaults so Tailwind semantic classes resolve correctly.
    const existingCSS = sandpackFiles['/index.css'] || '';
    if (existingCSS && !existingCSS.includes('--primary:')) {
      sandpackFiles['/index.css'] = SEMANTIC_CSS_VARS + '\n' + existingCSS;
    }
  }
  if (!hasApp) {
    const primaryComponentPath = pickPrimaryComponentPath(componentFilePaths);

    if (primaryComponentPath) {
      sandpackFiles['/App.tsx'] = createProxyApp(primaryComponentPath);
    } else {
      sandpackFiles['/App.tsx'] = createMissingEntryApp();
    }
  }
  if (!hasMain) sandpackFiles['/main.tsx'] = DEFAULT_MAIN;
  sandpackFiles['/hooks-shim.ts'] = HOOKS_SHIM;

  // Ensure template.css exists if any file imports it
  const anyImportsTemplateCss = Object.values(sandpackFiles).some(c =>
    typeof c === 'string' && /import\s+['"]\.\/template\.css['"]/.test(c)
  );
  if (anyImportsTemplateCss && !sandpackFiles['/template.css']) {
    // Provide an empty CSS file so Sandpack doesn't crash
    sandpackFiles['/template.css'] = '/* template styles */\n';
  }

  // Ensure index.html exists with Tailwind CDN + semantic theme config
  if (!sandpackFiles['/index.html']) {
    sandpackFiles['/index.html'] = PREVIEW_INDEX_HTML;
  }

  console.log('[sandpackFilePrep] Prepared files:', Object.keys(sandpackFiles));
  return sandpackFiles;
}
