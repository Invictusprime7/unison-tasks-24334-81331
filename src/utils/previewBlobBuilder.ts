/**
 * previewBlobBuilder — builds a standalone multi-page HTML blob for "open in new tab".
 *
 * Takes the prepared sandpackFiles (from buildPreviewArtifacts) and produces a
 * self-contained HTML document that:
 *  - Loads React + ReactDOM from CDN (UMD)
 *  - Loads Babel Standalone from CDN to transpile TSX at runtime
 *  - Embeds all VFS files as JSON data
 *  - Runs a CommonJS-style module system with Babel transpilation
 *  - Supports hash-based multi-page routing (#/page)
 *  - Stubs every external dependency (lucide-react, framer-motion, ui components, etc.)
 */

/** Escape characters that could break a <script> context */
function escapeScriptJson(str: string): string {
  return str.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** Escape HTML attribute/text content */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The in-blob runtime: CommonJS module system + Babel transpiler + boot logic */
const BLOB_RUNTIME = `
(function () {
  'use strict';

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var Babel = window.Babel;

  if (!React || !ReactDOM || !Babel) {
    document.getElementById('root').textContent = 'Missing dependencies (React/ReactDOM/Babel failed to load from CDN).';
    var l = document.getElementById('__blob-loading');
    if (l) l.style.display = 'none';
    return;
  }

  var VFS = window.__VFS_FILES__ || {};
  var INITIAL_ROUTE = window.__INITIAL_ROUTE__ || '/';

  // ── Module cache ──────────────────────────────────────────────────────────
  var moduleCache = {};

  // ── Path helpers ──────────────────────────────────────────────────────────
  function normalizePath(p) {
    if (!p) return '/';
    return p.charAt(0) === '/' ? p : '/' + p;
  }

  function resolvePath(fromPath, importPath) {
    if (importPath.charAt(0) !== '.') return importPath;
    var fromParts = fromPath.split('/');
    fromParts.pop();
    var toParts = importPath.split('/');
    for (var i = 0; i < toParts.length; i++) {
      var part = toParts[i];
      if (part === '.') continue;
      if (part === '..') fromParts.pop();
      else fromParts.push(part);
    }
    return fromParts.join('/') || '/';
  }

  function findInVFS(path) {
    var exts = ['', '.tsx', '.ts', '.jsx', '.js'];
    for (var i = 0; i < exts.length; i++) {
      if (VFS[path + exts[i]] !== undefined) return path + exts[i];
    }
    for (var j = 0; j < exts.length; j++) {
      var idx = path + '/index' + exts[j];
      if (VFS[idx] !== undefined) return idx;
    }
    return null;
  }

  function isCSSPath(p) {
    return /[.](css|scss|sass|less)$/.test(p);
  }

  function resolveAlias(importPath) {
    if (importPath.charAt(0) === '@' && importPath.charAt(1) === '/') {
      return importPath.replace('@/', '/');
    }
    return importPath;
  }

  // ── Lucide icons stub ─────────────────────────────────────────────────────
  function createLucideStub() {
    return new Proxy({}, {
      get: function(_, name) {
        if (typeof name !== 'string') return undefined;
        return function LucideIcon(props) {
          var size = props.size || 16;
          var color = props.color || 'currentColor';
          var sw = props.strokeWidth || 2;
          var cls = props.className || '';
          return React.createElement('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
            width: size, height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: color,
            strokeWidth: sw,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            className: cls,
          },
            React.createElement('circle', { cx: 12, cy: 12, r: 5 }),
            React.createElement('line', { x1: 12, y1: 2, x2: 12, y2: 5 }),
            React.createElement('line', { x1: 12, y1: 19, x2: 12, y2: 22 }),
            React.createElement('line', { x1: 2, y1: 12, x2: 5, y2: 12 }),
            React.createElement('line', { x1: 19, y1: 12, x2: 22, y2: 12 })
          );
        };
      }
    });
  }

  // ── framer-motion stub ───────────────────────────────────────────────────
  function createFramerStub() {
    var MOTION_PROPS = ['initial','animate','exit','transition','variants','whileHover','whileTap','whileFocus','whileInView','layout','layoutId'];
    function makeMotionEl(tag) {
      return React.forwardRef(function(props, ref) {
        var cleaned = {};
        for (var k in props) {
          if (MOTION_PROPS.indexOf(k) === -1) cleaned[k] = props[k];
        }
        cleaned.ref = ref;
        return React.createElement(tag, cleaned);
      });
    }
    var motion = new Proxy({}, { get: function(_, tag) { return makeMotionEl(String(tag)); } });
    return {
      motion: motion,
      AnimatePresence: function(p) { return p.children || null; },
      useAnimation: function() { return { start: function(){}, stop: function(){} }; },
      useInView: function() { return [null, true]; },
      useScroll: function() { return { scrollY: { get: function(){ return 0; } } }; },
      useTransform: function(v) { return v; },
      useSpring: function(v) { return v; },
      m: new Proxy({}, { get: function(_, tag) { return makeMotionEl(String(tag)); } }),
    };
  }

  // ── react-hook-form stub ─────────────────────────────────────────────────
  function createRHFStub() {
    return {
      useForm: function() {
        return {
          register: function(name) { return { name: name, onChange: function(){}, onBlur: function(){}, ref: function(){} }; },
          handleSubmit: function(fn) { return function(e) { if (e && e.preventDefault) e.preventDefault(); fn({}); }; },
          watch: function() { return ''; },
          setValue: function() {},
          getValues: function() { return {}; },
          formState: { errors: {}, isSubmitting: false, isValid: true },
          reset: function() {},
          control: {},
          trigger: function() { return Promise.resolve(true); },
        };
      },
      Controller: function(p) { return p.render({ field: { name: p.name || '', value: '', onChange: function(){}, onBlur: function(){} } }); },
      FormProvider: function(p) { return p.children; },
      useFormContext: function() { return { register: function(){ return {}; }, formState: { errors: {} } }; },
    };
  }

  // ── router stub ───────────────────────────────────────────────────────────
  function createRouterStub() {
    function Link(props) {
      var to = props.to || '#';
      var href = typeof to === 'string' && to.startsWith('/') ? '#' + to : to;
      var rest = {};
      for (var k in props) { if (k !== 'to' && k !== 'children') rest[k] = props[k]; }
      return React.createElement('a', Object.assign({ href: href }, rest), props.children);
    }
    return {
      BrowserRouter: function(p) { return p.children || null; },
      HashRouter: function(p) { return p.children || null; },
      MemoryRouter: function(p) { return p.children || null; },
      Router: function(p) { return p.children || null; },
      Routes: function(p) { return p.children || null; },
      Route: function() { return null; },
      Switch: function(p) { return p.children || null; },
      Link: Link,
      NavLink: Link,
      Navigate: function() { return null; },
      Redirect: function() { return null; },
      Outlet: function() { return null; },
      useNavigate: function() { return function(path) { if (typeof path === 'string') window.location.hash = path; }; },
      useLocation: function() { return { pathname: window.location.hash.replace('#', '') || '/', hash: window.location.hash, search: '' }; },
      useParams: function() { return {}; },
      useMatch: function() { return null; },
      useHistory: function() { return { push: function(p) { window.location.hash = p; }, replace: function(p) { window.location.hash = p; }, goBack: function() { history.back(); } }; },
      withRouter: function(C) { return C; },
      matchPath: function() { return null; },
    };
  }

  // ── date-fns stub ─────────────────────────────────────────────────────────
  var dateFnsStub = new Proxy({}, { get: function(_, k) { return function(v) { return v instanceof Date ? v.toLocaleDateString() : String(v); }; } });

  // ── zod stub ──────────────────────────────────────────────────────────────
  var zodObj = { parse: function(v) { return v; }, safeParse: function(v) { return { success: true, data: v }; }, optional: function() { return zodObj; }, nullable: function() { return zodObj; }, default: function() { return zodObj; }, array: function() { return zodObj; }, object: function() { return zodObj; }, string: function() { return zodObj; }, number: function() { return zodObj; }, boolean: function() { return zodObj; }, enum: function() { return zodObj; }, union: function() { return zodObj; }, literal: function() { return zodObj; }, min: function() { return zodObj; }, max: function() { return zodObj; }, email: function() { return zodObj; }, url: function() { return zodObj; }, refine: function() { return zodObj; } };
  var zodStub = { z: zodObj, ZodError: function() {}, default: { z: zodObj } };
  Object.assign(zodStub, zodObj);

  // ── External package resolution ───────────────────────────────────────────
  var EXTERNALS = {
    'react': function() { return React; },
    'react/jsx-runtime': function() { return { jsx: React.createElement, jsxs: React.createElement, Fragment: React.Fragment }; },
    'react/jsx-dev-runtime': function() { return { jsxDEV: React.createElement, Fragment: React.Fragment }; },
    'react-dom': function() { return ReactDOM; },
    'react-dom/client': function() { return ReactDOM; },
    'react-dom/server': function() { return { renderToString: function() { return ''; }, renderToStaticMarkup: function() { return ''; } }; },
    'lucide-react': function() { return createLucideStub(); },
    'framer-motion': function() { return createFramerStub(); },
    'react-hook-form': function() { return createRHFStub(); },
    '@hookform/resolvers/zod': function() { return { zodResolver: function() { return function() { return {}; }; } }; },
    'zod': function() { return zodStub; },
    'date-fns': function() { return dateFnsStub; },
    'date-fns/locale': function() { return {}; },
    'clsx': function() { return { default: function() { return Array.prototype.slice.call(arguments).flat().filter(Boolean).join(' '); } }; },
    'class-variance-authority': function() { return { cva: function() { return function() { return ''; }; }, cx: function() { return ''; } }; },
    'tailwind-merge': function() { return { twMerge: function() { return Array.prototype.slice.call(arguments).filter(Boolean).join(' '); } }; },
    'sonner': function() { return { toast: function(m) { console.log('[Toast]', m); return { id: '1' }; }, Toaster: function() { return null; } }; },
    'react-router-dom': function() { return createRouterStub(); },
    'react-router': function() { return createRouterStub(); },
    'next/router': function() { return createRouterStub(); },
    'next/navigation': function() { return createRouterStub(); },
    'next/link': function() { return { default: function(p) { return React.createElement('a', { href: p.href || '#' }, p.children); } }; },
    'next/image': function() { return { default: function(p) { return React.createElement('img', p); } }; },
    '@tanstack/react-query': function() { return { useQuery: function() { return { data: null, isLoading: false, error: null }; }, useMutation: function() { return [function(){}, { isLoading: false }]; }, QueryClient: function() {}, QueryClientProvider: function(p) { return p.children; } }; },
    'axios': function() { return { get: function() { return Promise.resolve({ data: {} }); }, post: function() { return Promise.resolve({ data: {} }); }, default: {} }; },
    'swr': function() { return { default: function() { return { data: null, isLoading: false, error: null }; } }; },
  };

  function requireExternal(pkg) {
    if (EXTERNALS[pkg]) return EXTERNALS[pkg]();
    // Prefix matches
    if (pkg.startsWith('lucide-react')) return createLucideStub();
    if (pkg.startsWith('@radix-ui/') || pkg.startsWith('@headlessui/')) {
      return new Proxy({}, { get: function(_, k) { return typeof k === 'string' ? function(p) { return p && p.children ? p.children : null; } : undefined; } });
    }
    if (pkg.startsWith('date-fns')) return dateFnsStub;
    // Try @/ alias resolution against VFS
    var aliasResolved = resolveAlias(pkg);
    if (aliasResolved !== pkg) {
      var found = findInVFS(aliasResolved);
      if (found) return executeModule(found);
    }
    console.warn('[Preview] Unresolved external, returning stub:', pkg);
    return new Proxy({}, { get: function(_, k) { return typeof k === 'string' ? function() { return null; } : undefined; } });
  }

  // ── Module executor ───────────────────────────────────────────────────────
  function executeModule(vfsPath) {
    if (moduleCache[vfsPath] !== undefined) return moduleCache[vfsPath];
    var source = VFS[vfsPath];
    if (!source) {
      console.warn('[Preview] VFS file not found:', vfsPath);
      return {};
    }
    if (isCSSPath(vfsPath)) {
      moduleCache[vfsPath] = {};
      return {};
    }

    var mod = { exports: {} };
    // Register early to break circular deps
    moduleCache[vfsPath] = mod.exports;

    try {
      var isTSX = /[.](tsx|jsx)$/.test(vfsPath);
      var transpiled = Babel.transform(source, {
        filename: vfsPath,
        presets: [
          ['react', { runtime: 'classic' }],
          ['typescript', { allExtensions: true, isTSX: isTSX }],
        ],
        plugins: [
          ['transform-modules-commonjs', { strictMode: false, allowTopLevelThis: true }],
        ],
      }).code;

      var localRequire = createRequire(vfsPath);
      var dir = vfsPath.split('/').slice(0, -1).join('/') || '/';
      var fn = new Function('require', 'module', 'exports', 'React', '__filename', '__dirname', transpiled);
      fn(localRequire, mod, mod.exports, React, vfsPath, dir);
      moduleCache[vfsPath] = mod.exports;
    } catch (err) {
      console.error('[Preview] Babel/exec error in', vfsPath + ':', err.message);
      moduleCache[vfsPath] = {};
    }

    return moduleCache[vfsPath];
  }

  function createRequire(fromPath) {
    return function require(importPath) {
      if (isCSSPath(importPath)) return {};

      // Externals (no leading dot or slash)
      if (importPath.charAt(0) !== '.' && importPath.charAt(0) !== '/') {
        // Check if it's an @/ alias
        var aliased = resolveAlias(importPath);
        if (aliased !== importPath) {
          var found = findInVFS(aliased);
          if (found) return executeModule(found);
          // Try components/ui/ path for @/components/ui/...
          var uiPath = aliased.replace(/^\\/components\\/ui/, '/components/ui');
          var found2 = findInVFS(uiPath);
          if (found2) return executeModule(found2);
        }
        return requireExternal(importPath);
      }

      // Relative or absolute VFS path
      var resolved = importPath.charAt(0) === '/' ? importPath : resolvePath(fromPath, importPath);
      var vfsFile = findInVFS(resolved);
      if (vfsFile) return executeModule(vfsFile);

      console.warn('[Preview] Module not found:', resolved, '(from ' + fromPath + ')');
      return {};
    };
  }

  // ── Find entry point ──────────────────────────────────────────────────────
  function findEntryPoint() {
    var candidates = ['/index.tsx', '/index.jsx', '/index.ts', '/App.tsx', '/App.jsx'];
    for (var i = 0; i < candidates.length; i++) {
      if (VFS[candidates[i]]) return candidates[i];
    }
    var keys = Object.keys(VFS);
    for (var j = 0; j < keys.length; j++) {
      if (/App\\.(tsx|jsx)$/.test(keys[j])) return keys[j];
    }
    return keys.find(function(k) { return /\\.(tsx|jsx)$/.test(k); }) || null;
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    var entry = findEntryPoint();
    if (!entry) {
      document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;font-family:system-ui;color:#666"><h2>No entry point found in preview bundle</h2><p>No App.tsx or index.tsx was found in the VFS.</p></div>';
      var l = document.getElementById('__blob-loading');
      if (l) l.style.display = 'none';
      return;
    }

    try {
      if (entry === '/index.tsx' || entry === '/index.jsx' || entry === '/index.ts') {
        // /index.tsx calls ReactDOM.createRoot internally — just execute it
        executeModule(entry);
      } else {
        // Direct App component — render it ourselves
        var appMod = executeModule(entry);
        var App = appMod['default'];
        if (!App) {
          // Try first PascalCase named export
          var keys = Object.keys(appMod);
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (/^[A-Z]/.test(k) && typeof appMod[k] === 'function') { App = appMod[k]; break; }
          }
        }
        if (!App) throw new Error('No default React component export found in ' + entry);
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(React.StrictMode, null, React.createElement(App))
        );
      }

      // Apply initial hash route (if not already set)
      if (INITIAL_ROUTE && INITIAL_ROUTE !== '/' && !window.location.hash) {
        window.location.hash = INITIAL_ROUTE;
      }
    } catch (err) {
      document.getElementById('root').innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:32px;background:hsl(0,0%,100%)">' +
        '<div style="max-width:520px;text-align:center">' +
        '<div style="font-size:48px;margin-bottom:16px">⚠️</div>' +
        '<h2 style="font-size:20px;font-weight:600;margin-bottom:8px;color:#111">Preview Error</h2>' +
        '<p style="color:#777;font-size:14px;margin-bottom:20px;line-height:1.6">' + (err.message || String(err)).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>' +
        '<details style="text-align:left;font-size:12px;color:#555;background:#f5f5f5;padding:12px;border-radius:6px">' +
        '<summary style="cursor:pointer;margin-bottom:8px;font-weight:500">Stack trace</summary>' +
        '<pre style="white-space:pre-wrap;word-break:break-word;margin:0">' + String(err.stack || '').replace(/</g,'&lt;').slice(0,1000) + '</pre>' +
        '</details></div></div>';
    } finally {
      var loader = document.getElementById('__blob-loading');
      if (loader) loader.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
`;

export interface BlobPreviewOptions {
  /** Start at this hash route, e.g. "/contact" */
  currentRoute?: string;
  /** Page title for the browser tab */
  title?: string;
}

/**
 * Builds a standalone multi-page HTML blob from the given sandpackFiles.
 *
 * @param sandpackFiles  The prepared VFS files (from buildPreviewArtifacts).
 * @param options        Optional: initial hash route, page title.
 * @returns              A complete HTML string suitable for `new Blob([html], { type: 'text/html' })`.
 */
export function buildMultiPagePreviewBlob(
  sandpackFiles: Record<string, string>,
  options: BlobPreviewOptions = {}
): string {
  const { currentRoute = '/', title = 'Site Preview' } = options;

  const filesJson = escapeScriptJson(JSON.stringify(sandpackFiles));
  const initialRoute = escapeScriptJson(JSON.stringify(currentRoute));
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>

  <!-- Tailwind CDN with semantic design token config -->
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
          fontFamily: {
            heading: 'var(--font-heading, ui-sans-serif, system-ui, sans-serif)',
            body: 'var(--font-body, ui-sans-serif, system-ui, sans-serif)',
          },
        },
      },
    };
  </script>

  <!-- React + ReactDOM (UMD) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

  <!-- Babel Standalone — transpiles TSX/TypeScript at runtime -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <style>
    /* Semantic CSS design tokens (mirrors Sandpack preview) */
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
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
    }
    #root { min-height: 100vh; }
    #__blob-loading {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: hsl(var(--background));
      z-index: 9999;
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>
  <!-- Loading splash shown while Babel transpiles -->
  <div id="__blob-loading">
    <div style="text-align:center;color:#888">
      <div style="font-size:32px;margin-bottom:12px">⚡</div>
      <div style="font-size:14px;font-weight:500">Loading preview…</div>
      <div style="font-size:12px;margin-top:6px;opacity:.7">Compiling with Babel</div>
    </div>
  </div>

  <div id="root"></div>

  <!-- Embedded VFS file map -->
  <script>
    window.__VFS_FILES__ = ${filesJson};
    window.__INITIAL_ROUTE__ = ${initialRoute};
  </script>

  <!-- In-blob runtime: CommonJS module system + Babel transpiler + boot -->
  <script>${BLOB_RUNTIME}</script>
</body>
</html>`;
}

/**
 * Opens a multi-page preview in a new browser tab via a blob URL.
 * The blob URL is auto-revoked after 2 minutes (plenty of time for the tab to load).
 *
 * @param sandpackFiles  Prepared VFS files (from buildPreviewArtifacts).
 * @param options        Optional: initial hash route, page title.
 */
export function openPreviewInNewTab(
  sandpackFiles: Record<string, string>,
  options: BlobPreviewOptions = {}
): void {
  const html = buildMultiPagePreviewBlob(sandpackFiles, options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  // Revoke after 2 minutes — the opened tab will have fully loaded by then
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
