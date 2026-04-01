/**
 * Sandpack File Preparation Utilities
 * 
 * Sandpack's react-ts template expects files at ROOT level (e.g., /App.tsx, not /src/App.tsx).
 * Entry point MUST be /index.tsx (not /main.tsx) — Sandpack react-ts uses /index.tsx.
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

  const normalizePath = (rawPath: string) => rawPath.replace(/^\\//, '').replace(/\\.html(?:[?#].*)?$/, '').replace(/[?#].*$/, '') || 'index';

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

/**
 * DEFAULT_INDEX — the canonical Sandpack entry point.
 * Sandpack react-ts uses /index.tsx, NOT /main.tsx.
 */
const DEFAULT_INDEX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Configure Tailwind CDN with semantic design tokens
if (typeof window !== 'undefined' && (window as any).tailwind) {
  (window as any).tailwind.config = {
    theme: {
      extend: {
        colors: {
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
          secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
          destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
          muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
          accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
          popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
          card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
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
  };
}

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

// ── Industry-contextual fallback images ──────────────────────────────────────
const CONTEXTUAL_IMAGES: Record<string, string[]> = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  ],
  salon: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  ],
  medical: [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
  ],
  saas: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
  ],
  ecommerce: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
  ],
  portfolio: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  ],
  contractor: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
  ],
  agency: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  ],
};

const PORTRAIT_IMAGES = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
];

/**
 * Replace broken/fake Unsplash URLs and empty image sources with real contextual images.
 * Catches patterns like photo-1234567890 (sequential digits = fake), empty src, and placeholder.com.
 */
