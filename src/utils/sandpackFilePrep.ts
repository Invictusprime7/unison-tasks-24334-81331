/**
 * Sandpack File Preparation Utilities
 * 
 * Sandpack's react-ts template expects files at ROOT level (e.g., /App.tsx, not /src/App.tsx).
 * This module flattens VFS paths, processes imports, and ensures essential files exist.
 */

import { ensureReactImports, sanitizeSvgElements, fixJsxVoidElements, fixJsxStyleStrings } from '@/utils/aiCodeCleaner';
import { SANDPACK_DEPENDENCIES, ALLOWED_NPM_IMPORTS, PREMIUM_CSS_UTILITIES } from '@/utils/generationContract';

const ALLOWED_IMPORTS = ALLOWED_NPM_IMPORTS;

// cn() utility — standard shadcn/ui pattern used by AI-generated components
const LIB_UTILS = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const BASE_CSS = `
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

const EDIT_MODE_SELECTION_BRIDGE = `function __initLovableEditModeBridge() {
  const bridgeWindow = window as Window & { __lovableEditModeBridgeInstalled?: boolean; __lovableEditModeEnabled?: boolean };
  if (bridgeWindow.__lovableEditModeBridgeInstalled) return;
  bridgeWindow.__lovableEditModeBridgeInstalled = true;

  let hoveredEl: HTMLElement | null = null;
  let selectedEl: HTMLElement | null = null;

  const getSelector = (el: HTMLElement): string => {
    if (el.id) return '#' + el.id;
    const path: string[] = [];
    let cur: HTMLElement | null = el;
    while (cur && cur !== document.body) {
      let sel = cur.tagName.toLowerCase();
      let cls = typeof cur.className === 'string' ? cur.className : (cur.className as any)?.baseVal || '';
      if (cls) { const first = cls.split(' ').filter(Boolean)[0]; if (first) sel += '.' + first; }
      const parent = cur.parentElement;
      if (parent) { const sibs = Array.from(parent.children); if (sibs.length > 1) sel += ':nth-child(' + (sibs.indexOf(cur) + 1) + ')'; }
      path.unshift(sel);
      cur = cur.parentElement;
    }
    return path.join(' > ');
  };

  const getElementData = (el: HTMLElement) => {
    const cs = window.getComputedStyle(el);
    const attrs: Record<string,string> = {};
    for (let i = 0; i < el.attributes.length; i++) { const a = el.attributes[i]; attrs[a.name] = a.value; }
    const sec = el.closest('section');
    const sectionLabel = sec ? (sec.getAttribute('data-ut-section') || sec.getAttribute('aria-label') || sec.id || sec.querySelector('h1,h2,h3')?.textContent?.trim()?.slice(0,80)) : undefined;
    return {
      tagName: el.tagName,
      textContent: (el.textContent || '').slice(0, 500),
      styles: {
        color: cs.color, backgroundColor: cs.backgroundColor, fontSize: cs.fontSize,
        fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
        textAlign: cs.textAlign, padding: cs.padding, margin: cs.margin,
        border: cs.border, borderRadius: cs.borderRadius, width: cs.width, height: cs.height,
        display: cs.display, opacity: cs.opacity, textDecoration: cs.textDecoration,
      },
      attributes: attrs,
      selector: getSelector(el),
      xpath: '',
      html: el.outerHTML.slice(0, 2000),
      section: sectionLabel || undefined,
    };
  };

  const setHighlight = (el: HTMLElement, color: string) => { el.style.outline = '2px solid ' + color; el.style.outlineOffset = '2px'; };
  const clearHighlight = (el: HTMLElement) => { el.style.outline = ''; el.style.outlineOffset = ''; };

  document.addEventListener('mouseover', (e) => {
    if (!bridgeWindow.__lovableEditModeEnabled) return;
    const t = e.target as HTMLElement;
    if (!t || t === document.body || t === document.documentElement) return;
    if (t === selectedEl) return;
    if (hoveredEl && hoveredEl !== selectedEl) clearHighlight(hoveredEl);
    setHighlight(t, '#3b82f6');
    hoveredEl = t;
  });

  document.addEventListener('mouseout', (e) => {
    if (!bridgeWindow.__lovableEditModeEnabled) return;
    const t = e.target as HTMLElement;
    if (t && t === hoveredEl && t !== selectedEl) { clearHighlight(t); hoveredEl = null; }
  });

  document.addEventListener('click', (e) => {
    if (!bridgeWindow.__lovableEditModeEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.target as HTMLElement;
    if (!t || t === document.body || t === document.documentElement) return;
    if (selectedEl && selectedEl !== t) clearHighlight(selectedEl);
    if (hoveredEl && hoveredEl !== t) { clearHighlight(hoveredEl); hoveredEl = null; }
    selectedEl = t;
    setHighlight(t, '#10b981');
    window.parent.postMessage({ type: 'ELEMENT_SELECTED', elementData: getElementData(t) }, '*');
  }, true);

  // Listen for enable/disable from parent
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'EDIT_MODE_TOGGLE') {
      bridgeWindow.__lovableEditModeEnabled = !!e.data.enabled;
      document.body.style.cursor = e.data.enabled ? 'pointer' : '';
      if (!e.data.enabled) {
        if (hoveredEl) { clearHighlight(hoveredEl); hoveredEl = null; }
        if (selectedEl) { clearHighlight(selectedEl); selectedEl = null; }
      }
    }
  });
}
`;

const PREVIEW_NAV_BRIDGE = `function __initLovablePreviewNavBridge() {
  const bridgeWindow = window as Window & { __lovablePreviewNavBridgeInstalled?: boolean };
  if (bridgeWindow.__lovablePreviewNavBridgeInstalled) return;
  bridgeWindow.__lovablePreviewNavBridgeInstalled = true;

  const normalizePath = (rawPath: string) => rawPath.replace(/^\//, '').replace(/\.html(?:[?#].*)?$/, '').replace(/[?#].*$/, '') || 'index';

  document.addEventListener('click', function (event) {
    const bridgeWin = window as Window & { __lovableEditModeEnabled?: boolean };
    if (bridgeWin.__lovableEditModeEnabled) return; // Edit mode handles clicks

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

const INTENT_BRIDGE_IIFE = `function __initLovableIntentBridge() {
  const bw = window as Window & { __lovableIntentBridgeInstalled?: boolean };
  if (bw.__lovableIntentBridgeInstalled) return;
  bw.__lovableIntentBridgeInstalled = true;

  function findClickable(el: HTMLElement): HTMLElement | null {
    return el.closest('a, button, [role="button"], [data-ut-intent], [data-intent]') as HTMLElement | null;
  }

  function resolveIntent(el: HTMLElement): { intent: string; payload: Record<string, any> } | null {
    const explicit = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
    if (explicit && explicit !== 'none' && explicit !== 'ignore') return { intent: explicit, payload: {} };

    const href = el.getAttribute('href');
    if (href) {
      if (href.startsWith('#')) return { intent: 'nav.anchor', payload: { anchor: href.slice(1) } };
      if (href.startsWith('http')) return { intent: 'nav.external', payload: { url: href } };
      if (href.startsWith('mailto:')) return { intent: 'comm.email', payload: { email: href.replace('mailto:', '').split('?')[0] } };
      if (href.startsWith('tel:')) return { intent: 'comm.call', payload: { phone: href.replace('tel:', '') } };
    }

    const text = (el.textContent || '').trim().toLowerCase();
    const patterns: [RegExp, string][] = [
      [/book|reserve|appointment|schedule/i, 'booking.create'],
      [/contact|get in touch|reach out|send message/i, 'contact.submit'],
      [/subscribe|newsletter|stay updated/i, 'newsletter.subscribe'],
      [/quote|estimate|free quote/i, 'quote.request'],
      [/sign ?in|log ?in/i, 'auth.signin'],
      [/sign ?up|register|create account|get started/i, 'auth.signup'],
      [/buy|add to cart|purchase|shop|order/i, 'pay.checkout'],
      [/donate|give|support/i, 'pay.checkout'],
      [/learn more|read more|view|explore|discover/i, 'nav.anchor'],
    ];
    for (const [re, intent] of patterns) {
      if (re.test(text)) return { intent, payload: { buttonLabel: text } };
    }

    if (el.closest('nav, header') && text) {
      return { intent: 'nav.goto', payload: { path: '/' + text.replace(/\\s+/g, '-').replace(/[^\\w-]/g, '') } };
    }
    return null;
  }

  document.addEventListener('click', function(e: MouseEvent) {
    const bWin = window as Window & { __lovableEditModeEnabled?: boolean };
    if (bWin.__lovableEditModeEnabled) return;
    const target = e.target as HTMLElement;
    const clickable = findClickable(target);
    if (!clickable) return;
    if (clickable.getAttribute('data-ut-intent') === 'none' || clickable.hasAttribute('data-no-intent') || clickable.hasAttribute('disabled')) return;

    const resolved = resolveIntent(clickable);
    if (!resolved) return;

    e.preventDefault();
    e.stopPropagation();

    // Anchor nav handled locally
    if (resolved.intent === 'nav.anchor' && resolved.payload.anchor) {
      const section = document.querySelector('#' + resolved.payload.anchor + ', [data-section="' + resolved.payload.anchor + '"]');
      if (section) { (section as HTMLElement).scrollIntoView({ behavior: 'smooth' }); return; }
    }

    // Collect data attributes as payload
    const payload: Record<string, any> = { ...resolved.payload };
    for (let i = 0; i < clickable.attributes.length; i++) {
      const attr = clickable.attributes[i];
      if (attr.name.startsWith('data-') && attr.name !== 'data-ut-intent' && attr.name !== 'data-intent') {
        payload[attr.name.slice(5).replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())] = attr.value;
      }
    }

    clickable.classList.add('intent-loading');
    window.parent.postMessage({ type: 'INTENT_TRIGGER', intent: resolved.intent, payload, timestamp: Date.now() }, '*');
    setTimeout(() => {
      clickable.classList.remove('intent-loading');
      clickable.classList.add('intent-success');
      setTimeout(() => clickable.classList.remove('intent-success'), 2000);
    }, 300);
  }, true);

  document.addEventListener('submit', function(e: Event) {
    const form = e.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    let intent = form.getAttribute('data-ut-intent') || form.getAttribute('data-intent');
    if (!intent) {
      const btn = form.querySelector('button[type="submit"], button:not([type])') as HTMLElement | null;
      if (btn) { const r = resolveIntent(btn); if (r) intent = r.intent; }
    }
    if (!intent) {
      const id = (form.id || '').toLowerCase();
      if (/contact/.test(id)) intent = 'contact.submit';
      else if (/newsletter|subscribe/.test(id)) intent = 'newsletter.subscribe';
      else if (/booking|reservation/.test(id)) intent = 'booking.create';
      else if (/quote/.test(id)) intent = 'quote.request';
    }
    if (!intent) return;
    e.preventDefault();
    e.stopPropagation();
    const payload: Record<string, string> = {};
    const fd = new FormData(form);
    fd.forEach((v, k) => { if (typeof v === 'string') payload[k] = v; });
    window.parent.postMessage({ type: 'INTENT_TRIGGER', intent, payload }, '*');
    form.reset();
  }, true);
}
`;

const INTENT_BRIDGE_STYLES = `
const __intentStyles = document.createElement('style');
__intentStyles.textContent = '.intent-loading{opacity:0.6;pointer-events:none;cursor:wait}.intent-success{animation:intent-pulse .3s ease-out}@keyframes intent-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}';
document.head.appendChild(__intentStyles);
`;

const DEFAULT_MAIN = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

${PREVIEW_NAV_BRIDGE}
__initLovablePreviewNavBridge();

${EDIT_MODE_SELECTION_BRIDGE}
__initLovableEditModeBridge();

${INTENT_BRIDGE_IIFE}
__initLovableIntentBridge();

${INTENT_BRIDGE_STYLES}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

const DEFAULT_APP = `import React from 'react';

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p className="text-muted-foreground">Start coding to see preview</p>
    </div>
  );
}
`;

const HOOKS_SHIM = `// @ts-nocheck
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
    const pageName = path.replace(/^\\//, '').replace(/\\.html$/, '') || 'index';
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
 * UI Component Shim — stub implementations of shadcn/ui primitives.
 * AI-generated code almost always imports from @/components/ui/*.
 * These stubs render basic HTML so the preview doesn't crash on missing modules.
 */
const UI_SHIM = `// @ts-nocheck
import React from 'react';

const cn = (...c) => c.filter(Boolean).join(' ');

/* ---- helpers ---- */
const Div = (name, base = '') => {
  const C = React.forwardRef(({ className, ...p }, ref) => (
    React.createElement('div', { ref, className: cn(base, className), ...p })
  ));
  C.displayName = name;
  return C;
};

/* ---- Card ---- */
export const Card = Div('Card', 'rounded-lg border bg-card text-card-foreground shadow-sm');
export const CardHeader = Div('CardHeader', 'flex flex-col space-y-1.5 p-6');
export const CardTitle = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('h3', { ref, className: cn('text-2xl font-semibold leading-none tracking-tight', className), ...p })); C.displayName = 'CardTitle'; return C; })();
export const CardDescription = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('p', { ref, className: cn('text-sm text-muted-foreground', className), ...p })); C.displayName = 'CardDescription'; return C; })();
export const CardContent = Div('CardContent', 'p-6 pt-0');
export const CardFooter = Div('CardFooter', 'flex items-center p-6 pt-0');

