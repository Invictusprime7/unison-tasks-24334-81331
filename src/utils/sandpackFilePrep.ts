/**
 * Sandpack File Preparation Utilities
 * 
 * THE canonical preview compiler for Unison Tasks.
 * 
 * Sandpack's react-ts template expects files at ROOT level (e.g., /App.tsx, not /src/App.tsx).
 * Entry point MUST be /index.tsx (not /main.tsx) — Sandpack react-ts uses /index.tsx.
 * This module flattens VFS paths, processes imports, and ensures essential files exist.
 *
 * Pipeline:
 *   Launcher → normalizeLauncherFiles() → source VFS
 *   source VFS → prepareSandpackFiles() → Sandpack overlay
 *   or:
 *   Launcher → compileLauncherOutputForPreview() → Sandpack overlay (combines both steps)
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

// ── Lib/utils shim — provides real cn() function ─────────────────────────────
const LIB_UTILS_SHIM = `
export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
export function clsx(...args) {
  return args.flat(Infinity).filter(x => typeof x === 'string' && x).join(' ');
}
export default { cn, clsx };
`;

// ── UI components shim — provides real React component stubs ─────────────────
const UI_COMPONENTS_SHIM = `
import React from 'react';

// Utility
function cn(...inputs) { return inputs.filter(Boolean).join(' '); }

// Button
export function Button({ children, className, variant, size, asChild, ...props }) {
  return React.createElement('button', { className: cn('inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2', className), ...props }, children);
}

// Card
export function Card({ children, className, ...props }) { return React.createElement('div', { className: cn('rounded-lg border bg-card text-card-foreground shadow-sm', className), ...props }, children); }
export function CardHeader({ children, className, ...props }) { return React.createElement('div', { className: cn('flex flex-col space-y-1.5 p-6', className), ...props }, children); }
export function CardTitle({ children, className, ...props }) { return React.createElement('h3', { className: cn('text-2xl font-semibold leading-none tracking-tight', className), ...props }, children); }
export function CardDescription({ children, className, ...props }) { return React.createElement('p', { className: cn('text-sm text-muted-foreground', className), ...props }, children); }
export function CardContent({ children, className, ...props }) { return React.createElement('div', { className: cn('p-6 pt-0', className), ...props }, children); }
export function CardFooter({ children, className, ...props }) { return React.createElement('div', { className: cn('flex items-center p-6 pt-0', className), ...props }, children); }

// Input
export function Input({ className, type = 'text', ...props }) { return React.createElement('input', { type, className: cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm', className), ...props }); }

// Label
export function Label({ children, className, ...props }) { return React.createElement('label', { className: cn('text-sm font-medium leading-none', className), ...props }, children); }

// Badge
export function Badge({ children, className, variant, ...props }) { return React.createElement('span', { className: cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', className), ...props }, children); }

// Separator
export function Separator({ className, orientation = 'horizontal', ...props }) { return React.createElement('div', { className: cn(orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', 'shrink-0 bg-border', className), ...props }); }

// Textarea
export function Textarea({ className, ...props }) { return React.createElement('textarea', { className: cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm', className), ...props }); }

// Avatar
export function Avatar({ children, className, ...props }) { return React.createElement('span', { className: cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className), ...props }, children); }
export function AvatarImage({ src, alt, className, ...props }) { return React.createElement('img', { src, alt, className: cn('aspect-square h-full w-full', className), ...props }); }
export function AvatarFallback({ children, className, ...props }) { return React.createElement('span', { className: cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className), ...props }, children); }

// ScrollArea
export function ScrollArea({ children, className, ...props }) { return React.createElement('div', { className: cn('overflow-auto', className), ...props }, children); }

// Tabs
export function Tabs({ children, className, defaultValue, ...props }) { return React.createElement('div', { className, ...props }, children); }
export function TabsList({ children, className, ...props }) { return React.createElement('div', { className: cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1', className), ...props }, children); }
export function TabsTrigger({ children, className, value, ...props }) { return React.createElement('button', { className: cn('inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium', className), ...props }, children); }
export function TabsContent({ children, className, value, ...props }) { return React.createElement('div', { className, ...props }, children); }

// Dialog
export function Dialog({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DialogTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DialogContent({ children, className, ...props }) { return React.createElement('div', { className: cn('fixed inset-0 z-50 flex items-center justify-center', className), ...props }, children); }
export function DialogHeader({ children, className, ...props }) { return React.createElement('div', { className: cn('flex flex-col space-y-1.5 text-center sm:text-left', className), ...props }, children); }
export function DialogTitle({ children, className, ...props }) { return React.createElement('h2', { className: cn('text-lg font-semibold', className), ...props }, children); }
export function DialogDescription({ children, className, ...props }) { return React.createElement('p', { className: cn('text-sm text-muted-foreground', className), ...props }, children); }

// Sheet
export function Sheet({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function SheetTrigger({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function SheetContent({ children, className, ...props }) { return React.createElement('div', { className, ...props }, children); }

// Select  
export function Select({ children, ...props }) { return React.createElement('div', null, children); }
export function SelectTrigger({ children, className, ...props }) { return React.createElement('button', { className: cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm', className), ...props }, children); }
export function SelectValue({ placeholder, ...props }) { return React.createElement('span', props, placeholder); }
export function SelectContent({ children, ...props }) { return React.createElement('div', props, children); }
export function SelectItem({ children, value, ...props }) { return React.createElement('div', props, children); }

// Switch
export function Switch({ className, ...props }) { return React.createElement('button', { className: cn('peer inline-flex h-[24px] w-[44px] rounded-full border-2', className), role: 'switch', ...props }); }

// Accordion
export function Accordion({ children, ...props }) { return React.createElement('div', props, children); }
export function AccordionItem({ children, value, ...props }) { return React.createElement('div', props, children); }
export function AccordionTrigger({ children, ...props }) { return React.createElement('button', props, children); }
export function AccordionContent({ children, ...props }) { return React.createElement('div', props, children); }

// Progress
export function Progress({ value = 0, className, ...props }) { return React.createElement('div', { className: cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className), ...props }, React.createElement('div', { style: { width: value + '%' }, className: 'h-full bg-primary transition-all' })); }

// Tooltip
export function Tooltip({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function TooltipTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function TooltipContent({ children, ...props }) { return null; }
export function TooltipProvider({ children, ...props }) { return React.createElement(React.Fragment, null, children); }

// Skeleton
export function Skeleton({ className, ...props }) { return React.createElement('div', { className: cn('animate-pulse rounded-md bg-muted', className), ...props }); }

// Checkbox
export function Checkbox({ className, ...props }) { return React.createElement('input', { type: 'checkbox', className, ...props }); }

// RadioGroup
export function RadioGroup({ children, ...props }) { return React.createElement('div', props, children); }
export function RadioGroupItem({ value, ...props }) { return React.createElement('input', { type: 'radio', value, ...props }); }

// Sonner toast
export function Toaster(props) { return null; }
export function toast(message) { console.log('[Toast]', message); }

// Form
export function Form({ children, ...props }) { return React.createElement('form', props, children); }
export function FormField({ render, name, control, ...props }) { return render ? render({ field: { name, value: '', onChange: () => {}, onBlur: () => {} } }) : null; }
export function FormItem({ children, ...props }) { return React.createElement('div', { className: 'space-y-2', ...props }, children); }
export function FormLabel({ children, ...props }) { return React.createElement('label', props, children); }
export function FormControl({ children, ...props }) { return React.createElement('div', props, children); }
export function FormMessage({ ...props }) { return null; }

// DropdownMenu
export function DropdownMenu({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DropdownMenuTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DropdownMenuContent({ children, ...props }) { return null; }
export function DropdownMenuItem({ children, ...props }) { return React.createElement('div', props, children); }

// Popover
export function Popover({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function PopoverTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function PopoverContent({ children, ...props }) { return null; }

// Collapsible
export function Collapsible({ children, ...props }) { return React.createElement('div', props, children); }
export function CollapsibleTrigger({ children, ...props }) { return React.createElement('div', props, children); }
export function CollapsibleContent({ children, ...props }) { return React.createElement('div', props, children); }

// NavigationMenu
export function NavigationMenu({ children, className, ...props }) { return React.createElement('nav', { className, ...props }, children); }
export function NavigationMenuList({ children, ...props }) { return React.createElement('ul', props, children); }
export function NavigationMenuItem({ children, ...props }) { return React.createElement('li', props, children); }
export function NavigationMenuTrigger({ children, ...props }) { return React.createElement('button', props, children); }
export function NavigationMenuContent({ children, ...props }) { return React.createElement('div', props, children); }
export function NavigationMenuLink({ children, ...props }) { return React.createElement('a', props, children); }

// Breadcrumb
export function Breadcrumb({ children, ...props }) { return React.createElement('nav', props, children); }
export function BreadcrumbList({ children, ...props }) { return React.createElement('ol', { className: 'flex items-center gap-1.5', ...props }, children); }
export function BreadcrumbItem({ children, ...props }) { return React.createElement('li', props, children); }
export function BreadcrumbLink({ children, ...props }) { return React.createElement('a', props, children); }
export function BreadcrumbSeparator({ ...props }) { return React.createElement('span', props, '/'); }

// Table
export function Table({ children, className, ...props }) { return React.createElement('table', { className: cn('w-full caption-bottom text-sm', className), ...props }, children); }
export function TableHeader({ children, ...props }) { return React.createElement('thead', props, children); }
export function TableBody({ children, ...props }) { return React.createElement('tbody', props, children); }
export function TableRow({ children, className, ...props }) { return React.createElement('tr', { className: cn('border-b', className), ...props }, children); }
export function TableHead({ children, className, ...props }) { return React.createElement('th', { className: cn('h-12 px-4 text-left align-middle font-medium', className), ...props }, children); }
export function TableCell({ children, className, ...props }) { return React.createElement('td', { className: cn('p-4 align-middle', className), ...props }, children); }

// Carousel
export function Carousel({ children, className, ...props }) { return React.createElement('div', { className, ...props }, children); }
export function CarouselContent({ children, ...props }) { return React.createElement('div', { className: 'flex', ...props }, children); }
export function CarouselItem({ children, ...props }) { return React.createElement('div', { className: 'min-w-0 flex-shrink-0 flex-grow-0 basis-full', ...props }, children); }
export function CarouselPrevious({ ...props }) { return React.createElement('button', props, '<'); }
export function CarouselNext({ ...props }) { return React.createElement('button', props, '>'); }

// AspectRatio
export function AspectRatio({ children, ratio = 1, className, ...props }) { return React.createElement('div', { style: { position: 'relative', paddingBottom: (1 / ratio * 100) + '%' }, className, ...props }, React.createElement('div', { style: { position: 'absolute', inset: 0 } }, children)); }

// HoverCard
export function HoverCard({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function HoverCardTrigger({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function HoverCardContent({ children, ...props }) { return null; }

// Command
export function Command({ children, className, ...props }) { return React.createElement('div', { className, ...props }, children); }
export function CommandInput({ ...props }) { return React.createElement('input', { type: 'text', ...props }); }
export function CommandList({ children, ...props }) { return React.createElement('div', props, children); }
export function CommandEmpty({ children, ...props }) { return React.createElement('div', props, children); }
export function CommandGroup({ children, ...props }) { return React.createElement('div', props, children); }
export function CommandItem({ children, ...props }) { return React.createElement('div', props, children); }

// Calendar
export function Calendar({ ...props }) { return React.createElement('div', { className: 'p-3 text-center text-sm text-muted-foreground' }, 'Calendar'); }

export default {};
`;

// ── Industry-contextual fallback images ──────────────────────────────────────
const CONTEXTUAL_IMAGES: Record<string, string[]> = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  ],
  salon: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
    'https://images.unsplash.com/photo-1521590832167-7228f0829e2e?w=800&q=80',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  ],
  medical: [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80',
    'https://images.unsplash.com/photo-1666214280557-091e203c7096?w=800&q=80',
  ],
  saas: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
  ],
  ecommerce: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
  ],
  portfolio: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
  ],
  contractor: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80',
  ],
  agency: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
  ],
  coaching: [
    'https://images.unsplash.com/photo-1552581234-26160f608093?w=800&q=80',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  ],
  'local-service': [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80',
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
    ['restaurant', ['menu', 'dish', 'cuisine', 'chef', 'reservation', 'dining', 'restaurant', 'bistro', 'cafe']],
    ['salon', ['salon', 'beauty', 'hair', 'spa', 'stylist', 'treatment', 'nail', 'skincare', 'facial']],
    ['fitness', ['fitness', 'gym', 'workout', 'training', 'exercise', 'crossfit', 'yoga', 'pilates', 'membership']],
    ['medical', ['medical', 'health', 'clinic', 'doctor', 'patient', 'dental', 'physician', 'hospital', 'healthcare']],
    ['coaching', ['coaching', 'coach', 'consulting', 'mentor', 'mindset', 'breakthrough', 'discovery call', 'mastermind', 'transformation']],
    ['local-service', ['plumbing', 'hvac', 'electrical', 'roofing', 'handyman', 'licensed', 'insured', 'estimate', 'emergency service']],
    ['saas', ['saas', 'software', 'platform', 'dashboard', 'analytics', 'api', 'startup', 'integration', 'deploy']],
    ['ecommerce', ['shop', 'product', 'cart', 'store', 'buy', 'ecommerce', 'collection', 'checkout', 'catalog']],
    ['portfolio', ['portfolio', 'creative', 'freelance', 'selected work', 'case study', 'skillset']],
    ['contractor', ['contractor', 'construction', 'remodel', 'renovation', 'home improvement', 'general contractor']],
    ['agency', ['agency', 'marketing', 'branding', 'campaign', 'strategy', 'digital agency', 'creative agency']],
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

export function Navbar() {
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

export function Header() {
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

export function Features() {
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

export function Services() {
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

export function About() {
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

export function Testimonials() {
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

export function Contact() {
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

export function Footer() {
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

export function Pricing() {
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

export function Gallery() {
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

export function CTA() {
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

export function FAQ() {
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

export function Team() {
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
// RESTAURANT
function genMenu(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.default[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.default[1];
  return `import React from 'react';
const menuItems = [
  { category: 'Starters', items: [
    { name: 'Bruschetta', desc: 'Toasted bread with fresh tomatoes, basil, and olive oil', price: '$12', img: '${img0}' },
    { name: 'Soup of the Day', desc: "Chef's daily selection served with artisan bread", price: '$10' },
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
              <option>2 Guests</option><option>3 Guests</option><option>4 Guests</option><option>5+ Guests</option>
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
  { name: "Chef's Tasting Menu", desc: 'A curated five-course experience featuring seasonal highlights.', price: '$85/person', img: '${img}' },
  { name: 'Weekend Brunch', desc: 'Enjoy our signature brunch menu every Saturday and Sunday.', price: 'From $18' },
  { name: 'Happy Hour', desc: 'Half-price appetizers and cocktails, Mon-Fri 4-6 PM.', price: 'From $6' },
];
export function Specials() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Today's Specials</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Hand-picked selections from our kitchen</p>
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

// SALON / BEAUTY
function genTreatments(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.salon[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.salon[1];
  return `import React from 'react';
const treatments = [
  { name: 'Signature Facial', desc: 'Deep-cleansing facial customized to your skin type with premium products.', duration: '60 min', price: '$95', img: '${img0}' },
  { name: 'Hair Transformation', desc: 'Full color and cut with our senior stylist for a complete new look.', duration: '120 min', price: '$180', img: '${img1}' },
  { name: 'Relaxation Massage', desc: 'Full-body Swedish massage to melt away tension and restore balance.', duration: '90 min', price: '$120' },
  { name: 'Manicure & Pedicure', desc: 'Luxurious hand and foot treatment with gel polish application.', duration: '75 min', price: '$65' },
];
export function Treatments() {
  return (
    <section id="treatments" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Treatments</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Indulge in our curated wellness experiences</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {treatments.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition-shadow">
              {t.img && <img src={t.img} alt={t.name} className="w-full md:w-48 h-48 md:h-auto object-cover" />}
              <div className="p-6 flex-1">
                <h3 className="text-xl font-semibold text-card-foreground mb-2">{t.name}</h3>
                <p className="text-muted-foreground text-sm mb-3">{t.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t.duration}</span>
                  <span className="text-primary font-bold text-lg">{t.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Treatments;`;
}

function genBeforeAfter(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.salon[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.salon[1];
  return `import React from 'react';
const transformations = [
  { title: 'Color Transformation', before: '${img0}', after: '${img1}', desc: 'From brunette to sun-kissed balayage' },
  { title: 'Skin Rejuvenation', before: '${img1}', after: '${img0}', desc: 'Visible results after our signature facial series' },
];
export function BeforeAfter() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Transformations</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">See the results our clients love</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {transformations.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="relative"><img src={t.before} alt="Before" className="w-full h-64 object-cover" /><span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Before</span></div>
                <div className="relative"><img src={t.after} alt="After" className="w-full h-64 object-cover" /><span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">After</span></div>
              </div>
              <div className="p-5"><h3 className="font-semibold text-card-foreground">{t.title}</h3><p className="text-muted-foreground text-sm mt-1">{t.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default BeforeAfter;`;
}

function genStylists(ctx: GeneratorContext): string {
  return `import React from 'react';
const stylists = [
  { name: 'Isabella Cruz', role: 'Senior Stylist', specialty: 'Color & Balayage', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Marcus Lee', role: 'Lead Barber', specialty: 'Precision Cuts', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Ava Williams', role: 'Esthetician', specialty: 'Facials & Skin Care', img: '${PORTRAIT_IMAGES[3]}' },
];
export function Stylists() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Meet Our Stylists</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stylists.map((s, i) => (
            <div key={i} className="text-center group">
              <div className="w-48 h-48 mx-auto rounded-full overflow-hidden mb-4 ring-4 ring-border group-hover:ring-primary transition-all">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">{s.name}</h3>
              <p className="text-primary text-sm font-medium">{s.role}</p>
              <p className="text-muted-foreground text-sm mt-1">{s.specialty}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Stylists;`;
}

// FITNESS / GYM
function genClasses(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.fitness[0];
  return `import React from 'react';
const classes = [
  { name: 'HIIT Burn', time: 'Mon/Wed/Fri 6:00 AM', trainer: 'Coach Mike', level: 'All Levels', img: '${img0}' },
  { name: 'Power Yoga', time: 'Tue/Thu 7:30 AM', trainer: 'Sara K.', level: 'Beginner' },
  { name: 'Spin Cycle', time: 'Mon-Fri 12:00 PM', trainer: 'DJ Marcus', level: 'Intermediate' },
  { name: 'Strength Lab', time: 'Mon/Wed/Fri 5:30 PM', trainer: 'Coach Jake', level: 'Advanced' },
];
export function Classes() {
  return (
    <section id="classes" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Class Schedule</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Find the perfect class for your fitness journey</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((c, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 flex gap-4 items-center hover:shadow-lg transition-shadow">
              {c.img && <img src={c.img} alt={c.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-card-foreground">{c.name}</h3>
                <p className="text-muted-foreground text-sm">{c.time} &middot; {c.trainer}</p>
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{c.level}</span>
              </div>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0">Join</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Classes;`;
}

function genTrainers(ctx: GeneratorContext): string {
  return `import React from 'react';
const trainers = [
  { name: 'Mike Johnson', specialty: 'HIIT & Strength', cert: 'NASM-CPT', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Sara Kim', specialty: 'Yoga & Mobility', cert: 'RYT-500', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Jake Torres', specialty: 'Powerlifting', cert: 'CSCS', img: '${PORTRAIT_IMAGES[2]}' },
];
export function Trainers() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Expert Trainers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {trainers.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <img src={t.img} alt={t.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-card-foreground">{t.name}</h3>
              <p className="text-primary font-medium text-sm">{t.specialty}</p>
              <p className="text-muted-foreground text-xs mt-1">{t.cert}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Trainers;`;
}

function genMembership(_ctx: GeneratorContext): string {
  return `import React from 'react';
const plans = [
  { name: 'Day Pass', price: '$15', period: '/day', features: ['Full gym access', 'Locker room', 'Free WiFi'], popular: false },
  { name: 'Monthly', price: '$49', period: '/mo', features: ['Unlimited gym access', 'All group classes', 'Locker room', 'Free parking'], popular: true },
  { name: 'Annual', price: '$399', period: '/yr', features: ['Everything in Monthly', 'Personal training session', 'Nutrition consult', 'Guest passes'], popular: false },
];
export function Membership() {
  return (
    <section id="membership" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Membership Plans</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Flexible options to fit your lifestyle</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <div key={i} className={\`bg-card border rounded-2xl p-8 relative \${p.popular ? 'border-primary shadow-xl scale-105' : 'border-border'}\`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Best Value</span>}
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{p.name}</h3>
              <div className="mb-6"><span className="text-4xl font-bold text-foreground">{p.price}</span><span className="text-muted-foreground">{p.period}</span></div>
              <ul className="space-y-3 mb-8">{p.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-muted-foreground"><span className="text-primary">✓</span>{f}</li>)}</ul>
              <button className={\`w-full py-3 rounded-lg font-semibold transition-opacity \${p.popular ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-secondary-foreground hover:opacity-80'}\`}>Join Now</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Membership;`;
}

function genSchedule(ctx: GeneratorContext): string { return genClasses(ctx); }
function genPrograms(ctx: GeneratorContext): string { return genClasses(ctx); }

// MEDICAL / HEALTH
function genDoctors(_ctx: GeneratorContext): string {
  return `import React from 'react';
const doctors = [
  { name: 'Dr. Sarah Chen', specialty: 'Family Medicine', education: 'Johns Hopkins University', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Dr. James Wilson', specialty: 'Internal Medicine', education: 'Stanford Medical School', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Dr. Emily Park', specialty: 'Pediatrics', education: 'Harvard Medical School', img: '${PORTRAIT_IMAGES[3]}' },
];
export function Doctors() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Physicians</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Board-certified professionals dedicated to your health</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {doctors.map((d, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <img src={d.img} alt={d.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-4 ring-4 ring-primary/20" />
              <h3 className="text-xl font-semibold text-card-foreground">{d.name}</h3>
              <p className="text-primary font-medium text-sm">{d.specialty}</p>
              <p className="text-muted-foreground text-xs mt-1">{d.education}</p>
              <button className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Book Appointment</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Doctors;`;
}

function genDepartments(ctx: GeneratorContext): string {
  const img = ctx.images[0] || CONTEXTUAL_IMAGES.medical[0];
  return `import React from 'react';
const departments = [
  { name: 'Primary Care', desc: 'Comprehensive health services for the whole family.', icon: '🏥' },
  { name: 'Pediatrics', desc: 'Specialized care for infants, children, and adolescents.', icon: '👶' },
  { name: 'Cardiology', desc: 'Expert heart health monitoring and treatment.', icon: '❤️' },
  { name: 'Orthopedics', desc: 'Bone, joint, and muscle care from diagnosis to recovery.', icon: '🦴' },
  { name: 'Dermatology', desc: 'Skin health diagnostics and cosmetic procedures.', icon: '✨' },
  { name: 'Urgent Care', desc: 'Walk-in care for non-life-threatening emergencies.', icon: '⚡' },
];
export function Departments() {
  return (
    <section id="departments" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Departments</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Comprehensive medical care under one roof</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((d, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <span className="text-3xl mb-3 block">{d.icon}</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{d.name}</h3>
              <p className="text-muted-foreground text-sm">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Departments;`;
}

function genAppointment(ctx: GeneratorContext): string {
  return `import React from 'react';
export function Appointment() {
  return (
    <section id="appointment" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Schedule an Appointment</h2>
        <p className="text-muted-foreground text-center mb-12 text-lg">Your health is our priority at ${ctx.brandName}</p>
        <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Patient Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Phone" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="date" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground" />
            <select className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground">
              <option>Select Department</option><option>Primary Care</option><option>Pediatrics</option><option>Cardiology</option><option>Dermatology</option>
            </select>
          </div>
          <textarea placeholder="Reason for visit" rows={3} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Request Appointment</button>
        </form>
      </div>
    </section>
  );
}
export default Appointment;`;
}

function genInsurance(_ctx: GeneratorContext): string {
  return `import React from 'react';
const providers = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'United Healthcare', 'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid'];
export function Insurance() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Insurance Accepted</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto text-lg">We work with most major insurance providers</p>
        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {providers.map((p, i) => (
            <span key={i} className="bg-card border border-border rounded-xl px-6 py-3 text-card-foreground font-medium text-sm">{p}</span>
          ))}
        </div>
        <p className="text-center text-muted-foreground text-sm mt-8">Don't see your provider? Contact us — we may still be able to help.</p>
      </div>
    </section>
  );
}
export default Insurance;`;
}

// SAAS / SOFTWARE
function genDemo(ctx: GeneratorContext): string {
  const img = ctx.images[0] || CONTEXTUAL_IMAGES.saas[0];
  return `import React from 'react';
export function Demo() {
  return (
    <section id="demo" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">Product Demo</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-6">See ${ctx.brandName} in Action</h2>
            <p className="text-muted-foreground text-lg mb-8">Watch how our platform streamlines your workflow and delivers results from day one.</p>
            <form className="space-y-4 max-w-sm" onSubmit={e => e.preventDefault()}>
              <input placeholder="Work email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Request Demo</button>
            </form>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
            <img src="${img}" alt="Product Demo" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
export default Demo;`;
}

function genIntegrations(_ctx: GeneratorContext): string {
  return `import React from 'react';
const integrations = [
  { name: 'Slack', desc: 'Real-time notifications and team collaboration.', icon: '💬' },
  { name: 'GitHub', desc: 'Sync repositories and track deployments.', icon: '🐙' },
  { name: 'Google Workspace', desc: 'Connect docs, sheets, and calendar.', icon: '📊' },
  { name: 'Stripe', desc: 'Seamless payment processing and invoicing.', icon: '💳' },
  { name: 'Zapier', desc: 'Automate workflows with 5000+ apps.', icon: '⚡' },
  { name: 'HubSpot', desc: 'CRM sync for sales and marketing.', icon: '🎯' },
];
export function Integrations() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Integrations</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Connects with the tools you already use</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {integrations.map((int, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <span className="text-3xl mb-3 block">{int.icon}</span>
              <h3 className="font-semibold text-card-foreground">{int.name}</h3>
              <p className="text-muted-foreground text-xs mt-1">{int.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Integrations;`;
}

function genDashboard(ctx: GeneratorContext): string {
  const img = ctx.images[1] || CONTEXTUAL_IMAGES.saas[1];
  return `import React from 'react';
export function Dashboard() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Dashboard</h2>
        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-lg">Everything you need at a glance — analytics, insights, and controls.</p>
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-border max-w-5xl mx-auto">
          <img src="${img}" alt="Dashboard Preview" className="w-full h-auto" />
        </div>
      </div>
    </section>
  );
}
export default Dashboard;`;
}

// E-COMMERCE
function genProducts(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.ecommerce[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.ecommerce[1];
  const img2 = ctx.images[2] || CONTEXTUAL_IMAGES.ecommerce[2];
  return `import React from 'react';
const products = [
  { name: 'Premium Collection', price: '$129', badge: 'New', img: '${img0}', rating: 4.8 },
  { name: 'Classic Edition', price: '$89', badge: 'Popular', img: '${img1}', rating: 4.9 },
  { name: 'Limited Release', price: '$199', badge: 'Limited', img: '${img2}', rating: 5.0 },
];
export function Products() {
  return (
    <section id="products" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Featured Products</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Handpicked favorites our customers love</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((p, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden group hover:shadow-xl transition-all">
              <div className="relative h-72 overflow-hidden">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">{p.badge}</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-1">{p.name}</h3>
                <div className="flex items-center gap-1 mb-3">{'★'.repeat(Math.floor(p.rating)).split('').map((s, j) => <span key={j} className="text-yellow-500 text-sm">{s}</span>)}<span className="text-muted-foreground text-xs ml-1">{p.rating}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{p.price}</span>
                  <button className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Products;`;
}

function genCategories(ctx: GeneratorContext): string {
  const imgs = ctx.images.length >= 3 ? ctx.images : CONTEXTUAL_IMAGES.ecommerce;
  return `import React from 'react';
const categories = [
  { name: 'New Arrivals', count: 24, img: '${imgs[0]}' },
  { name: 'Best Sellers', count: 18, img: '${imgs[1]}' },
  { name: 'On Sale', count: 12, img: '${imgs[2] || imgs[0]}' },
];
export function Categories() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Shop by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((c, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden group cursor-pointer h-80">
              <img src={c.img} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white">{c.name}</h3>
                <p className="text-white/80 text-sm">{c.count} products</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Categories;`;
}

// PORTFOLIO / CREATIVE
function genPortfolioProjects(ctx: GeneratorContext): string {
  const imgs = ctx.images.length >= 2 ? ctx.images : CONTEXTUAL_IMAGES.portfolio;
  return `import React from 'react';
const projects = [
  { title: 'Brand Identity Redesign', category: 'Branding', img: '${imgs[0]}' },
  { title: 'E-Commerce Platform', category: 'Web Development', img: '${imgs[1]}' },
  { title: 'Mobile App UI/UX', category: 'Design', img: '${imgs[2] || imgs[0]}' },
];
export function PortfolioProjects() {
  return (
    <section id="work" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Selected Work</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">A curated selection of recent projects</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {projects.map((p, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="rounded-2xl overflow-hidden mb-4 aspect-[4/3]">
                <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <span className="text-primary text-sm font-medium">{p.category}</span>
              <h3 className="text-xl font-semibold text-foreground mt-1">{p.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default PortfolioProjects;`;
}

function genSkills(_ctx: GeneratorContext): string {
  return `import React from 'react';
const skills = [
  { name: 'UI/UX Design', level: 95 }, { name: 'React / TypeScript', level: 90 },
  { name: 'Brand Strategy', level: 85 }, { name: 'Motion Design', level: 80 },
];
export function Skills() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Skills & Expertise</h2>
        <div className="space-y-6">
          {skills.map((s, i) => (
            <div key={i}>
              <div className="flex justify-between mb-2"><span className="text-foreground font-medium">{s.name}</span><span className="text-muted-foreground text-sm">{s.level}%</span></div>
              <div className="w-full bg-secondary rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all" style={{ width: s.level + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Skills;`;
}

// CONTRACTOR / LOCAL SERVICE
function genEstimate(ctx: GeneratorContext): string {
  return `import React from 'react';
export function Estimate() {
  return (
    <section id="estimate" className="py-24 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Get a Free Estimate</h2>
        <p className="text-muted-foreground text-center mb-12 text-lg">Tell us about your project and we will get back within 24 hours</p>
        <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Your Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Phone" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <select className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground">
              <option>Select Service</option><option>Plumbing</option><option>Electrical</option><option>HVAC</option><option>Remodeling</option><option>Roofing</option>
            </select>
          </div>
          <textarea placeholder="Project details" rows={4} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Request Free Estimate</button>
        </form>
      </div>
    </section>
  );
}
export default Estimate;`;
}

function genServiceArea(_ctx: GeneratorContext): string {
  return `import React from 'react';
const areas = ['Downtown', 'Midtown', 'Westside', 'Eastside', 'North County', 'South Bay', 'Suburbs', 'Metro Area'];
export function ServiceArea() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Service Areas</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto text-lg">Licensed and insured — proudly serving the greater metro area</p>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {areas.map((a, i) => (
            <span key={i} className="bg-card border border-border rounded-xl px-6 py-3 text-card-foreground font-medium text-sm hover:border-primary transition-colors cursor-default">{a}</span>
          ))}
        </div>
        <p className="text-center mt-8"><button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Check Your Area</button></p>
      </div>
    </section>
  );
}
export default ServiceArea;`;
}

function genLicenses(_ctx: GeneratorContext): string {
  return `import React from 'react';
const credentials = [
  { label: 'Licensed', icon: '📜', desc: 'Fully licensed in all service areas' },
  { label: 'Insured', icon: '🛡️', desc: '$2M liability coverage' },
  { label: 'Bonded', icon: '🔒', desc: 'Performance bond guaranteed' },
  { label: 'BBB A+', icon: '⭐', desc: 'Better Business Bureau rated' },
];
export function Licenses() {
  return (
    <section className="py-16 bg-primary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {credentials.map((c, i) => (
            <div key={i} className="text-center">
              <span className="text-3xl mb-2 block">{c.icon}</span>
              <h3 className="text-primary-foreground font-bold text-lg">{c.label}</h3>
              <p className="text-primary-foreground/70 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Licenses;`;
}

// AGENCY
function genCaseStudies(ctx: GeneratorContext): string {
  const imgs = ctx.images.length >= 2 ? ctx.images : CONTEXTUAL_IMAGES.agency;
  return `import React from 'react';
const studies = [
  { title: 'SaaS Platform Launch', result: '+340% signups in 90 days', category: 'Growth Marketing', img: '${imgs[0]}' },
  { title: 'E-Commerce Rebrand', result: '+120% conversion rate', category: 'Brand Strategy', img: '${imgs[1]}' },
  { title: 'Mobile App Campaign', result: '2M+ downloads in Q1', category: 'Digital Ads', img: '${imgs[2] || imgs[0]}' },
];
export function CaseStudies() {
  return (
    <section id="work" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Case Studies</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Real results for real businesses</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {studies.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden group hover:shadow-xl transition-all cursor-pointer">
              <div className="h-56 overflow-hidden"><img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
              <div className="p-6">
                <span className="text-primary text-sm font-medium">{s.category}</span>
                <h3 className="text-xl font-semibold text-card-foreground mt-1 mb-2">{s.title}</h3>
                <p className="text-muted-foreground font-medium">{s.result}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default CaseStudies;`;
}

function genProcess(_ctx: GeneratorContext): string {
  return `import React from 'react';
const steps = [
  { num: '01', title: 'Discovery', desc: 'Deep-dive into your brand, market, and goals.' },
  { num: '02', title: 'Strategy', desc: 'Data-driven plan tailored to your growth targets.' },
  { num: '03', title: 'Execution', desc: 'Multi-channel campaigns launched with precision.' },
  { num: '04', title: 'Optimize', desc: 'Continuous testing, learning, and scaling.' },
];
export function Process() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Our Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">{s.num}</span>
              <h3 className="text-xl font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Process;`;
}

function genClients(_ctx: GeneratorContext): string {
  return `import React from 'react';
const clients = ['TechCorp', 'GrowthLab', 'NovaBrand', 'Skyline Digital', 'Apex Solutions', 'Vertex Inc.'];
export function Clients() {
  return (
    <section className="py-16 bg-background border-y border-border">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-muted-foreground text-sm uppercase tracking-wider mb-8">Trusted by Leading Brands</p>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          {clients.map((c, i) => (
            <span key={i} className="text-xl font-bold text-muted-foreground/40 hover:text-foreground transition-colors cursor-default">{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Clients;`;
}

// COACHING / CONSULTING
function genMethodology(_ctx: GeneratorContext): string {
  return `import React from 'react';
const pillars = [
  { title: 'Assess', desc: 'Comprehensive evaluation of your current position and goals.', icon: '🔍' },
  { title: 'Plan', desc: 'Custom roadmap designed around your unique challenges.', icon: '📋' },
  { title: 'Execute', desc: 'Guided implementation with accountability checkpoints.', icon: '🚀' },
  { title: 'Sustain', desc: 'Systems and habits for lasting transformation.', icon: '🏆' },
];
export function Methodology() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">The Framework</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">A proven methodology for breakthrough results</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {pillars.map((p, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <span className="text-4xl mb-4 block">{p.icon}</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{p.title}</h3>
              <p className="text-muted-foreground text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Methodology;`;
}

function genResults(_ctx: GeneratorContext): string {
  return `import React from 'react';
const results = [
  { metric: '95%', label: 'Client Satisfaction' },
  { metric: '3x', label: 'Average ROI' },
  { metric: '500+', label: 'Clients Coached' },
  { metric: '12+', label: 'Years Experience' },
];
export function Results() {
  return (
    <section className="py-24 bg-primary">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-primary-foreground text-center mb-16">Proven Results</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {results.map((r, i) => (
            <div key={i} className="text-center">
              <span className="block text-5xl font-bold text-primary-foreground mb-2">{r.metric}</span>
              <span className="text-primary-foreground/70">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Results;`;
}

function genDiscoveryCall(ctx: GeneratorContext): string {
  return `import React from 'react';
export function DiscoveryCall() {
  return (
    <section id="book" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Book a Free Discovery Call</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">Let's explore how ${ctx.brandName} can help you achieve your goals. No pressure, no obligation.</p>
          <form className="max-w-md mx-auto space-y-4" onSubmit={e => e.preventDefault()}>
            <input placeholder="Your Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="What's your biggest challenge?" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Schedule Call</button>
          </form>
        </div>
      </div>
    </section>
  );
}
export default DiscoveryCall;`;
}

function genCoachingPrograms(_ctx: GeneratorContext): string {
  return `import React from 'react';
const programs = [
  { name: '1:1 Coaching', desc: 'Personalized sessions tailored to your goals.', duration: '12 weeks', price: 'From $2,500', popular: false },
  { name: 'Group Mastermind', desc: 'Collaborate with like-minded achievers.', duration: '8 weeks', price: 'From $997', popular: true },
  { name: 'VIP Intensive', desc: 'Accelerated breakthroughs in a focused 2-day deep-dive.', duration: '2 days', price: 'From $5,000', popular: false },
];
export function CoachingPrograms() {
  return (
    <section id="programs" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Programs</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Choose the path that fits your ambition</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {programs.map((p, i) => (
            <div key={i} className={\`bg-card border rounded-2xl p-8 relative \${p.popular ? 'border-primary shadow-xl scale-105' : 'border-border'}\`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{p.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{p.desc}</p>
              <p className="text-muted-foreground text-sm mb-1">{p.duration}</p>
              <p className="text-2xl font-bold text-foreground mb-6">{p.price}</p>
              <button className={\`w-full py-3 rounded-lg font-semibold transition-opacity \${p.popular ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-secondary-foreground hover:opacity-80'}\`}>Apply Now</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default CoachingPrograms;`;
}

// ── Stats section (universal) ─────────────────────────────────────────────────
function genStats(_ctx: GeneratorContext): string {
  return `import React from 'react';
const stats = [
  { value: '10+', label: 'Years Experience' },
  { value: '500+', label: 'Happy Clients' },
  { value: '50+', label: 'Team Members' },
  { value: '99%', label: 'Satisfaction Rate' },
];
export function Stats() {
  return (
    <section className="py-16 bg-primary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <span className="block text-4xl font-bold text-primary-foreground mb-1">{s.value}</span>
              <span className="text-primary-foreground/70 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Stats;`;
}

// ── Booking (universal appointment form) ──────────────────────────────────────
function genBooking(ctx: GeneratorContext): string { return genReservation(ctx); }

// ── SECTION_GENERATORS registry ──────────────────────────────────────────────
const SECTION_GENERATORS: Record<string, (ctx: GeneratorContext) => string> = {
  // Universal
  hero: genHero, navbar: genNavbar, header: genHeader, features: genFeatures,
  services: genServices, about: genAbout, testimonials: genTestimonials,
  contact: genContact, footer: genFooter, pricing: genPricing,
  gallery: genGallery, cta: genCTA, faq: genFAQ, team: genTeam, stats: genStats,
  // Restaurant
  menu: genMenu, reservation: genReservation, specials: genSpecials,
  // Salon / Beauty
  treatments: genTreatments, beforeafter: genBeforeAfter, stylists: genStylists,
  // Fitness
  classes: genClasses, trainers: genTrainers, membership: genMembership, schedule: genSchedule, programs: genPrograms,
  // Medical
  doctors: genDoctors, departments: genDepartments, appointment: genAppointment, insurance: genInsurance,
  // SaaS
  demo: genDemo, integrations: genIntegrations, dashboard: genDashboard,
  // E-commerce
  products: genProducts, categories: genCategories,
  // Portfolio
  portfolioprojects: genPortfolioProjects, skills: genSkills,
  // Contractor / Local Service
  estimate: genEstimate, servicearea: genServiceArea, licenses: genLicenses,
  // Agency
  casestudies: genCaseStudies, process: genProcess, clients: genClients,
  // Coaching
  methodology: genMethodology, results: genResults, discoverycall: genDiscoveryCall,
  coachingprograms: genCoachingPrograms,
  // Aliases that map directly
  booking: genBooking,
};

/** Normalize component name to a section generator key. */
function matchSectionGenerator(componentName: string): string | null {
  const lower = componentName.toLowerCase().replace(/section$|component$|block$|widget$/i, '');
  if (SECTION_GENERATORS[lower]) return lower;
  const aliases: Record<string, string> = {
    // Universal
    navigation: 'navbar', nav: 'navbar', topbar: 'navbar', menubar: 'navbar',
    herosection: 'hero', herobanner: 'hero', banner: 'hero', jumbotron: 'hero',
    featurelist: 'features', featuregrid: 'features', benefits: 'features', whyus: 'features', whychooseus: 'features', highlights: 'features',
    servicelist: 'services', servicegrid: 'services', offerings: 'services', whatwedo: 'services',
    aboutus: 'about', aboutsection: 'about', story: 'about', ourstory: 'about',
    testimonial: 'testimonials', reviews: 'testimonials', clientreviews: 'testimonials', socialproof: 'testimonials', customerreviews: 'testimonials',
    contactform: 'contact', contactus: 'contact', getintouch: 'contact', reachout: 'contact',
    footersection: 'footer', sitefooter: 'footer',
    pricingplan: 'pricing', pricingtable: 'pricing', plans: 'pricing', pricingcards: 'pricing',
    portfolio: 'gallery', showcase: 'gallery', work: 'gallery', ourwork: 'gallery',
    calltoaction: 'cta', ctasection: 'cta', ctablock: 'cta', ctabanner: 'cta',
    faqsection: 'faq', questions: 'faq', frequentlyasked: 'faq',
    teamgrid: 'team', ourteam: 'team', staff: 'team', people: 'team', meettheteam: 'team',
    statistics: 'stats', metrics: 'stats', numbers: 'stats', counters: 'stats', achievements: 'stats',

    // Restaurant
    menusection: 'menu', menulist: 'menu', foodmenu: 'menu', diningmenu: 'menu', menucard: 'menu', menugrid: 'menu',
    reservations: 'reservation', reservationform: 'reservation', booktable: 'reservation', tablereservation: 'reservation',
    dailyspecials: 'specials', todaysspecials: 'specials', specialoffers: 'specials', featuredmenu: 'specials', chefsspecial: 'specials',

    // Salon / Beauty
    treatmentlist: 'treatments', treatmentmenu: 'treatments', salonservices: 'treatments', beautyservices: 'treatments', spaservices: 'treatments', servicemenu: 'treatments',
    transformations: 'beforeafter', beforeandafter: 'beforeafter', results: 'results',
    ourstylists: 'stylists', hairstylists: 'stylists', beauticians: 'stylists', therapists: 'stylists',

    // Fitness
    classschedule: 'classes', classgrid: 'classes', groupclasses: 'classes', fitnessclasstable: 'classes', workouts: 'classes',
    ourtrainers: 'trainers', coaches: 'trainers', instructors: 'trainers', fitnessteam: 'trainers',
    membershipplans: 'membership', gympricing: 'membership', fitnesspricing: 'membership', joinplans: 'membership',
    timetable: 'schedule', weeklyschedule: 'schedule',
    fitnessprograms: 'programs', trainingprograms: 'programs',

    // Medical
    ourdoctors: 'doctors', physicians: 'doctors', medicalteam: 'doctors', providers: 'doctors', specialists: 'doctors',
    specialties: 'departments', medicaldepartments: 'departments', clinics: 'departments',
    bookappointment: 'appointment', schedulevisit: 'appointment', appointmentform: 'appointment',
    insuranceproviders: 'insurance', acceptedinsurance: 'insurance', insurancelist: 'insurance',

    // SaaS
    requestdemo: 'demo', bookdemo: 'demo', livedemo: 'demo', productdemo: 'demo', tryforfree: 'demo',
    integrationgrid: 'integrations', connectors: 'integrations', partners: 'integrations', ecosystem: 'integrations',
    productscreen: 'dashboard', apppreview: 'dashboard', screenshot: 'dashboard', platformpreview: 'dashboard',

    // E-commerce
    featuredproducts: 'products', productgrid: 'products', productcards: 'products', shopcollection: 'products', collection: 'products',
    shopcategories: 'categories', productcategories: 'categories', browsecategories: 'categories',

    // Portfolio
    selectedwork: 'portfolioprojects', projectgrid: 'portfolioprojects', creativework: 'portfolioprojects', projectshowcase: 'portfolioprojects',
    projects: 'portfolioprojects', mywork: 'portfolioprojects',
    skillset: 'skills', expertise: 'skills', capabilities: 'skills', techstack: 'skills',

    // Contractor / Local Service
    freeestimate: 'estimate', requestquote: 'estimate', getquote: 'estimate', quoterequest: 'estimate', estimateform: 'estimate',
    serviceareas: 'servicearea', coveragearea: 'servicearea', locationscovered: 'servicearea', areas: 'servicearea',
    credentials: 'licenses', certifications: 'licenses', trustbadges: 'licenses', accreditations: 'licenses',

    // Agency
    casestudy: 'casestudies', portfoliocases: 'casestudies', clientwork: 'casestudies', successstories: 'casestudies',
    ourprocess: 'process', howwework: 'process', workflow: 'process', approach: 'process', steps: 'process',
    ourclients: 'clients', trustedby: 'clients', clientlogos: 'clients', brandlogos: 'clients', partnerslogos: 'clients',

    // Coaching / Consulting
    framework: 'methodology', ourapproach: 'methodology', pillars: 'methodology', system: 'methodology',
    clientresults: 'results', outcomes: 'results', impact: 'results', successmetrics: 'results',
    bookacall: 'discoverycall', freeconsult: 'discoverycall', strategycall: 'discoverycall', consultation: 'discoverycall', calendly: 'discoverycall',
    coachingplans: 'coachingprograms', programplans: 'coachingprograms', packages: 'coachingprograms',

    // Booking (universal)
    bookingform: 'booking', bookingwidget: 'booking', schedulebooking: 'booking',
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
        // Generators now produce both `export function X` and `export default X`.
        // If the import uses a DIFFERENT name than the generator's function name,
        // add an alias export so `import { CustomName }` resolves.
        if (namedMatch) {
          const names = namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
          for (const name of names) {
            if (/^[A-Z]/.test(name) && !generated.includes(`export function ${name}`) && !generated.includes(`export const ${name}`)) {
              // Find the generator's primary function name
              const fnMatch = generated.match(/export function (\w+)/);
              if (fnMatch) {
                generated += `\nexport const ${name} = ${fnMatch[1]};\n`;
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
              // Non-component named exports get a safe no-op value instead of undefined
              code += `export const ${name} = () => null;\n`;
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

  // FIX: Repair broken template-literal image URLs generated by AI
  // e.g. src={`https://images.unsplash.com/photo-15${7003211169-...}`} → plain string URLs
  // These contain invalid JS expressions inside ${} that crash Babel
  processed = processed.replace(
    /\{`(https?:\/\/[^`]*?\$\{[^}]*\}[^`]*?)`\}/g,
    (_match, inner: string) => {
      // If it contains ${...} with non-identifier content (numbers, commas, question marks), it's broken
      const hasInvalidExpr = /\$\{[^}]*[,?|&]/.test(inner);
      if (hasInvalidExpr) {
        // Try to extract a clean URL from the mess
        const urlMatch = inner.match(/(https?:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+)\??/);
        if (urlMatch) {
          return `"${urlMatch[1]}?w=800&q=80"`;
        }
        // Fallback: strip template literal syntax entirely
        const cleaned = inner.replace(/\$\{[^}]*\}/g, '').replace(/[`{}]/g, '');
        const firstUrl = cleaned.match(/(https?:\/\/[^\s"',]+)/);
        return `"${firstUrl ? firstUrl[1] : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'}"`;
      }
      return _match;
    }
  );

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
      // Shim @/lib/utils → real cn() function
      if (modulePath === 'lib/utils') {
        const utilsShimImport = toRelativeSandpackImport(filePath, '/lib-utils-shim');
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${utilsShimImport}';`;
        if (defaultMatch) return `import ${defaultMatch[1]} from '${utilsShimImport}';`;
        return `import { cn } from '${utilsShimImport}';`;
      }

      // Shim @/components/ui/* → real React component stubs
      if (modulePath.startsWith('components/ui/') || modulePath.startsWith('components/ui')) {
        const uiShimImport = toRelativeSandpackImport(filePath, '/ui-shim');
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${uiShimImport}';`;
        if (defaultMatch) return `import ${defaultMatch[1]} from '${uiShimImport}';`;
        return match.replace(/@\/[^'"]+/, uiShimImport.replace(/^\.\//, './'));
      }

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
        // Redirect relative components/ui/* imports to the UI shim
        if (/components\/ui(\/|$)/.test(modulePath)) {
          const uiShimImport = toRelativeSandpackImport(filePath, '/ui-shim');
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '${uiShimImport}';`;
            if (defaultImport) return `import ${defaultImport} from '${uiShimImport}';`;
          }
          return match;
        }
        // Redirect relative lib/utils imports to the utils shim
        if (/lib\/utils/.test(modulePath)) {
          const utilsShimImport = toRelativeSandpackImport(filePath, '/lib-utils-shim');
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '${utilsShimImport}';`;
            if (defaultImport) return `import ${defaultImport} from '${utilsShimImport}';`;
          }
          return match;
        }
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
  // ═══════════════════════════════════════════════════════════════════════════
  // GUARD: Unwrap JSON-wrapped file maps that leaked through as raw content.
  // If ANY file's content is a JSON object with a "files" key, extract the
  // actual files and merge them into the VFS instead of treating the JSON
  // string as source code.
  // ═══════════════════════════════════════════════════════════════════════════
  let resolvedFiles = files;
  const fileKeys = Object.keys(files);

  // Case 1: The entire VFS has a single file whose content is a JSON files wrapper
  // e.g. { "/App.tsx": '{"files":{"src/App.tsx":"import React..."}}' }
  if (fileKeys.length <= 3) {
    for (const [fPath, fContent] of Object.entries(files)) {
      if (typeof fContent === 'string' && fContent.trimStart().startsWith('{')) {
        try {
          const parsed = JSON.parse(fContent);
          if (parsed && typeof parsed === 'object' && parsed.files && typeof parsed.files === 'object') {
            console.warn(`[sandpackFilePrep] Unwrapping JSON files wrapper found in ${fPath}`);
            resolvedFiles = {};
            for (const [innerPath, innerContent] of Object.entries(parsed.files)) {
              if (typeof innerContent === 'string') {
                const normalizedInner = innerPath.startsWith('/') ? innerPath : `/${innerPath}`;
                resolvedFiles[normalizedInner] = innerContent;
              }
            }
            break; // Only one wrapper expected
          }
        } catch {
          // Not JSON — continue normally
        }
      }
    }
  }

  // Case 2: Individual file content is a JSON wrapper (defensive per-file check)
  const finalFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(resolvedFiles)) {
    if (typeof content === 'string' && content.trimStart().startsWith('{"files"')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed?.files && typeof parsed.files === 'object') {
          console.warn(`[sandpackFilePrep] Per-file JSON unwrap for ${path}`);
          for (const [innerPath, innerContent] of Object.entries(parsed.files)) {
            if (typeof innerContent === 'string') {
              finalFiles[innerPath.startsWith('/') ? innerPath : `/${innerPath}`] = innerContent;
            }
          }
          continue;
        }
      } catch {
        // Not JSON
      }
    }
    finalFiles[path] = content;
  }

  const sandpackFiles: Record<string, string> = {};
  let hasApp = false;
  let hasIndex = false;
  let hasCSS = false;
  const componentFilePaths: string[] = [];

  console.log('[sandpackFilePrep] Input VFS files:', Object.keys(finalFiles));

  for (const [path, content] of Object.entries(finalFiles)) {
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

  if (!hasIndex) sandpackFiles['/index.tsx'] = DEFAULT_INDEX;

  // Remove any stale /main.tsx that might have leaked through
  delete sandpackFiles['/main.tsx'];
  delete sandpackFiles['/main.jsx'];

  sandpackFiles['/hooks-shim.ts'] = HOOKS_SHIM;
  sandpackFiles['/lib-utils-shim.ts'] = LIB_UTILS_SHIM;
  sandpackFiles['/ui-shim.tsx'] = UI_COMPONENTS_SHIM;

  // ── Generate real components for missing relative imports ──
  // Run BEFORE App.tsx export validation so generated sub-components exist first.
  // Run up to 3 passes to resolve transitive imports (generated components may import others).
  for (let pass = 0; pass < 3; pass++) {
    const beforeCount = Object.keys(sandpackFiles).length;
    generateMissingComponents(sandpackFiles);
    if (Object.keys(sandpackFiles).length === beforeCount) break;
    console.log(`[sandpackFilePrep] Component generation pass ${pass + 1}: ${Object.keys(sandpackFiles).length - beforeCount} new files`);
  }

  // ── SAFETY: Validate App.tsx has a default export ──
  // If AI-generated App.tsx only uses named exports (e.g., `export function App`),
  // `import App from './App'` in index.tsx resolves to undefined → crash.
  // Must run AFTER generateMissingComponents so all files are present.
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

  // ── SAFETY: Validate ALL generated .tsx/.jsx files have a default export ──
  // Prevents "Element type is invalid" when any component is default-imported.
  for (const [filePath, content] of Object.entries(sandpackFiles)) {
    if (!/\.(tsx|jsx)$/.test(filePath)) continue;
    if (filePath === '/index.tsx' || filePath === '/hooks-shim.ts') continue;
    if (content.includes('export default')) continue;

    const namedMatch = content.match(/export\s+(?:function|const|class)\s+([A-Z]\w*)/);
    if (namedMatch) {
      sandpackFiles[filePath] = content + `\nexport default ${namedMatch[1]};\n`;
    }
  }

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

// ═══════════════════════════════════════════════════════════════════════════════
// SiteBundle → VFS Compiler
// ═══════════════════════════════════════════════════════════════════════════════
// This is the CANONICAL path for SiteBundle → preview. All preview rendering
// flows through prepareSandpackFiles(). This function converts a SiteBundle
// into a standard /src/ VFS that prepareSandpackFiles() can then compile into
// a Sandpack-ready overlay.
//
// Architecture:
//   SiteBundle → compileSiteBundleToVFS() → /src/ VFS → prepareSandpackFiles() → Sandpack
//
// There is NO alternative preview path. The old SandpackRuntimeWrapper has been removed.
// ═══════════════════════════════════════════════════════════════════════════════

interface SiteBundlePage {
  path: string;
  title?: string;
  output?: { html?: string; react?: string };
  sections?: Array<{ type: string; html?: string }>;
}

interface SiteBundleCompileConfig {
  siteBundle: {
    pages?: Record<string, SiteBundlePage> | SiteBundlePage[];
    theme?: Record<string, any>;
    metadata?: { name?: string; industry?: string };
  };
  entryPath?: string;
  debug?: boolean;
}

/**
 * Compile a SiteBundle into a source VFS (/src/ structure).
 * The result can be passed directly to prepareSandpackFiles() for Sandpack rendering,
 * or stored in the VFS context for editor use.
 *
 * This replaces the old SandpackRuntimeWrapper.generateSandpackFiles().
 */
export function compileSiteBundleToVFS(config: SiteBundleCompileConfig): Record<string, string> {
  const { siteBundle, entryPath = '/', debug = false } = config;
  const pages: SiteBundlePage[] = siteBundle.pages
    ? Array.isArray(siteBundle.pages) ? siteBundle.pages : Object.values(siteBundle.pages)
    : [];

  const vfs: Record<string, string> = {};

  // 1. Generate page components
  for (const page of pages) {
    const compName = sanitizeSiteBundleComponentName(page.path);
    const fileName = sanitizeSiteBundleFilename(page.path);

    let pageCode: string;
    if (page.output?.react) {
      pageCode = page.output.react;
    } else {
      const html = page.output?.html || '<div>Page content not generated</div>';
      const jsx = html
        .replace(/ class="/g, ' className="')
        .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
        .replace(/<br>/gi, '<br />')
        .replace(/<hr>/gi, '<hr />')
        .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />');

      pageCode = [
        "import React from 'react';",
        '',
        'export default function ' + compName + '() {',
        '  return (',
        '    <div className="page-container min-h-screen">',
        '      ' + jsx,
        '    </div>',
        '  );',
        '}',
      ].join('\n');
    }

    vfs['/src/pages/' + fileName + '.tsx'] = pageCode;
  }

  // 2. Generate App.tsx with routing
  const importLines = pages.map(p => {
    const name = sanitizeSiteBundleComponentName(p.path);
    const file = sanitizeSiteBundleFilename(p.path);
    return 'import ' + name + " from './pages/" + file + "';";
  });

  const routeLines = pages.map(p => {
    const name = sanitizeSiteBundleComponentName(p.path);
    return '        <Route path="' + p.path + '" element={<' + name + ' />} />';
  });

  vfs['/src/App.tsx'] = [
    "import React from 'react';",
    "import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';",
    ...importLines,
    '',
    'export default function App() {',
    '  return (',
    '    <HashRouter>',
    '      <Routes>',
    ...routeLines,
    '        <Route path="*" element={<Navigate to="' + entryPath + '" replace />} />',
    '      </Routes>',
    '    </HashRouter>',
    '  );',
    '}',
  ].join('\n');

  // 3. Generate main.tsx entry
  vfs['/src/main.tsx'] = [
    "import React from 'react';",
    "import ReactDOM from 'react-dom/client';",
    "import App from './App';",
    "import './index.css';",
    '',
    "ReactDOM.createRoot(document.getElementById('root')!).render(",
    '  <React.StrictMode>',
    '    <App />',
    '  </React.StrictMode>',
    ');',
  ].join('\n');

  // 4. Generate index.css with theme tokens
  let css = BASE_CSS;
  if (siteBundle.theme) {
    const themeVars = Object.entries(siteBundle.theme)
      .map(([k, v]) => '  --' + k + ': ' + v + ';')
      .join('\n');
    css = css.replace(':root {', ':root {\n' + themeVars);
  }
  vfs['/src/index.css'] = css;

  if (debug) {
    console.log('[compileSiteBundleToVFS] Generated VFS:', Object.keys(vfs));
  }

  return vfs;
}

function sanitizeSiteBundleFilename(path: string): string {
  if (path === '/' || path === '') return 'Home';
  return path.replace(/^\//, '').replace(/\//g, '-').replace(/[^\w-]/g, '').replace(/^-+|-+$/g, '') || 'Page';
}

function sanitizeSiteBundleComponentName(path: string): string {
  const filename = sanitizeSiteBundleFilename(path);
  return filename.charAt(0).toUpperCase() + filename.slice(1) + 'Page';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Canonical Launcher → Preview Compiler
// ═══════════════════════════════════════════════════════════════════════════════
// This is the SINGLE function that all launchers should call to produce a
// Sandpack-ready preview bundle. It combines normalization + compilation in
// one step, driven by a RuntimeManifest.
//
// Nothing else is allowed to feed Sandpack directly.
// ═══════════════════════════════════════════════════════════════════════════════

import type { RuntimeManifest, LauncherHandoff } from '@/types/runtimeManifest';

/**
 * The ONE canonical function that converts launcher output into a Sandpack-ready
 * preview bundle. All preview paths must flow through here.
 *
 * Usage:
 *   const { previewFiles, manifest } = compileLauncherOutputForPreview(handoff);
 *   // Feed previewFiles to Sandpack
 *   // Use manifest for engine selection, route awareness, etc.
 */
export function compileLauncherOutputForPreview(
  handoff: Pick<LauncherHandoff, 'sourceFiles' | 'runtimeManifest' | 'siteBundle'>
): { previewFiles: Record<string, string>; manifest: RuntimeManifest } {
  const { sourceFiles, runtimeManifest, siteBundle } = handoff;

  // Step 1: If we have a SiteBundle, compile it to source VFS and merge
  let mergedSource = { ...sourceFiles };
  if (siteBundle) {
    const siteBundleVFS = compileSiteBundleToVFS({
      siteBundle,
      entryPath: runtimeManifest.routes[0] || '/',
    });
    // SiteBundle VFS fills gaps — source files take priority
    for (const [path, content] of Object.entries(siteBundleVFS)) {
      if (!mergedSource[path]) {
        mergedSource[path] = content;
      }
    }
  }

  // Step 2: Normalize launcher files (fix paths, add entry files, repair images)
  const normalized = normalizeLauncherFiles(mergedSource, {
    entryPoint: runtimeManifest.entryPoint,
  });

  // Step 3: Compile to Sandpack overlay (flatten /src/, inject shims, etc.)
  const previewFiles = prepareSandpackFiles(normalized, {
    strict: true,
    entryPoint: runtimeManifest.entryPoint,
  });

  console.log('[compileLauncherOutputForPreview] Compiled preview:', {
    sourceFileCount: Object.keys(sourceFiles).length,
    previewFileCount: Object.keys(previewFiles).length,
    engine: runtimeManifest.previewEngine,
    routes: runtimeManifest.routes,
    backendRequired: runtimeManifest.backendRequired,
  });

  return { previewFiles, manifest: runtimeManifest };
}