function repairBrokenImageUrls(code: string): string {
  let imgIndex = 0;
  const fallbackImages = CONTEXTUAL_IMAGES.default;

  // Fix fake Unsplash URLs (sequential digits like photo-1234567890)
  code = code.replace(
    /https:\/\/images\.unsplash\.com\/photo-(\d{10,})\?[^"'\s)]+/g,
    (match, photoId) => {
      // Check if digits are sequential (fake) — e.g. 1234567890
      const isSequential = /^0?1234/.test(photoId) || /^(\d)\1+$/.test(photoId);
      if (isSequential) {
        const replacement = fallbackImages[imgIndex % fallbackImages.length];
        imgIndex++;
        return replacement;
      }
      return match;
    }
  );

  // Fix placeholder.com URLs
  code = code.replace(
    /https?:\/\/(?:via\.)?placeholder\.com\/[^"'\s)]+/g,
    () => {
      const replacement = fallbackImages[imgIndex % fallbackImages.length];
      imgIndex++;
      return replacement;
    }
  );

  // Fix empty src attributes
  code = code.replace(/src=["']\s*["']/g, () => {
    const replacement = fallbackImages[imgIndex % fallbackImages.length];
    imgIndex++;
    return `src="${replacement}"`;
  });

  // Fix avatar/portrait placeholder URLs (small images in testimonials)
  code = code.replace(
    /src=["'](https?:\/\/(?:randomuser|i\.pravatar|ui-avatars)[^"']*?)["']/g,
    () => {
      const replacement = PORTRAIT_IMAGES[imgIndex % PORTRAIT_IMAGES.length];
      imgIndex++;
      return `src="${replacement}"`;
    }
  );

  return code;
}

/**
 * Parse an HSL CSS variable value like "222.2 84% 4.9%" and return the lightness as a number.
 */
function extractLightness(hslValue: string): number | null {
  const match = hslValue.match(/[\d.]+\s+[\d.]+%\s+([\d.]+)%/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Enforce minimum contrast between background/foreground pairs in CSS custom properties.
 * If both bg and fg have similar lightness, fix the foreground to guarantee visibility.
 */
function enforceContrastInCSS(css: string): string {
  const pairs = [
    ['--background', '--foreground'],
    ['--card', '--card-foreground'],
    ['--primary', '--primary-foreground'],
    ['--secondary', '--secondary-foreground'],
    ['--muted', '--muted-foreground'],
    ['--accent', '--accent-foreground'],
    ['--popover', '--popover-foreground'],
    ['--destructive', '--destructive-foreground'],
  ];

  // Extract all CSS variable values
  const varValues: Record<string, string> = {};
  const varRegex = /(--[\w-]+)\s*:\s*([\d.]+\s+[\d.]+%\s+[\d.]+%)/g;
  let m;
  while ((m = varRegex.exec(css)) !== null) {
    varValues[m[1]] = m[2];
  }

  for (const [bgVar, fgVar] of pairs) {
    const bgVal = varValues[bgVar];
    const fgVal = varValues[fgVar];
    if (!bgVal || !fgVal) continue;

    const bgL = extractLightness(bgVal);
    const fgL = extractLightness(fgVal);
    if (bgL === null || fgL === null) continue;

    const contrast = Math.abs(bgL - fgL);
    if (contrast < 40) {
      // Insufficient contrast — fix the foreground
      const newFgL = bgL < 50 ? '98%' : '4.9%';
      const fgParts = fgVal.match(/([\d.]+)\s+([\d.]+%)\s+[\d.]+%/);
      if (fgParts) {
        const newFgVal = `${fgParts[1]} ${fgParts[2]} ${newFgL}`;
        css = css.replace(
          new RegExp(`(${fgVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*)${fgVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
          `$1${newFgVal}`
        );
        console.warn(`[contrast-fix] ${fgVar}: ${fgVal} → ${newFgVal} (bg lightness: ${bgL}%)`);
      }
    }
  }

  return css;
}

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
  // Only inject into /index.tsx or /index.jsx (the canonical Sandpack entry)
  if (!/^\/index\.(?:tsx?|jsx?)$/.test(filePath)) return code;
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

// Robust component discovery: prefer default export, then find first PascalCase function/class component
function findRenderableComponent(mod) {
  if (mod.default && (typeof mod.default === 'function' || (typeof mod.default === 'object' && mod.default.$$typeof))) {
    return mod.default;
  }
  for (const [key, value] of Object.entries(mod)) {
    if (key === '__esModule' || key === 'default') continue;
    if (/^[A-Z]/.test(key) && (typeof value === 'function' || (typeof value === 'object' && value !== null && value.$$typeof))) {
      return value;
    }
  }
  return null;
}

const PreviewEntry = findRenderableComponent(PreviewEntryModule);

export default function App() {
  if (!PreviewEntry) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>No renderable component found</h2>
          <p style={{ color: '#888', fontSize: 14 }}>The entry file does not export a valid React component. Check that your component uses "export default" or a named PascalCase export.</p>
          <p style={{ color: '#aaa', fontSize: 12, marginTop: 12 }}>Source: ${targetPath}</p>
        </div>
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

// ── Real component generators keyed by section name ─────────────────────────
// When the AI generates App.tsx that imports ./components/Hero etc. but omits
// the actual file, we synthesize a REAL section component — not a stub.

interface GeneratorContext {
  industry: string;
  images: string[];
  portraits: string[];
  brandName: string;
}

/** Detect industry from existing VFS content (CSS vars, copy, file names). */
function detectIndustryFromVFS(files: Record<string, string>): string {
  const allContent = Object.values(files).join(' ').toLowerCase();
  const indicators: [string, string[]][] = [
    ['restaurant', ['menu', 'dish', 'cuisine', 'chef', 'reservation', 'dining', 'restaurant']],
    ['salon', ['salon', 'beauty', 'hair', 'spa', 'stylist', 'treatment', 'nail']],
    ['fitness', ['fitness', 'gym', 'workout', 'training', 'coach', 'exercise']],
    ['medical', ['medical', 'health', 'clinic', 'doctor', 'patient', 'care', 'dental']],
    ['saas', ['saas', 'software', 'platform', 'dashboard', 'analytics', 'api', 'startup']],
    ['ecommerce', ['shop', 'product', 'cart', 'store', 'buy', 'price', 'ecommerce']],
    ['portfolio', ['portfolio', 'project', 'creative', 'design', 'work', 'freelance']],
    ['contractor', ['contractor', 'construction', 'plumbing', 'roofing', 'remodel', 'handyman']],
    ['agency', ['agency', 'marketing', 'branding', 'campaign', 'client', 'strategy']],
  ];
  for (const [industry, keywords] of indicators) {
    if (keywords.filter(k => allContent.includes(k)).length >= 2) return industry;
  }
  return 'default';
}

/** Extract business name from App.tsx / VFS content. */
function extractBusinessName(files: Record<string, string>): string {
  for (const content of Object.values(files)) {
    const h1 = content.match(/<h1[^>]*>([^<]{2,40})<\/h1>/i);
    if (h1) return h1[1].trim();
    const title = content.match(/(?:brandName|businessName|siteName|company)\s*[=:]\s*["']([^"']+)["']/);
    if (title) return title[1];
  }
  return 'Our Business';
}

function genHero(ctx: GeneratorContext): string {
  return `import React from 'react';

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="${ctx.images[0] || CONTEXTUAL_IMAGES.default[0]}" alt="${ctx.brandName}" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">${ctx.brandName}</h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">Premium ${ctx.industry} services crafted with passion and expertise for our valued clients.</p>
        <div className="flex flex-wrap gap-4">
          <button className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all text-lg">Get Started</button>
          <button className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all text-lg">Learn More</button>
        </div>
      </div>
    </section>
  );
}

export default Hero;`;
}

function genNavbar(ctx: GeneratorContext): string {
  return `import React from 'react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="text-xl font-bold text-foreground">${ctx.brandName}</a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-foreground/70 hover:text-foreground transition-colors">About</a>
          <a href="#services" className="text-foreground/70 hover:text-foreground transition-colors">Services</a>
          <a href="#contact" className="text-foreground/70 hover:text-foreground transition-colors">Contact</a>
          <button className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Book Now</button>
        </div>
      </div>
    </nav>
  );
}`;
}

function genHeader(ctx: GeneratorContext): string {
  return `import React from 'react';

export default function Header() {
  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-foreground">${ctx.brandName}</span>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Home</a>
          <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Services</a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </nav>
      </div>
    </header>
  );
}`;
}

function genFeatures(ctx: GeneratorContext): string {
  return `import React from 'react';

const features = [
  { title: 'Expert Team', desc: 'Our certified professionals bring years of ${ctx.industry} experience to every project.', icon: '⭐' },
  { title: 'Quality First', desc: 'We use only premium materials and cutting-edge techniques for outstanding results.', icon: '✨' },
  { title: 'Fast Turnaround', desc: 'Efficient processes ensure your project is completed on time, every time.', icon: '⚡' },
  { title: 'Customer Focus', desc: 'Your satisfaction drives everything we do — from consultation to completion.', icon: '💎' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Why Choose Us</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Discover what sets us apart in the ${ctx.industry} industry</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <span className="text-4xl mb-4 block">{f.icon}</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genServices(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.default[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.default[1];
  const img2 = ctx.images[2] || CONTEXTUAL_IMAGES.default[2];
  return `import React from 'react';

const services = [
  { name: 'Premium Service', desc: 'Our flagship ${ctx.industry} offering with personalized attention to detail.', price: 'From $99', img: '${img0}' },
  { name: 'Standard Package', desc: 'Everything you need to get started with professional quality.', price: 'From $59', img: '${img1}' },
  { name: 'Custom Solution', desc: 'Tailored specifically to your unique requirements and goals.', price: 'Contact Us', img: '${img2}' },
];

export default function Services() {
  return (
    <section id="services" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Services</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Professional solutions tailored to your needs</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <div key={i} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <div className="h-56 overflow-hidden">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-2">{s.name}</h3>
                <p className="text-muted-foreground mb-4">{s.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold text-lg">{s.price}</span>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Learn More</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genAbout(ctx: GeneratorContext): string {
  const img = ctx.images[1] || CONTEXTUAL_IMAGES.default[1];
  return `import React from 'react';

export default function About() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-6">About ${ctx.brandName}</h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">With years of experience in the ${ctx.industry} industry, we have built a reputation for excellence, reliability, and genuine care for our clients.</p>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">Our team of dedicated professionals is passionate about delivering exceptional results that exceed expectations every time.</p>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center"><span className="block text-3xl font-bold text-primary">10+</span><span className="text-muted-foreground text-sm">Years</span></div>
              <div className="text-center"><span className="block text-3xl font-bold text-primary">500+</span><span className="text-muted-foreground text-sm">Clients</span></div>
              <div className="text-center"><span className="block text-3xl font-bold text-primary">50+</span><span className="text-muted-foreground text-sm">Team</span></div>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img src="${img}" alt="About ${ctx.brandName}" className="w-full h-[500px] object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}`;
}

function genTestimonials(ctx: GeneratorContext): string {
  return `import React from 'react';

const testimonials = [
  { name: 'Sarah Johnson', role: 'Regular Client', text: 'Absolutely outstanding service! ${ctx.brandName} exceeded all my expectations.', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Michael Chen', role: 'Business Owner', text: 'Professional, reliable, and incredibly talented. They transformed my vision into reality.', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Emily Rodriguez', role: 'Returning Customer', text: 'The attention to detail and personalized approach makes all the difference.', img: '${PORTRAIT_IMAGES[2]}' },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8">
              <div className="flex items-center gap-1 mb-4">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-500 text-lg">★</span>)}</div>
              <p className="text-card-foreground mb-6 italic leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                <div><p className="font-semibold text-card-foreground">{t.name}</p><p className="text-muted-foreground text-sm">{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genContact(ctx: GeneratorContext): string {
  const emailDomain = ctx.brandName.toLowerCase().replace(/\s+/g, '');
  return `import React from 'react';

export default function Contact() {
  return (
    <section id="contact" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-6">Get In Touch</h2>
            <p className="text-muted-foreground text-lg mb-8">Ready to get started? Reach out and we will respond within 24 hours.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground"><span className="text-primary text-xl">📍</span>123 Business Ave, Suite 100</div>
              <div className="flex items-center gap-3 text-foreground"><span className="text-primary text-xl">📞</span>(555) 123-4567</div>
              <div className="flex items-center gap-3 text-foreground"><span className="text-primary text-xl">✉️</span>hello@${emailDomain}.com</div>
            </div>
          </div>
          <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="First Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
              <input placeholder="Last Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            </div>
            <input placeholder="Email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <textarea placeholder="Your Message" rows={4} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
            <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  );
}`;
}

function genFooter(ctx: GeneratorContext): string {
  return `import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-xl font-bold mb-4">${ctx.brandName}</h3>
            <p className="text-background/70 text-sm leading-relaxed">Delivering exceptional quality and service since day one.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-background/70 text-sm">
              <li><a href="#" className="hover:text-background transition-colors">Home</a></li>
              <li><a href="#services" className="hover:text-background transition-colors">Services</a></li>
              <li><a href="#about" className="hover:text-background transition-colors">About</a></li>
              <li><a href="#contact" className="hover:text-background transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Hours</h4>
            <ul className="space-y-2 text-background/70 text-sm">
              <li>Mon-Fri: 9am - 6pm</li>
              <li>Saturday: 10am - 4pm</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-sm">X</a>
              <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-sm">in</a>
              <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-sm">ig</a>
            </div>
          </div>
        </div>
        <div className="border-t border-background/20 pt-8 text-center text-background/50 text-sm">&copy; {new Date().getFullYear()} ${ctx.brandName}. All rights reserved.</div>
      </div>
    </footer>
  );
}`;
}

function genPricing(_ctx: GeneratorContext): string {
  return `import React from 'react';

const plans = [
  { name: 'Basic', price: '$29', period: '/mo', features: ['Core features', 'Email support', '1 user', 'Basic analytics'], popular: false },
  { name: 'Professional', price: '$79', period: '/mo', features: ['Everything in Basic', 'Priority support', '5 users', 'Advanced analytics', 'Custom integrations'], popular: true },
  { name: 'Enterprise', price: '$199', period: '/mo', features: ['Everything in Pro', '24/7 support', 'Unlimited users', 'Custom solutions', 'Dedicated manager'], popular: false },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Simple Pricing</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Choose the plan that fits your needs</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <div key={i} className={\`bg-card border rounded-2xl p-8 relative \${p.popular ? 'border-primary shadow-xl scale-105' : 'border-border'}\`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{p.name}</h3>
              <div className="mb-6"><span className="text-4xl font-bold text-foreground">{p.price}</span><span className="text-muted-foreground">{p.period}</span></div>
              <ul className="space-y-3 mb-8">{p.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-muted-foreground"><span className="text-primary">✓</span>{f}</li>)}</ul>
              <button className={\`w-full py-3 rounded-lg font-semibold transition-opacity \${p.popular ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-secondary-foreground hover:opacity-80'}\`}>Get Started</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genGallery(_ctx: GeneratorContext): string {
  return `import React from 'react';

const galleryImages = [
  '${CONTEXTUAL_IMAGES.default[0]}',
  '${CONTEXTUAL_IMAGES.default[1]}',
  '${CONTEXTUAL_IMAGES.default[2]}',
  '${CONTEXTUAL_IMAGES.portfolio[0]}',
  '${CONTEXTUAL_IMAGES.agency[0]}',
  '${CONTEXTUAL_IMAGES.saas[0]}',
];

export default function Gallery() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Our Work</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((src, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden group cursor-pointer">
              <img src={src} alt={\`Gallery \${i+1}\`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genCTA(ctx: GeneratorContext): string {
  return `import React from 'react';

export default function CTA() {
  return (
    <section className="py-24 bg-primary">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-primary-foreground mb-6">Ready to Get Started?</h2>
        <p className="text-primary-foreground/80 text-xl mb-10 max-w-2xl mx-auto">Join hundreds of satisfied customers who chose ${ctx.brandName}.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button className="px-8 py-4 bg-background text-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg">Contact Us Today</button>
          <button className="px-8 py-4 border-2 border-primary-foreground text-primary-foreground font-semibold rounded-lg hover:bg-primary-foreground/10 transition-colors text-lg">View Our Work</button>
        </div>
      </div>
    </section>
  );
}`;
}

function genFAQ(_ctx: GeneratorContext): string {
  return `import React from 'react';

const faqs = [
  { q: 'How do I get started?', a: 'Simply reach out through our contact form or give us a call. We will schedule a free consultation to discuss your needs.' },
  { q: 'What are your hours?', a: 'We are open Monday through Friday, 9am to 6pm, and Saturday 10am to 4pm.' },
  { q: 'Do you offer free consultations?', a: 'Yes! We offer a complimentary initial consultation to understand your requirements and provide a detailed quote.' },
  { q: 'What is your cancellation policy?', a: 'We require 24-hour notice for cancellations. Late cancellations may incur a fee.' },
];

export default function FAQ() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <section className="py-24 bg-background">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-6 py-4 flex items-center justify-between text-left text-foreground font-medium hover:bg-secondary/50 transition-colors">
                {f.q}<span className="text-muted-foreground ml-2">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <div className="px-6 pb-4 text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genTeam(_ctx: GeneratorContext): string {
  return `import React from 'react';

const members = [
  { name: 'Alex Thompson', role: 'Founder & CEO', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Maria Garcia', role: 'Creative Director', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'James Wilson', role: 'Lead Developer', img: '${PORTRAIT_IMAGES[2]}' },
  { name: 'Sophie Chen', role: 'Operations Manager', img: '${PORTRAIT_IMAGES[3]}' },
];

export default function Team() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Meet Our Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {members.map((m, i) => (
            <div key={i} className="text-center group">
              <div className="w-40 h-40 mx-auto rounded-full overflow-hidden mb-4 ring-4 ring-border group-hover:ring-primary transition-all">
                <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">{m.name}</h3>
              <p className="text-muted-foreground text-sm">{m.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

// ── Industry-specific generators ──────────────────────────────────────────────

function genMenu(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.default[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.default[1];
  return `import React from 'react';

const menuItems = [
  { category: 'Starters', items: [
    { name: 'Bruschetta', desc: 'Toasted bread with fresh tomatoes, basil, and olive oil', price: '$12', img: '${img0}' },
    { name: 'Soup of the Day', desc: 'Chef\\'s daily selection served with artisan bread', price: '$10' },
    { name: 'Caesar Salad', desc: 'Crisp romaine with parmesan, croutons, and house dressing', price: '$14' },
  ]},
  { category: 'Main Courses', items: [
    { name: 'Grilled Salmon', desc: 'Atlantic salmon with seasonal vegetables and lemon butter', price: '$28', img: '${img1}' },
    { name: 'Filet Mignon', desc: '8oz prime cut with truffle mashed potatoes', price: '$42' },
    { name: 'Pasta Primavera', desc: 'Fresh pasta with garden vegetables in a light cream sauce', price: '$22' },
  ]},
];

export function Menu() {
  return (
    <section id="menu" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Menu</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Crafted with the finest seasonal ingredients</p>
        {menuItems.map((cat, ci) => (
          <div key={ci} className="mb-16 last:mb-0">
            <h3 className="text-2xl font-semibold text-primary mb-8 text-center">{cat.category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cat.items.map((item, ii) => (
                <div key={ii} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  {item.img && <img src={item.img} alt={item.name} className="w-full h-48 object-cover" />}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-semibold text-card-foreground">{item.name}</h4>
                      <span className="text-primary font-bold">{item.price}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Menu;`;
}

function genReservation(ctx: GeneratorContext): string {
  return `import React from 'react';

export function Reservation() {
  return (
    <section id="reservation" className="py-24 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Make a Reservation</h2>
        <p className="text-muted-foreground text-center mb-12 text-lg">Book your table at ${ctx.brandName}</p>
        <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Full Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Phone Number" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="date" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground" />
            <input type="time" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground" />
            <select className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground">
              <option>2 Guests</option><option>3 Guests</option><option>4 Guests</option><option>5 Guests</option><option>6+ Guests</option>
            </select>
          </div>
          <textarea placeholder="Special Requests" rows={3} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Reserve Table</button>
        </form>
      </div>
    </section>
  );
}

export default Reservation;`;
}

function genSpecials(ctx: GeneratorContext): string {
  const img = ctx.images[0] || CONTEXTUAL_IMAGES.default[0];
  return `import React from 'react';

const specials = [
  { name: 'Chef\\'s Tasting Menu', desc: 'A curated five-course experience featuring seasonal highlights.', price: '$85/person', img: '${img}' },
  { name: 'Weekend Brunch', desc: 'Enjoy our signature brunch menu every Saturday and Sunday.', price: 'From $18' },
  { name: 'Happy Hour', desc: 'Half-price appetizers and cocktails, Mon–Fri 4–6 PM.', price: 'From $6' },
];

export function Specials() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Today's Specials</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Don't miss our hand-picked selections</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specials.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              {s.img && <img src={s.img} alt={s.name} className="w-full h-48 object-cover" />}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-2">{s.name}</h3>
                <p className="text-muted-foreground mb-3">{s.desc}</p>
                <span className="text-primary font-bold">{s.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Specials;`;
}

function genBooking(ctx: GeneratorContext): string {
  return genReservation(ctx);
}

const SECTION_GENERATORS: Record<string, (ctx: GeneratorContext) => string> = {
  hero: genHero, navbar: genNavbar, header: genHeader, features: genFeatures,
  services: genServices, about: genAbout, testimonials: genTestimonials,
  contact: genContact, footer: genFooter, pricing: genPricing,
  gallery: genGallery, cta: genCTA, faq: genFAQ, team: genTeam,
  menu: genMenu, reservation: genReservation, specials: genSpecials, booking: genBooking,
};

/** Normalize component name to a section generator key. */
function matchSectionGenerator(componentName: string): string | null {
  const lower = componentName.toLowerCase().replace(/section$|component$|block$/i, '');
  if (SECTION_GENERATORS[lower]) return lower;
  const aliases: Record<string, string> = {
    navigation: 'navbar', nav: 'navbar', topbar: 'navbar',
    herosection: 'hero', herobanner: 'hero', banner: 'hero', jumbotron: 'hero',
    featurelist: 'features', featuregrid: 'features', benefits: 'features', whyus: 'features', whychooseus: 'features',
    servicelist: 'services', servicegrid: 'services', offerings: 'services',
    aboutus: 'about', aboutsection: 'about', story: 'about',
    testimonial: 'testimonials', reviews: 'testimonials', clientreviews: 'testimonials',
    contactform: 'contact', contactus: 'contact', getintouch: 'contact',
    footersection: 'footer', sitefooter: 'footer',
    pricingplan: 'pricing', pricingtable: 'pricing', plans: 'pricing',
    portfolio: 'gallery', showcase: 'gallery', work: 'gallery', projects: 'gallery',
    calltoaction: 'cta', ctasection: 'cta', ctablock: 'cta',
    faqsection: 'faq', questions: 'faq',
    teamgrid: 'team', ourteam: 'team', staff: 'team', people: 'team',
    // Restaurant / food industry
    menusection: 'menu', menulist: 'menu', foodmenu: 'menu', diningmenu: 'menu',
    reservations: 'reservation', reservationform: 'reservation', booktable: 'reservation', tablereservation: 'reservation',
    bookingform: 'booking', bookingwidget: 'booking', appointmentform: 'booking', schedulebooking: 'booking',
    dailyspecials: 'specials', todaysspecials: 'specials', specialoffers: 'specials', featuredmenu: 'specials',
  };
  if (aliases[lower]) return aliases[lower];
  for (const key of Object.keys(SECTION_GENERATORS)) {
    if (lower.includes(key)) return key;
  }
  return null;
}

/**
 * Scan all files for relative imports. For missing modules, generate REAL
 * contextual section components using the wizard launcher context
 * inferred from existing VFS content (industry, brand name, images).
 */
function generateMissingComponents(sandpackFiles: Record<string, string>): void {
  const existingPaths = new Set(Object.keys(sandpackFiles));
  const extensions = ['.tsx', '.jsx', '.ts', '.js'];

  const industry = detectIndustryFromVFS(sandpackFiles);
  const images = CONTEXTUAL_IMAGES[industry] || CONTEXTUAL_IMAGES.default;
  const brandName = extractBusinessName(sandpackFiles);
  const ctx: GeneratorContext = { industry, images, portraits: PORTRAIT_IMAGES, brandName };

  for (const [filePath, content] of Object.entries({ ...sandpackFiles })) {
    if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;

    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"](\.\.?\/[^'"]+)['"]/g;
    let im;
    while ((im = importRegex.exec(content)) !== null) {
      const rawImportPath = im[1];
      const dir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
      let resolved = rawImportPath.startsWith('/')
        ? rawImportPath
        : `${dir}/${rawImportPath}`.replace(/\/\.\//g, '/');

      const parts = resolved.split('/');
      const stack: string[] = [];
      for (const p of parts) {
        if (p === '..') stack.pop();
        else if (p !== '.' && p !== '') stack.push(p);
      }
      resolved = '/' + stack.join('/');

      if (/\.(css|scss|less)$/.test(resolved)) continue;

      const candidates = [resolved, ...extensions.map(ext => resolved + ext)];
      if (candidates.some(c => existingPaths.has(c))) continue;

      const targetPath = /\.\w+$/.test(resolved) ? resolved : `${resolved}.tsx`;
      if (existingPaths.has(targetPath)) continue;

      const importStatement = im[0];
      const defaultMatch = importStatement.match(/import\s+([A-Z]\w*)\s/);
      const namedMatch = importStatement.match(/import\s+\{([^}]+)\}/);
      const componentName = defaultMatch?.[1] || namedMatch?.[1]?.split(',')[0]?.trim()?.split(/\s+as\s+/)?.[0] || resolved.split('/').pop() || '';

      const sectionKey = matchSectionGenerator(componentName);

      if (sectionKey) {
        let generated = SECTION_GENERATORS[sectionKey](ctx);
        // Ensure BOTH named and default exports exist so either import style works
        // Section generators already export default; add named export if missing
        if (namedMatch) {
          const names = namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
          for (const name of names) {
            if (/^[A-Z]/.test(name) && !generated.includes(`export function ${name}`) && !generated.includes(`export const ${name}`)) {
              // Re-export default under the named identifier
              generated += `\nexport { default as ${name} } from '.';\n`;
              // Simpler: just add a named export alias at the end
              generated = generated.replace(
                /export default function (\w+)/,
                `export function ${name}$1_default`.length ? `export function $1` : `export default function $1`
              );
              // Actually the cleanest approach: replace `export default function X` with `export function X` + add `export default X` at end
            }
          }
          // Simplest robust fix: ensure the component function name is also a named export
          // Most generators use `export default function Hero()`. Convert to dual export.
          const fnMatch = generated.match(/export default function (\w+)/);
          if (fnMatch) {
            const fnName = fnMatch[1];
            // Already has both? Skip
            if (!generated.includes(`export { ${fnName} }`) && !generated.includes(`export function ${fnName}`)) {
              // Change `export default function X` to `export function X` + add `export default X` at end
              generated = generated.replace(`export default function ${fnName}`, `export function ${fnName}`);
              if (!generated.includes(`export default ${fnName}`)) {
                generated += `\nexport default ${fnName};\n`;
              }
            }
          }
        }
        sandpackFiles[targetPath] = generated;
        console.log(`[sandpackFilePrep] Generated real ${sectionKey} component: ${targetPath}`);
      } else {
        const displayName = componentName.replace(/([A-Z])/g, ' $1').trim();
        let code = `import React from 'react';\n\n`;
        // Always generate BOTH named and default exports for maximum compatibility
        const safeName = componentName || 'Section';
        if (namedMatch) {
          const names = namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
          for (const name of names) {
            if (/^[A-Z]/.test(name)) {
              code += `export function ${name}({ children, className, ...props }: any) {\n  return (\n    <div className={"py-12 px-6 " + (className || "")} {...props}>\n      <div className="max-w-7xl mx-auto">{children || <p className="text-muted-foreground text-center">${name} Section</p>}</div>\n    </div>\n  );\n}\n\n`;
            } else {
              code += `export const ${name} = undefined;\n`;
            }
          }
          // Add default export as the first named component
          const primaryName = names.find(n => /^[A-Z]/.test(n));
          if (primaryName) {
            code += `export default ${primaryName};\n`;
          }
        } else {
          code += `export function ${safeName}({ children, className, ...props }: any) {\n  return (\n    <section className={"py-16 px-6 " + (className || "")} {...props}>\n      <div className="max-w-7xl mx-auto">{children || <h2 className="text-3xl font-bold text-foreground text-center">${displayName || 'Section'}</h2>}</div>\n    </section>\n  );\n}\n\nexport default ${safeName};\n`;
        }
        sandpackFiles[targetPath] = code;
        console.warn(`[sandpackFilePrep] Generated generic component: ${targetPath} (no section match for "${componentName}")`);
      }

      existingPaths.add(targetPath);
    }
  }
}

function pickPrimaryComponentPath(paths: string[]): string | null {
  const uniquePaths = [...new Set(paths)].filter((path) => path !== '/hooks-shim.ts');

  return uniquePaths.find((path) => path === '/App.tsx' || path === '/App.jsx')
    || uniquePaths.find((path) => /\/pages\/(Home|Index)[^/]*\.(tsx|jsx)$/i.test(path))
    || uniquePaths.find((path) => /\/pages\//.test(path))
    || uniquePaths.find((path) => !/\/(index)\.(tsx|jsx)$/.test(path))
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
 * Normalize raw launcher/wizard VFS files before handing off to the Web Builder.
 * Ensures consistent paths, entry files, and CSS tokens.
 */
export function normalizeLauncherFiles(
  files: Record<string, string>,
  options?: { entryPoint?: string }
): Record<string, string> {
  const out: Record<string, string> = {};

  // Normalize all paths to have leading slash
  for (const [path, content] of Object.entries(files)) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    // Sanitize image URLs and enforce contrast in all files
    let sanitized = content;
    if (/\.(tsx?|jsx?|css)$/.test(normalized)) {
      sanitized = repairBrokenImageUrls(sanitized);
    }
    if (normalized.endsWith('.css')) {
      sanitized = enforceContrastInCSS(sanitized);
    }
    out[normalized] = sanitized;
  }

  // Ensure /src/main.tsx exists
  if (!out['/src/main.tsx']) {
    out['/src/main.tsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  // Ensure /src/index.css exists
  if (!out['/src/index.css']) {
    out['/src/index.css'] = BASE_CSS;
  }

  // Ensure /src/App.tsx exists — derive from entryPoint or first page component
  if (!out['/src/App.tsx']) {
    const entryPoint = options?.entryPoint;
    let targetImport: string | null = null;

    if (entryPoint && out[entryPoint]) {
      targetImport = entryPoint;
    } else {
      // Find a page or component to use as entry
      targetImport =
        Object.keys(out).find(p => /\/src\/pages\/(Home|Index)[^/]*\.(tsx|jsx)$/i.test(p)) ||
        Object.keys(out).find(p => /\/src\/pages\/.+\.(tsx|jsx)$/.test(p)) ||
        Object.keys(out).find(p => /\/src\/.*\.(tsx|jsx)$/.test(p) && !/\/(main|index)\.(tsx|jsx)$/.test(p));
    }

    if (targetImport) {
      const importPath = targetImport.replace('/src/', './').replace(/\.(tsx|jsx)$/, '');
      out['/src/App.tsx'] = `import React from 'react';
import Entry from '${importPath}';

export default function App() {
  return <Entry />;
}`;
    }
  }

  return out;
}

/**
 * Compile source VFS files (in /src/ structure) into a Sandpack-compatible overlay.
 * This is the canonical preview compiler — the SINGLE source of truth for preview prep.
 * 
 * Source VFS: /src/App.tsx, /src/main.tsx, /src/components/...
 * Sandpack overlay: /App.tsx, /index.tsx, /index.css, /components/...
 * 
 * Key rules:
 * - /src/ prefix is stripped (flattened to root)
 * - /main.tsx is ALWAYS renamed to /index.tsx (Sandpack react-ts entry point)
 * - /index.tsx is the ONLY valid entry — never /main.tsx
 * - Missing /App.tsx gets a proxy to the primary component
 * - Missing /index.tsx gets DEFAULT_INDEX injected
 */
export function prepareSandpackFiles(
  files: Record<string, string>,
  options?: { strict?: boolean; entryPoint?: string }
): Record<string, string> {
  const sandpackFiles: Record<string, string> = {};
  let hasApp = false;
  let hasIndex = false;
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

    // *** CRITICAL FIX: Rename /main.tsx → /index.tsx ***
    // Sandpack react-ts template uses /index.tsx as its entry point, NOT /main.tsx.
    if (normalizedPath === '/main.tsx') {
      normalizedPath = '/index.tsx';
    } else if (normalizedPath === '/main.jsx') {
      normalizedPath = '/index.jsx';
    } else if (normalizedPath === '/main.ts') {
      normalizedPath = '/index.ts';
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
    processedContent = repairBrokenImageUrls(processedContent);
    processedContent = injectPreviewNavBridge(processedContent, normalizedPath);
    sandpackFiles[normalizedPath] = processedContent;

    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && normalizedPath !== '/hooks-shim.ts') {
      componentFilePaths.push(normalizedPath);
    }
    if (normalizedPath === '/App.tsx' || normalizedPath === '/App.jsx') hasApp = true;
    if (normalizedPath === '/index.tsx' || normalizedPath === '/index.jsx') hasIndex = true;
    if (normalizedPath.endsWith('.css')) hasCSS = true;
  }

  if (!hasCSS) {
    sandpackFiles['/index.css'] = BASE_CSS;
  } else {
    // Ensure semantic CSS variables exist even when user/Launcher provides CSS.
    const existingCSS = sandpackFiles['/index.css'] || '';
    if (existingCSS && !existingCSS.includes('--primary:')) {
      sandpackFiles['/index.css'] = SEMANTIC_CSS_VARS + '\n' + existingCSS;
    }
  }

  // Enforce contrast on final CSS
  if (sandpackFiles['/index.css']) {
    sandpackFiles['/index.css'] = enforceContrastInCSS(sandpackFiles['/index.css']);
  }

  if (!hasApp) {
    if (options?.strict && options?.entryPoint) {
      // In strict mode with explicit entry, create proxy to that entry
      const entryFlattened = options.entryPoint.replace(/^\/src\//, '/');
      if (sandpackFiles[entryFlattened]) {
        sandpackFiles['/App.tsx'] = createProxyApp(entryFlattened);
      } else {
        sandpackFiles['/App.tsx'] = createMissingEntryApp();
      }
    } else {
      const primaryComponentPath = pickPrimaryComponentPath(componentFilePaths);
      if (primaryComponentPath) {
        sandpackFiles['/App.tsx'] = createProxyApp(primaryComponentPath);
      } else {
        sandpackFiles['/App.tsx'] = createMissingEntryApp();
      }
    }
  }

  // ── SAFETY: Validate App.tsx has a default export ──
  // If AI-generated App.tsx only uses named exports (e.g., `export function App`),
  // `import App from './App'` in index.tsx resolves to undefined → crash.
  const appContent = sandpackFiles['/App.tsx'] || sandpackFiles['/App.jsx'] || '';
  if (appContent && !appContent.includes('export default')) {
    const appPath = sandpackFiles['/App.tsx'] ? '/App.tsx' : '/App.jsx';
    // Find a PascalCase named export to re-export as default
    const namedExportMatch = appContent.match(/export\s+(?:function|const|class)\s+([A-Z]\w*)/);
    if (namedExportMatch) {
      sandpackFiles[appPath] = appContent + `\nexport default ${namedExportMatch[1]};\n`;
      console.warn(`[sandpackFilePrep] App.tsx missing default export — added: export default ${namedExportMatch[1]}`);
    } else {
      // No usable export found — wrap in a proxy
      sandpackFiles['/App.tsx'] = createMissingEntryApp();
      console.warn('[sandpackFilePrep] App.tsx has no valid exports — replaced with diagnostic entry');
    }
  }
  if (!hasIndex) sandpackFiles['/index.tsx'] = DEFAULT_INDEX;
  
  // Remove any stale /main.tsx that might have leaked through
  delete sandpackFiles['/main.tsx'];
  delete sandpackFiles['/main.jsx'];

  sandpackFiles['/hooks-shim.ts'] = HOOKS_SHIM;

  // ── Generate real components for missing relative imports ──
  generateMissingComponents(sandpackFiles);

  // Ensure template.css exists if any file imports it
  const anyImportsTemplateCss = Object.values(sandpackFiles).some(c =>
    typeof c === 'string' && /import\s+['"]\.\/template\.css['"]/.test(c)
  );
  if (anyImportsTemplateCss && !sandpackFiles['/template.css']) {
    sandpackFiles['/template.css'] = '/* template styles */\n';
  }

  // Ensure index.html exists with Tailwind CDN + semantic theme config
  if (!sandpackFiles['/index.html']) {
    sandpackFiles['/index.html'] = PREVIEW_INDEX_HTML;
  }

  console.log('[sandpackFilePrep] Prepared files:', Object.keys(sandpackFiles));
  return sandpackFiles;
}