/* ---- Button ---- */
export const Button = (() => {
  const C = React.forwardRef(({ className, variant, size, asChild, type = 'button', ...p }, ref) => React.createElement('button', { ref, type, className: cn(
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
    variant === 'outline' ? 'border border-input bg-background hover:bg-accent' :
    variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' :
    variant === 'link' ? 'text-primary underline-offset-4 hover:underline' :
    variant === 'destructive' ? 'bg-destructive text-destructive-foreground' :
    variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
    'bg-primary text-primary-foreground hover:bg-primary/90',
    size === 'sm' ? 'h-9 px-3' : size === 'lg' ? 'h-11 px-8' : size === 'icon' ? 'h-10 w-10' : 'h-10 px-4 py-2',
    className
  ), ...p }));
  C.displayName = 'Button';
  return C;
})();
export const buttonVariants = (opts) => '';

/* ---- Form ---- */
export const Input = (() => { const C = React.forwardRef(({ className, type = 'text', ...p }, ref) => React.createElement('input', { ref, type, className: cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', className), ...p })); C.displayName = 'Input'; return C; })();
export const Textarea = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('textarea', { ref, className: cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', className), ...p })); C.displayName = 'Textarea'; return C; })();
export const Label = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('label', { ref, className: cn('text-sm font-medium leading-none', className), ...p })); C.displayName = 'Label'; return C; })();
export const Form = ({ children, ...p }) => React.createElement('form', p, children);
export const FormControl = ({ children }) => React.createElement('div', null, children);
export const FormDescription = ({ className, ...p }) => React.createElement('p', { className: cn('text-sm text-muted-foreground', className), ...p });
export const FormField = ({ render, name }) => render ? render({ field: { name, value: '', onChange: () => {}, onBlur: () => {}, ref: () => {} } }) : null;
export const FormItem = Div('FormItem', 'space-y-2');
export const FormLabel = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('label', { ref, className: cn('text-sm font-medium leading-none', className), ...p })); C.displayName = 'FormLabel'; return C; })();
export const FormMessage = ({ className, children, ...p }) => children ? React.createElement('p', { className: cn('text-sm font-medium text-destructive', className), ...p }, children) : null;

/* ---- Select ---- */
export const Select = ({ children, onValueChange, defaultValue, value }) => React.createElement('div', { 'data-select': true }, children);
export const SelectTrigger = (() => { const C = React.forwardRef(({ className, children, ...p }, ref) => React.createElement('button', { ref, className: cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm', className), ...p }, children)); C.displayName = 'SelectTrigger'; return C; })();
export const SelectValue = ({ placeholder }) => React.createElement('span', null, placeholder || '');
export const SelectContent = ({ children }) => React.createElement('div', null, children);
export const SelectItem = (() => { const C = React.forwardRef(({ className, children, value, ...p }, ref) => React.createElement('div', { ref, className: cn('relative flex w-full cursor-default items-center rounded-sm py-1.5 pl-8 pr-2 text-sm', className), ...p }, children)); C.displayName = 'SelectItem'; return C; })();
export const SelectGroup = ({ children }) => React.createElement('div', null, children);
export const SelectLabel = ({ children }) => React.createElement('div', { className: 'text-sm font-semibold' }, children);
export const SelectSeparator = () => React.createElement('div', { className: 'h-px bg-muted' });

/* ---- Badge ---- */
export const Badge = ({ className, variant, ...p }) => React.createElement('div', { className: cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  variant === 'secondary' ? 'border-transparent bg-secondary text-secondary-foreground' :
  variant === 'destructive' ? 'border-transparent bg-destructive text-destructive-foreground' :
  variant === 'outline' ? 'text-foreground' :
  'border-transparent bg-primary text-primary-foreground', className), ...p });

/* ---- Avatar ---- */
export const Avatar = Div('Avatar', 'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full');
export const AvatarImage = (() => { const C = React.forwardRef(({ className, src, alt, ...p }, ref) => React.createElement('img', { ref, src, alt, className: cn('aspect-square h-full w-full', className), ...p })); C.displayName = 'AvatarImage'; return C; })();
export const AvatarFallback = Div('AvatarFallback', 'flex h-full w-full items-center justify-center rounded-full bg-muted');

/* ---- Separator ---- */
export const Separator = (() => { const C = React.forwardRef(({ className, orientation = 'horizontal', ...p }, ref) => React.createElement('div', { ref, className: cn(orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', 'shrink-0 bg-border', className), ...p })); C.displayName = 'Separator'; return C; })();

/* ---- Skeleton ---- */
export const Skeleton = ({ className, ...p }) => React.createElement('div', { className: cn('animate-pulse rounded-md bg-muted', className), ...p });

/* ---- Dialog ---- */
export const Dialog = ({ children, open, onOpenChange }) => React.createElement(React.Fragment, null, children);
export const DialogTrigger = React.forwardRef(({ children, asChild, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
DialogTrigger.displayName = 'DialogTrigger';
export const DialogContent = (() => { const C = React.forwardRef(({ className, children, ...p }, ref) => React.createElement('div', { ref, className: cn('fixed inset-0 z-50 flex items-center justify-center', className) }, React.createElement('div', { className: 'bg-background rounded-lg border shadow-lg p-6 w-full max-w-lg' }, children))); C.displayName = 'DialogContent'; return C; })();
export const DialogHeader = Div('DialogHeader', 'flex flex-col space-y-1.5 text-center sm:text-left');
export const DialogTitle = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('h2', { ref, className: cn('text-lg font-semibold leading-none tracking-tight', className), ...p })); C.displayName = 'DialogTitle'; return C; })();
export const DialogDescription = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('p', { ref, className: cn('text-sm text-muted-foreground', className), ...p })); C.displayName = 'DialogDescription'; return C; })();
export const DialogFooter = Div('DialogFooter', 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2');
export const DialogClose = React.forwardRef(({ children, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
DialogClose.displayName = 'DialogClose';

/* ---- Sheet ---- */
export const Sheet = ({ children, open, onOpenChange }) => React.createElement(React.Fragment, null, children);
export const SheetTrigger = React.forwardRef(({ children, asChild, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
SheetTrigger.displayName = 'SheetTrigger';
export const SheetContent = Div('SheetContent', 'fixed inset-y-0 right-0 z-50 w-3/4 max-w-sm bg-background p-6 shadow-lg');
export const SheetHeader = Div('SheetHeader', 'flex flex-col space-y-2');
export const SheetTitle = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('h2', { ref, className: cn('text-lg font-semibold', className), ...p })); C.displayName = 'SheetTitle'; return C; })();
export const SheetDescription = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('p', { ref, className: cn('text-sm text-muted-foreground', className), ...p })); C.displayName = 'SheetDescription'; return C; })();
export const SheetClose = React.forwardRef(({ children, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
SheetClose.displayName = 'SheetClose';

/* ---- Tabs ---- */
export const Tabs = ({ children, defaultValue, value, onValueChange, className }) => React.createElement('div', { className }, children);
export const TabsList = Div('TabsList', 'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground');
export const TabsTrigger = (() => { const C = React.forwardRef(({ className, value, children, ...p }, ref) => React.createElement('button', { ref, className: cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all', className), ...p }, children)); C.displayName = 'TabsTrigger'; return C; })();
export const TabsContent = (() => { const C = React.forwardRef(({ className, value, children, ...p }, ref) => React.createElement('div', { ref, className: cn('mt-2', className), ...p }, children)); C.displayName = 'TabsContent'; return C; })();

/* ---- Accordion ---- */
export const Accordion = ({ children, type, collapsible, className }) => React.createElement('div', { className }, children);
export const AccordionItem = (() => { const C = React.forwardRef(({ className, value, children, ...p }, ref) => React.createElement('div', { ref, className: cn('border-b', className), ...p }, children)); C.displayName = 'AccordionItem'; return C; })();
export const AccordionTrigger = (() => { const C = React.forwardRef(({ className, children, ...p }, ref) => React.createElement('button', { ref, className: cn('flex flex-1 items-center justify-between py-4 font-medium transition-all', className), ...p }, children)); C.displayName = 'AccordionTrigger'; return C; })();
export const AccordionContent = (() => { const C = React.forwardRef(({ className, children, ...p }, ref) => React.createElement('div', { ref, className: cn('pb-4 pt-0 text-sm', className), ...p }, children)); C.displayName = 'AccordionContent'; return C; })();

/* ---- Alert ---- */
export const Alert = (() => { const C = React.forwardRef(({ className, variant, ...p }, ref) => React.createElement('div', { ref, role: 'alert', className: cn('relative w-full rounded-lg border p-4', variant === 'destructive' ? 'border-destructive/50 text-destructive' : 'bg-background text-foreground', className), ...p })); C.displayName = 'Alert'; return C; })();
export const AlertTitle = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('h5', { ref, className: cn('mb-1 font-medium leading-none tracking-tight', className), ...p })); C.displayName = 'AlertTitle'; return C; })();
export const AlertDescription = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('div', { ref, className: cn('text-sm [&_p]:leading-relaxed', className), ...p })); C.displayName = 'AlertDescription'; return C; })();
export const AlertDialog = ({ children }) => React.createElement(React.Fragment, null, children);
export const AlertDialogTrigger = React.forwardRef(({ children, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
AlertDialogTrigger.displayName = 'AlertDialogTrigger';
export const AlertDialogContent = Div('AlertDialogContent', 'fixed inset-0 z-50 flex items-center justify-center');
export const AlertDialogHeader = Div('AlertDialogHeader', 'flex flex-col space-y-2');
export const AlertDialogTitle = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('h2', { ref, className: cn('text-lg font-semibold', className), ...p })); C.displayName = 'AlertDialogTitle'; return C; })();
export const AlertDialogDescription = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('p', { ref, className: cn('text-sm text-muted-foreground', className), ...p })); C.displayName = 'AlertDialogDescription'; return C; })();
export const AlertDialogFooter = Div('AlertDialogFooter', 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2');
export const AlertDialogAction = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('button', { ref, className: cn('inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium', className), ...p })); C.displayName = 'AlertDialogAction'; return C; })();
export const AlertDialogCancel = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('button', { ref, className: cn('inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium', className), ...p })); C.displayName = 'AlertDialogCancel'; return C; })();

/* ---- Tooltip ---- */
export const TooltipProvider = ({ children }) => React.createElement(React.Fragment, null, children);
export const Tooltip = ({ children }) => React.createElement(React.Fragment, null, children);
export const TooltipTrigger = React.forwardRef(({ children, asChild, ...p }, ref) => React.createElement('span', { ref, ...p }, children));
TooltipTrigger.displayName = 'TooltipTrigger';
export const TooltipContent = (() => { const C = React.forwardRef(({ className, children, ...p }, ref) => React.createElement('div', { ref, className: cn('z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md', className), ...p }, children)); C.displayName = 'TooltipContent'; return C; })();

/* ---- Popover ---- */
export const Popover = ({ children }) => React.createElement(React.Fragment, null, children);
export const PopoverTrigger = React.forwardRef(({ children, asChild, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
PopoverTrigger.displayName = 'PopoverTrigger';
export const PopoverContent = Div('PopoverContent', 'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md');

/* ---- DropdownMenu ---- */
export const DropdownMenu = ({ children }) => React.createElement(React.Fragment, null, children);
export const DropdownMenuTrigger = React.forwardRef(({ children, asChild, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';
export const DropdownMenuContent = Div('DropdownMenuContent', 'z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md');
export const DropdownMenuItem = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('div', { ref, className: cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none', className), ...p })); C.displayName = 'DropdownMenuItem'; return C; })();
export const DropdownMenuSeparator = () => React.createElement('div', { className: '-mx-1 my-1 h-px bg-muted' });
export const DropdownMenuLabel = ({ className, ...p }) => React.createElement('div', { className: cn('px-2 py-1.5 text-sm font-semibold', className), ...p });
export const DropdownMenuGroup = ({ children }) => React.createElement('div', null, children);
export const DropdownMenuCheckboxItem = DropdownMenuItem;
export const DropdownMenuRadioGroup = ({ children }) => React.createElement('div', null, children);
export const DropdownMenuRadioItem = DropdownMenuItem;
export const DropdownMenuSub = ({ children }) => React.createElement(React.Fragment, null, children);
export const DropdownMenuSubContent = DropdownMenuContent;
export const DropdownMenuSubTrigger = DropdownMenuItem;

/* ---- Switch / Checkbox / Radio ---- */
export const Switch = React.forwardRef(({ className, checked, onCheckedChange, ...p }, ref) => React.createElement('button', { ref, role: 'switch', 'aria-checked': !!checked, onClick: () => onCheckedChange && onCheckedChange(!checked), className: cn('peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors', checked ? 'bg-primary' : 'bg-input', className), ...p }, React.createElement('span', { className: cn('pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform', checked ? 'translate-x-5' : 'translate-x-0') })));
Switch.displayName = 'Switch';
export const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...p }, ref) => React.createElement('button', { ref, role: 'checkbox', 'aria-checked': !!checked, onClick: () => onCheckedChange && onCheckedChange(!checked), className: cn('peer h-4 w-4 shrink-0 rounded-sm border border-primary', checked ? 'bg-primary text-primary-foreground' : '', className), ...p }, checked ? '✓' : ''));
Checkbox.displayName = 'Checkbox';
export const RadioGroup = ({ children, className, onValueChange, defaultValue, value }) => React.createElement('div', { className: cn('grid gap-2', className), role: 'radiogroup' }, children);
export const RadioGroupItem = React.forwardRef(({ className, value, ...p }, ref) => React.createElement('button', { ref, role: 'radio', className: cn('aspect-square h-4 w-4 rounded-full border border-primary', className), ...p }));
RadioGroupItem.displayName = 'RadioGroupItem';

/* ---- ScrollArea ---- */
export const ScrollArea = Div('ScrollArea', 'relative overflow-auto');
export const ScrollBar = () => null;

/* ---- Table ---- */
export const Table = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('div', { className: 'relative w-full overflow-auto' }, React.createElement('table', { ref, className: cn('w-full caption-bottom text-sm', className), ...p }))); C.displayName = 'Table'; return C; })();
export const TableHeader = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('thead', { ref, className: cn('[&_tr]:border-b', className), ...p })); C.displayName = 'TableHeader'; return C; })();
export const TableBody = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('tbody', { ref, className: cn('[&_tr:last-child]:border-0', className), ...p })); C.displayName = 'TableBody'; return C; })();
export const TableRow = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('tr', { ref, className: cn('border-b transition-colors hover:bg-muted/50', className), ...p })); C.displayName = 'TableRow'; return C; })();
export const TableHead = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('th', { ref, className: cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className), ...p })); C.displayName = 'TableHead'; return C; })();
export const TableCell = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('td', { ref, className: cn('p-4 align-middle', className), ...p })); C.displayName = 'TableCell'; return C; })();
export const TableCaption = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('caption', { ref, className: cn('mt-4 text-sm text-muted-foreground', className), ...p })); C.displayName = 'TableCaption'; return C; })();

/* ---- Navigation ---- */
export const NavigationMenu = Div('NavigationMenu', 'relative z-10 flex max-w-max flex-1 items-center justify-center');
export const NavigationMenuList = Div('NavigationMenuList', 'group flex flex-1 list-none items-center justify-center space-x-1');
export const NavigationMenuItem = ({ children, className }) => React.createElement('li', { className }, children);
export const NavigationMenuTrigger = (() => { const C = React.forwardRef(({ className, children, ...p }, ref) => React.createElement('button', { ref, className: cn('group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium', className), ...p }, children)); C.displayName = 'NavigationMenuTrigger'; return C; })();
export const NavigationMenuContent = Div('NavigationMenuContent', 'left-0 top-0 w-full');
export const NavigationMenuLink = React.forwardRef(({ className, children, ...p }, ref) => React.createElement('a', { ref, className: cn('block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none', className), ...p }, children));
NavigationMenuLink.displayName = 'NavigationMenuLink';

/* ---- Breadcrumb ---- */
export const Breadcrumb = ({ children, className }) => React.createElement('nav', { 'aria-label': 'breadcrumb', className }, children);
export const BreadcrumbList = Div('BreadcrumbList', 'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground');
export const BreadcrumbItem = ({ children, className }) => React.createElement('li', { className: cn('inline-flex items-center gap-1.5', className) }, children);
export const BreadcrumbLink = React.forwardRef(({ className, children, href, ...p }, ref) => React.createElement('a', { ref, href, className: cn('transition-colors hover:text-foreground', className), ...p }, children));
BreadcrumbLink.displayName = 'BreadcrumbLink';
export const BreadcrumbPage = ({ className, ...p }) => React.createElement('span', { role: 'link', 'aria-current': 'page', className: cn('font-normal text-foreground', className), ...p });
export const BreadcrumbSeparator = ({ children }) => React.createElement('li', { role: 'presentation', 'aria-hidden': true, className: '[&>svg]:size-3.5' }, children || '/');

/* ---- Misc ---- */
export const Progress = React.forwardRef(({ className, value = 0, ...p }, ref) => React.createElement('div', { ref, className: cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className), ...p }, React.createElement('div', { className: 'h-full w-full flex-1 bg-primary transition-all', style: { transform: 'translateX(-' + (100 - (value || 0)) + '%)' } })));
Progress.displayName = 'Progress';
export const Slider = React.forwardRef(({ className, ...p }, ref) => React.createElement('div', { ref, className: cn('relative flex w-full touch-none select-none items-center', className), ...p }));
Slider.displayName = 'Slider';
export const Toggle = React.forwardRef(({ className, variant, size, pressed, onPressedChange, children, ...p }, ref) => React.createElement('button', { ref, 'aria-pressed': pressed, onClick: () => onPressedChange && onPressedChange(!pressed), className: cn('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors', className), ...p }, children));
Toggle.displayName = 'Toggle';
export const ToggleGroup = ({ children, className, type, value, onValueChange }) => React.createElement('div', { className: cn('flex items-center justify-center gap-1', className) }, children);
export const ToggleGroupItem = Toggle;
export const AspectRatio = ({ ratio = 1, children, className }) => React.createElement('div', { className, style: { position: 'relative', paddingBottom: (1 / ratio) * 100 + '%' } }, React.createElement('div', { style: { position: 'absolute', inset: 0 } }, children));
export const Collapsible = ({ children, open, onOpenChange }) => React.createElement('div', null, children);
export const CollapsibleTrigger = React.forwardRef(({ children, ...p }, ref) => React.createElement('button', { ref, ...p }, children));
CollapsibleTrigger.displayName = 'CollapsibleTrigger';
export const CollapsibleContent = Div('CollapsibleContent');
export const HoverCard = ({ children }) => React.createElement(React.Fragment, null, children);
export const HoverCardTrigger = React.forwardRef(({ children, asChild, ...p }, ref) => React.createElement('span', { ref, ...p }, children));
HoverCardTrigger.displayName = 'HoverCardTrigger';
export const HoverCardContent = Div('HoverCardContent', 'z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md');
export const Calendar = ({ className, ...p }) => React.createElement('div', { className: cn('p-3', className) }, React.createElement('p', { className: 'text-sm text-muted-foreground' }, 'Calendar preview'));
export const Command = Div('Command', 'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground');
export const CommandDialog = Dialog;
export const CommandEmpty = ({ children }) => React.createElement('p', { className: 'py-6 text-center text-sm' }, children);
export const CommandGroup = Div('CommandGroup', 'overflow-hidden p-1 text-foreground');
export const CommandInput = Input;
export const CommandItem = (() => { const C = React.forwardRef(({ className, ...p }, ref) => React.createElement('div', { ref, className: cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none', className), ...p })); C.displayName = 'CommandItem'; return C; })();
export const CommandList = Div('CommandList', 'max-h-[300px] overflow-y-auto overflow-x-hidden');
export const CommandSeparator = () => React.createElement('div', { className: '-mx-1 h-px bg-border' });
export const Toaster = () => null;
export const Sonner = () => null;
export const ResizablePanelGroup = Div('ResizablePanelGroup', 'flex h-full w-full');
export const ResizablePanel = Div('ResizablePanel', 'flex-1');
export const ResizableHandle = () => React.createElement('div', { className: 'w-px bg-border' });
export const Carousel = Div('Carousel', 'relative');
export const CarouselContent = Div('CarouselContent', 'flex');
export const CarouselItem = Div('CarouselItem', 'min-w-0 shrink-0 grow-0 basis-full');
export const CarouselPrevious = (() => { const C = React.forwardRef((p, ref) => React.createElement('button', { ref, className: 'absolute left-0 top-1/2 -translate-y-1/2', ...p }, '‹')); C.displayName = 'CarouselPrevious'; return C; })();
export const CarouselNext = (() => { const C = React.forwardRef((p, ref) => React.createElement('button', { ref, className: 'absolute right-0 top-1/2 -translate-y-1/2', ...p }, '›')); C.displayName = 'CarouselNext'; return C; })();
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

  let result = code;

  // Inject nav bridge
  if (!result.includes('__initLovablePreviewNavBridge')) {
    const importBlock = result.match(/^(?:import[^\n]*\n)+/);
    if (importBlock) {
      result = `${importBlock[0]}\n${PREVIEW_NAV_BRIDGE}\n__initLovablePreviewNavBridge();\n\n${result.slice(importBlock[0].length)}`;
    } else {
      result = `${PREVIEW_NAV_BRIDGE}\n__initLovablePreviewNavBridge();\n\n${result}`;
    }
  }

  // Inject edit mode bridge
  if (!result.includes('__initLovableEditModeBridge')) {
    // Find a safe injection point after imports
    const importBlock = result.match(/^(?:import[^\n]*\n)+/);
    if (importBlock) {
      const afterImports = result.slice(importBlock[0].length);
      result = `${importBlock[0]}\n${EDIT_MODE_SELECTION_BRIDGE}\n__initLovableEditModeBridge();\n\n${afterImports}`;
    } else {
      result = `${EDIT_MODE_SELECTION_BRIDGE}\n__initLovableEditModeBridge();\n\n${result}`;
    }
  }

  return result;
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

/**
 * Process code to strip/transform imports that Sandpack can't resolve.
 * Also fixes dangerouslySetInnerHTML template literals that contain CSS (which crash Babel).
 */
export function processCode(code: string, filePath: string): string {
  if (!/\.(tsx?|jsx?|mjs)$/.test(filePath)) {
    return code;
  }

  let processed = code;

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

  // Handle @/ path alias imports
  processed = processed.replace(
    /^import\s+(?:(?:\{([^}]*)\}|\*\s+as\s+(\w+)|(\w+))\s*,?\s*)*\s*from\s+['"]@\/([^'"]+)['"];?\s*$/gm,
    (match, namedImports, namespaceImport, defaultImport, modulePath) => {
      if (modulePath.startsWith('hooks/') || modulePath === 'hooks') {
        if (namedImports) return `import { ${namedImports} } from '/hooks-shim';`;
        if (defaultImport) return `import ${defaultImport} from '/hooks-shim';`;
        if (namespaceImport) return `import * as ${namespaceImport} from '/hooks-shim';`;
        return `import hooks from '/hooks-shim'; // [Preview] Shimmed: @/${modulePath}`;
      }
      if (modulePath.startsWith('integrations/supabase')) {
        if (namedImports) return `import { ${namedImports} } from '/hooks-shim';`;
        if (defaultImport) return `import ${defaultImport} from '/hooks-shim';`;
        return `import { supabase } from '/hooks-shim'; // [Preview] Shimmed: @/${modulePath}`;
      }
      // Redirect @/components/ui/* to the UI component shim
      if (modulePath.startsWith('components/ui/') || modulePath === 'components/ui') {
        if (namedImports) return `import { ${namedImports} } from '/ui-shim';`;
        if (defaultImport) return `import ${defaultImport} from '/ui-shim';`;
        if (namespaceImport) return `import * as ${namespaceImport} from '/ui-shim';`;
        return `import '/ui-shim'; // [Preview] Shimmed: @/${modulePath}`;
      }
      // Convert @/ aliases to absolute paths — after /src/ flattening, @/ maps to /
      // Using absolute paths (not ./) ensures correct resolution regardless of importer depth
      if (namedImports) return `import { ${namedImports} } from '/${modulePath}';`;
      if (defaultImport) return `import ${defaultImport} from '/${modulePath}';`;
      if (namespaceImport) return `import * as ${namespaceImport} from '/${modulePath}';`;
      return `import '/${modulePath}';`;
    }
  );

  // Process remaining imports
  processed = processed.replace(
    /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"];?\s*$/gm,
    (match, modulePath) => {
      const baseModule = modulePath.split('/')[0];
      if (ALLOWED_IMPORTS.has(modulePath) || ALLOWED_IMPORTS.has(baseModule)) return match;
      if (/\.(css|scss|less)$/.test(modulePath)) return match;
      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        // Redirect relative UI component imports to the UI shim
        if (modulePath.includes('components/ui/') || modulePath.includes('/ui/')) {
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '/ui-shim';`;
            if (defaultImport) return `import ${defaultImport} from '/ui-shim';`;
          }
          return `import '/ui-shim'; // [Preview] Shimmed: ${modulePath}`;
        }
        if (modulePath.includes('hooks/')) {
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '/hooks-shim';`;
            if (defaultImport) return `import ${defaultImport} from '/hooks-shim';`;
          }
          return `import hooks from '/hooks-shim'; // [Preview] Shimmed: ${modulePath}`;
        }
        return match;
      }
      if (modulePath.startsWith('@/')) {
        // Convert @/ to absolute — after /src/ flattening, @/ maps to /
        const absolutePath = modulePath.replace('@/', '/');
        return match.replace(modulePath, absolutePath);
      }
      return match;
    }
  );

  // NOTE: Previously stripped calls to useAssetRegistry, useTemplateState,
  // useGoHighLevelCRM, useSupabaseClient — but hooks-shim already provides
  // working mock implementations for all of these. Stripping the CALL while
  // keeping the destructured variables caused undefined-reference crashes.
  // Now we let the shimmed import + call work end-to-end.

  processed = processed.replace(/\n{3,}/g, '\n\n');
  return processed;
}

/**
 * Convert VFS files to Sandpack-compatible format.
 * Flattens /src/ paths to root, processes imports, adds missing essentials.
 * 
 * @param options.strict - When true (launcher mode), throws instead of injecting
 *   DEFAULT_APP / DEFAULT_MAIN. This surfaces missing entrypoints as real errors
 *   rather than silently rendering a placeholder app.
 */
export function prepareSandpackFiles(
  files: Record<string, string>,
  options?: { strict?: boolean },
): Record<string, string> {
  const strict = options?.strict ?? false;
  const sandpackFiles: Record<string, string> = {};
  let hasApp = false;
  let hasMain = false;
  let hasCSS = false;

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

    // Skip .html/.htm files (except index.html which is the Vite entry point)
    // All content should be React/TypeScript — no HTML page files
    if ((normalizedPath.endsWith('.html') || normalizedPath.endsWith('.htm')) &&
        normalizedPath !== '/index.html' && normalizedPath !== '/src/index.html') {
      console.log(`[sandpackFilePrep] Skipping non-entry HTML file: ${normalizedPath}`);
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

    // SAFETY NET: Detect stringified JSON accidentally passed as file content
    if (/\.(tsx?|jsx?)$/.test(normalizedPath)) {
      const trimmedContent = processedContent.trim();
      if (trimmedContent.startsWith('{') && !trimmedContent.includes('import ') &&
          !trimmedContent.includes('export ') && !trimmedContent.includes('function ')) {
        try {
          const parsed = JSON.parse(trimmedContent);
          if (parsed.files && typeof parsed.files === 'object') {
            // Double-serialized AI output — extract the actual code
            const appCode = parsed.files['src/App.tsx'] || parsed.files['/src/App.tsx'] ||
                            parsed.files['App.tsx'] || parsed.files['/App.tsx'];
            if (appCode && typeof appCode === 'string') {
              console.warn(`[sandpackFilePrep] Unwrapped double-serialized JSON in ${normalizedPath}`);
              processedContent = appCode;
            }
          } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            console.warn(`[sandpackFilePrep] File ${normalizedPath} contains JSON object instead of code — wrapping`);
            processedContent = `import React from 'react';\nexport default function App() { return <pre>{${JSON.stringify(JSON.stringify(parsed, null, 2))}}</pre>; }`;
          }
        } catch {
          // Not valid JSON — might be JSX object expression, leave as-is
        }
      }
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
      // Self-close void elements (<br> → <br />, <img ...> → <img ... />, etc.)
      processedContent = fixJsxVoidElements(processedContent);
      // Convert style="..." strings to style={{...}} objects
      processedContent = fixJsxStyleStrings(processedContent);
    }

    processedContent = processedContent
      .replace(/from\s+['"]\.\/src\//g, "from './")
      .replace(/from\s+['"]src\//g, "from './")
      .replace(/from\s+['"]\.\/styles\//g, "from './")
      .replace(/import\s+['"]\.\/styles\//g, "import './");

    processedContent = processCode(processedContent, normalizedPath);
    processedContent = injectPreviewNavBridge(processedContent, normalizedPath);
    sandpackFiles[normalizedPath] = processedContent;

    if (normalizedPath === '/App.tsx' || normalizedPath === '/App.jsx') hasApp = true;
    if (normalizedPath === '/main.tsx' || normalizedPath === '/main.jsx' || normalizedPath === '/index.tsx') hasMain = true;
    if (normalizedPath.endsWith('.css')) hasCSS = true;
  }

  if (!hasCSS) sandpackFiles['/index.css'] = BASE_CSS;

  if (strict) {
    // In strict mode (launcher output), App.tsx is the AI-generated content —
    // if it's missing, that's a real error. main.tsx is scaffolding that the AI
    // never generates, so always inject it.
    if (!hasApp) throw new Error('Missing /App.tsx after Sandpack file preparation (strict mode)');
    if (!hasMain) sandpackFiles['/main.tsx'] = DEFAULT_MAIN;
  } else {
    if (!hasApp) sandpackFiles['/App.tsx'] = DEFAULT_APP;
    if (!hasMain) sandpackFiles['/main.tsx'] = DEFAULT_MAIN;
  }
  sandpackFiles['/hooks-shim.ts'] = HOOKS_SHIM;
  sandpackFiles['/ui-shim.tsx'] = UI_SHIM;

  // Inject lib/utils.ts with cn() if not already present (AI uses @/lib/utils)
  if (!sandpackFiles['/lib/utils.ts'] && !sandpackFiles['/lib/utils.tsx']) {
    sandpackFiles['/lib/utils.ts'] = LIB_UTILS;
  }

  // Ensure template.css exists if any file imports it
  const anyImportsTemplateCss = Object.values(sandpackFiles).some(c =>
    typeof c === 'string' && /import\s+['"]\.\/template\.css['"]/.test(c)
  );
  if (anyImportsTemplateCss && !sandpackFiles['/template.css']) {
    // Provide an empty CSS file so Sandpack doesn't crash
    sandpackFiles['/template.css'] = '/* template styles */\n';
  }

  // =========================================================================
  // AUTO-STUB: Scan for relative imports referencing files that don't exist
  // in the prepared sandbox and generate lightweight stub components.
  // This prevents "Could not find module" Sandpack crashes when AI generates
  // App.tsx referencing section files it didn't actually include.
  // =========================================================================
  const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
  const SHIM_PATHS = new Set(['/hooks-shim', '/ui-shim', '/lib/utils']);

  for (const [filePath, content] of Object.entries({ ...sandpackFiles })) {
    if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;

    // Find all relative and absolute imports in this file
    const importRegex = /from\s+['"](\/?\.\.?\/[^'"]+|\/[^'"]+)['"]/g;
    let importMatch;
    while ((importMatch = importRegex.exec(content)) !== null) {
      const rawImportPath = importMatch[1];

      // Skip npm packages (no leading . or /)
      if (!rawImportPath.startsWith('.') && !rawImportPath.startsWith('/')) continue;

      // Resolve to absolute sandbox path
      let absPath: string;
      if (rawImportPath.startsWith('/')) {
        // Already absolute
        absPath = rawImportPath;
      } else {
        // Relative — resolve from current file's directory
        const fromDir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
        const segments = (fromDir + '/' + rawImportPath).split('/').filter(Boolean);
        const resolved: string[] = [];
        for (const seg of segments) {
          if (seg === '..') resolved.pop();
          else if (seg !== '.') resolved.push(seg);
        }
        absPath = '/' + resolved.join('/');
      }

      // Skip well-known shims and CSS
      if (SHIM_PATHS.has(absPath)) continue;
      if (/\.(css|scss|less)$/.test(absPath)) continue;

      // Check if the file already exists (with any extension)
      const exists = EXTENSIONS.some(ext => sandpackFiles[absPath + ext]) || sandpackFiles[absPath];
      if (exists) continue;

      // Extract what's being imported to generate matching exports
      const lineRegex = new RegExp(
        `import\\s+(?:\\{([^}]+)\\}|(\\w+)).*?from\\s+['"]${rawImportPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
        'm'
      );
      const lineMatch = content.match(lineRegex);
      const namedExports = lineMatch?.[1]?.split(',').map(s => s.replace(/\s+as\s+\w+/, '').trim()).filter(Boolean) || [];
      const defaultExport = lineMatch?.[2];

      // Generate a stub component file with a styled section layout
      // instead of bare <div>Name</div> which renders as literal text
      const componentName = absPath.split('/').pop() || 'Component';
      let stub = `// @ts-nocheck\nimport React from 'react';\n\n`;

      const styledStub = (name: string) => {
        const heading = name.replace(/([A-Z])/g, ' $1').trim();
        return [
          `  return React.createElement('section', { className: 'py-16 px-4 ' + (className || ''), ...props },`,
          `    React.createElement('div', { className: 'max-w-5xl mx-auto text-center' },`,
          `      React.createElement('h2', { className: 'text-3xl font-bold mb-4' }, '${heading}'),`,
          `      React.createElement('p', { className: 'text-gray-500' }, children || 'Content loading…')`,
          `    )`,
          `  );`,
        ].join('\n');
      };

      for (const name of namedExports) {
        stub += `export function ${name}({ children, className, ...props }) {\n`;
        stub += styledStub(name) + '\n';
        stub += `}\n\n`;
      }

      if (defaultExport) {
        stub += `export default function ${defaultExport}({ children, className, ...props }) {\n`;
        stub += styledStub(defaultExport) + '\n';
        stub += `}\n`;
      } else if (namedExports.length === 0) {
        // No named or default — generate a generic default export
        stub += `export default function ${componentName}({ children, className, ...props }) {\n`;
        stub += styledStub(componentName) + '\n';
        stub += `}\n`;
      }

      const stubPath = absPath + '.tsx';
      sandpackFiles[stubPath] = stub;
      console.warn(`[sandpackFilePrep] Auto-stubbed missing import: ${stubPath} (referenced from ${filePath})`);
    }
  }

  // Ensure index.html exists (minimal — click interceptor is now in main.tsx)
  if (!sandpackFiles['/index.html']) {
    sandpackFiles['/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
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
        },
      },
    };
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
  }

  console.log('[sandpackFilePrep] Prepared files:', Object.keys(sandpackFiles));
  return sandpackFiles;
}
