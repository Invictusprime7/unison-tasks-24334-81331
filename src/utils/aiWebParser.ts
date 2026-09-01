/**
 * AI Web Parser - Advanced parsing for AI-generated web content and online webpages
 * 
 * Provides:
 * - Online webpage content parsing and extraction
 * - Saved project parsing for VFS reconstruction
 * - Unique React component generation from various inputs
 * - Enhanced code transformation pipeline
 * 
 * @module aiWebParser
 */

import { nanoid } from 'nanoid';

// ============================================================================
// Types
// ============================================================================

export interface ParsedWebContent {
  /** Main content HTML */
  html: string;
  /** Extracted CSS styles */
  css: string;
  /** JavaScript code (sanitized) */
  js: string;
  /** Meta information */
  meta: WebContentMeta;
  /** Extracted assets (images, fonts, etc.) */
  assets: ExtractedAsset[];
  /** Detected framework */
  framework: 'html' | 'react' | 'vue' | 'svelte' | 'unknown';
}

export interface WebContentMeta {
  title: string;
  description: string;
  keywords: string[];
  author: string;
  viewport: string;
  themeColor: string;
  favicon: string;
  ogImage: string;
  canonicalUrl: string;
}

export interface ExtractedAsset {
  type: 'image' | 'font' | 'script' | 'stylesheet' | 'icon';
  url: string;
  localPath?: string;
  content?: string;
}

export interface SavedProjectData {
  id: string;
  name: string;
  files: Record<string, string>;
  metadata: ProjectMetadata;
  timestamp: number;
}

export interface ProjectMetadata {
  framework: string;
  version: string;
  dependencies: Record<string, string>;
  entryPoint: string;
  buildConfig?: Record<string, unknown>;
}

export interface VFSGenerationResult {
  files: Record<string, string>;
  entryPoint: string;
  componentName: string;
  hash: string;
  warnings: string[];
}

export interface ComponentExtraction {
  name: string;
  code: string;
  props: string[];
  imports: string[];
  exports: string[];
  isDefault: boolean;
}

// ============================================================================
// Online Webpage Parser
// ============================================================================

/**
 * Parse raw HTML from an online webpage into structured content
 */
export function parseOnlineWebpage(rawHtml: string, sourceUrl?: string): ParsedWebContent {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  
  // Extract meta information
  const meta = extractMeta(doc, sourceUrl);
  
  // Extract and clean HTML
  const html = extractCleanHtml(doc);
  
  // Extract CSS
  const css = extractStyles(doc);
  
  // Extract JS (sanitized)
  const js = extractScripts(doc);
  
  // Extract assets
  const assets = extractAssets(doc, sourceUrl);
  
  // Detect framework
  const framework = detectFramework(rawHtml);
  
  return { html, css, js, meta, assets, framework };
}

/**
 * Extract meta tags from document
 */
function extractMeta(doc: Document, sourceUrl?: string): WebContentMeta {
  const getMeta = (name: string): string => {
    const el = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return el?.getAttribute('content') || '';
  };
  
  return {
    title: doc.title || getMeta('og:title') || 'Untitled',
    description: getMeta('description') || getMeta('og:description'),
    keywords: (getMeta('keywords') || '').split(',').map(k => k.trim()).filter(Boolean),
    author: getMeta('author'),
    viewport: getMeta('viewport') || 'width=device-width, initial-scale=1',
    themeColor: getMeta('theme-color'),
    favicon: doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.getAttribute('href') || '',
    ogImage: getMeta('og:image'),
    canonicalUrl: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || sourceUrl || '',
  };
}

/**
 * Extract and clean body HTML
 */
function extractCleanHtml(doc: Document): string {
  const body = doc.body.cloneNode(true) as HTMLElement;
  
  // Remove script tags
  body.querySelectorAll('script').forEach(el => el.remove());
  
  // Remove tracking/analytics elements
  body.querySelectorAll('[data-analytics], [data-tracking], .analytics, .tracking').forEach(el => el.remove());
  
  // Remove hidden elements
  body.querySelectorAll('[style*="display: none"], [style*="display:none"], [hidden]').forEach(el => el.remove());
  
  // Clean up attributes
  body.querySelectorAll('*').forEach(el => {
    // Remove event handlers
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return body.innerHTML.trim();
}

/**
 * Extract inline and linked styles
 */
function extractStyles(doc: Document): string {
  const styles: string[] = [];
  
  // Inline styles
  doc.querySelectorAll('style').forEach(style => {
    const content = style.textContent?.trim();
    if (content) {
      styles.push(content);
    }
  });
  
  return styles.join('\n\n');
}

/**
 * Extract and sanitize scripts
 */
function extractScripts(doc: Document): string {
  const scripts: string[] = [];
  
  doc.querySelectorAll('script:not([src])').forEach(script => {
    const content = script.textContent?.trim();
    if (content && !containsDangerousCode(content)) {
      scripts.push(content);
    }
  });
  
  return scripts.join('\n\n');
}

/**
 * Check for dangerous JS patterns
 */
function containsDangerousCode(code: string): boolean {
  const dangerous = [
    /eval\s*\(/,
    /document\.write/,
    /innerHTML\s*=/,
    /localStorage|sessionStorage/,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /websocket/i,
    /postMessage/,
    /window\.open/,
  ];
  
  return dangerous.some(pattern => pattern.test(code));
}

/**
 * Extract asset references
 */
function extractAssets(doc: Document, baseUrl?: string): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const resolveUrl = (url: string) => {
    if (!url || url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (baseUrl) {
      try {
        return new URL(url, baseUrl).href;
      } catch {
        return url;
      }
    }
    return url;
  };
  
  // Images
  doc.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      assets.push({ type: 'image', url: resolveUrl(src) });
    }
  });
  
  // Stylesheets
  doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      assets.push({ type: 'stylesheet', url: resolveUrl(href) });
    }
  });
  
  // Fonts (from CSS @font-face - simplified)
  const styleContent = extractStyles(doc);
  const fontMatches = styleContent.matchAll(/url\s*\(\s*['"]?([^'")\s]+\.(?:woff2?|ttf|otf|eot))['"]?\s*\)/gi);
  for (const match of fontMatches) {
    assets.push({ type: 'font', url: resolveUrl(match[1]) });
  }
  
  return assets;
}

/**
 * Detect the framework used in the HTML
 */
function detectFramework(html: string): ParsedWebContent['framework'] {
  // React detection
  if (html.includes('__NEXT_DATA__') || html.includes('_next/') || 
      html.includes('react-root') || html.includes('data-reactroot')) {
    return 'react';
  }
  
  // Vue detection
  if (html.includes('__vue__') || html.includes('data-v-') || html.includes('v-cloak')) {
    return 'vue';
  }
  
  // Svelte detection
  if (html.includes('__svelte') || html.includes('svelte-')) {
    return 'svelte';
  }
  
  // Plain HTML
  if (html.includes('<!DOCTYPE html') || html.includes('<html')) {
    return 'html';
  }
  
  return 'unknown';
}

// ============================================================================
// Saved Project Parser
// ============================================================================

/**
 * Parse a saved project (from localStorage, file upload, or API)
 */
export function parseSavedProject(data: string | object): SavedProjectData | null {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Validate structure
    if (!parsed.files || typeof parsed.files !== 'object') {
      console.warn('[aiWebParser] Invalid project: missing files');
      return null;
    }
    
    // Normalize file paths
    const files: Record<string, string> = {};
    for (const [path, content] of Object.entries(parsed.files)) {
      const normalizedPath = normalizePath(path);
      files[normalizedPath] = typeof content === 'string' ? content : JSON.stringify(content);
    }
    
    // Extract metadata
    const metadata = extractProjectMetadata(files);
    
    return {
      id: parsed.id || nanoid(),
      name: parsed.name || extractProjectName(files),
      files,
      metadata,
      timestamp: parsed.timestamp || Date.now(),
    };
  } catch (err) {
    console.error('[aiWebParser] Failed to parse saved project:', err);
    return null;
  }
}

/**
 * Normalize file paths for VFS
 */
function normalizePath(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * Extract project metadata from files
 */
function extractProjectMetadata(files: Record<string, string>): ProjectMetadata {
  // Try to read package.json
  const pkgJson = files['/package.json'];
  let pkg: Record<string, unknown> = {};
  
  if (pkgJson) {
    try {
      pkg = JSON.parse(pkgJson);
    } catch {
      // Invalid JSON
    }
  }
  
  // Detect framework
  const deps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
  let framework = 'vanilla';
  if (deps.react || deps['react-dom']) framework = 'react';
  else if (deps.vue) framework = 'vue';
  else if (deps.svelte) framework = 'svelte';
  else if (deps.angular) framework = 'angular';
  
  // Detect entry point
  let entryPoint = '/src/main.tsx';
  if (files['/src/main.ts']) entryPoint = '/src/main.ts';
  else if (files['/src/index.tsx']) entryPoint = '/src/index.tsx';
  else if (files['/src/index.ts']) entryPoint = '/src/index.ts';
  else if (files['/index.html']) entryPoint = '/index.html';
  
  return {
    framework,
    version: (pkg.version as string) || '1.0.0',
    dependencies: deps,
    entryPoint,
    buildConfig: pkg.scripts as Record<string, unknown>,
  };
}

/**
 * Extract project name from files
 */
function extractProjectName(files: Record<string, string>): string {
  const pkgJson = files['/package.json'];
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      if (pkg.name) return pkg.name;
    } catch {
      // Invalid JSON
    }
  }
  
  // Try to extract from index.html title
  const indexHtml = files['/index.html'];
  if (indexHtml) {
    const match = indexHtml.match(/<title>([^<]+)<\/title>/i);
    if (match) return match[1].trim();
  }
  
  return 'Untitled Project';
}

// ============================================================================
// Unique React Component Generation
// ============================================================================

/**
 * Generate unique React components from parsed web content
 */
export function generateUniqueReactVFS(
  content: ParsedWebContent,
  options: {
    projectName?: string;
    splitComponents?: boolean;
    useTypeScript?: boolean;
    addRouting?: boolean;
  } = {}
): VFSGenerationResult {
  const {
    projectName = 'AIWebsite',
    splitComponents = true,
    useTypeScript = true,
    addRouting = false,
  } = options;
  
  const ext = useTypeScript ? 'tsx' : 'jsx';
  const files: Record<string, string> = {};
  const warnings: string[] = [];
  const hash = nanoid(8);
  
  // Sanitize component name
  const componentName = sanitizeComponentName(projectName);
  
  // Generate main App component
  if (splitComponents) {
    // Extract and separate components
    const extraction = extractComponentsFromHtml(content.html, componentName);
    
    // Create component files
    for (const comp of extraction.components) {
      files[`/src/components/${comp.name}.${ext}`] = generateComponentFile(comp, useTypeScript);
    }
    
    // Create main App with imports
    files[`/src/App.${ext}`] = generateAppWithImports(extraction, componentName, useTypeScript, addRouting);
  } else {
    // Single App component with all content
    files[`/src/App.${ext}`] = generateMonolithicApp(content, componentName, useTypeScript);
  }
  
  // Generate index.css with extracted and enhanced styles
  files['/src/index.css'] = generateEnhancedStyles(content.css, content.meta.themeColor);
  
  // Generate main entry point
  files[`/src/main.${ext}`] = generateMainEntry(useTypeScript);
  
  // Generate index.html with proper meta
  files['/index.html'] = generateIndexHtml(content.meta, projectName);
  
  // Generate package.json
  files['/package.json'] = generatePackageJson(projectName, addRouting);
  
  // Add Vite config
  files['/vite.config.ts'] = generateViteConfig();
  
  // Add TypeScript config if needed
  if (useTypeScript) {
    files['/tsconfig.json'] = generateTsConfig();
  }
  
  return {
    files,
    entryPoint: `/src/main.${ext}`,
    componentName,
    hash,
    warnings,
  };
}

/**
 * Sanitize string to valid component name
 */
function sanitizeComponentName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^([a-z])/, (m) => m.toUpperCase())
    .replace(/^(\d)/, '_$1') || 'App';
}

/**
 * Extract components from HTML structure
 */
interface ComponentExtractResult {
  components: Array<{
    name: string;
    jsx: string;
    props: string[];
  }>;
  appJsx: string;
}

function extractComponentsFromHtml(html: string, baseName: string): ComponentExtractResult {
  const components: ComponentExtractResult['components'] = [];
  let appJsx = html;
  
  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  
  if (!root) {
    return { components: [], appJsx: html };
  }
  
  // Find semantic sections to extract as components
  const sectionSelectors = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
  let compIndex = 0;
  
  for (const selector of sectionSelectors) {
    const elements = root.querySelectorAll(selector);
    
    elements.forEach((el) => {
      compIndex++;
      const id = el.getAttribute('id');
      const className = el.className?.split(' ')[0];
      
      // Generate component name
      let compName = id 
        ? sanitizeComponentName(id) 
        : className 
          ? sanitizeComponentName(className)
          : `${baseName}${selector.charAt(0).toUpperCase() + selector.slice(1)}${compIndex}`;
      
      // Ensure unique name
      while (components.some(c => c.name === compName)) {
        compName += compIndex;
      }
      
      // Extract inner HTML and convert to JSX
      const jsx = htmlToJsx(el.outerHTML);
      
      components.push({
        name: compName,
        jsx,
        props: [],
      });
      
      // Replace in app JSX with component reference
      const placeholder = `<${compName} />`;
      appJsx = appJsx.replace(el.outerHTML, placeholder);
    });
  }
  
  // Convert remaining HTML to JSX
  appJsx = htmlToJsx(appJsx);
  
  return { components, appJsx };
}

/**
 * Convert HTML to valid JSX
 */
function htmlToJsx(html: string): string {
  return html
    // Self-closing tags
    .replace(/<(img|input|br|hr|meta|link|area|base|col|embed|param|source|track|wbr)([^>]*)(?<!\/)>/gi, '<$1$2 />')
    // class -> className
    .replace(/\bclass=/g, 'className=')
    // for -> htmlFor
    .replace(/\bfor=/g, 'htmlFor=')
    // Style strings to objects (simplified)
    .replace(/style="([^"]*)"/g, (_, styleStr) => {
      const styles = styleStr.split(';')
        .filter((s: string) => s.trim())
        .map((s: string) => {
          const [prop, val] = s.split(':').map((p: string) => p.trim());
          const camelProp = prop.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
          return `${camelProp}: '${val}'`;
        })
        .join(', ');
      return `style={{${styles}}}`;
    })
    // Event handlers
    .replace(/\bon([a-z]+)=/gi, (_, event) => `on${event.charAt(0).toUpperCase()}${event.slice(1)}=`)
    // Remove xmlns except on svg
    .replace(/(?<!svg[^>]*)\s*xmlns="[^"]*"/gi, '')
    // Fix boolean attributes
    .replace(/\b(disabled|checked|readonly|required|hidden)(?!=)/gi, '$1={true}')
    // Convert tabindex to tabIndex
    .replace(/\btabindex=/gi, 'tabIndex=')
    // Convert colspan/rowspan
    .replace(/\bcolspan=/gi, 'colSpan=')
    .replace(/\browspan=/gi, 'rowSpan=')
    // Convert autocomplete
    .replace(/\bautocomplete=/gi, 'autoComplete=')
    // Comments
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
}

/**
 * Generate component file content
 */
function generateComponentFile(
  comp: { name: string; jsx: string; props: string[] },
  useTypeScript: boolean
): string {
  const propsType = useTypeScript && comp.props.length > 0
    ? `interface ${comp.name}Props {\n${comp.props.map(p => `  ${p}?: string;`).join('\n')}\n}\n\n`
    : '';
  
  const propsParam = useTypeScript && comp.props.length > 0
    ? `{ ${comp.props.join(', ')} }: ${comp.name}Props`
    : '';
  
  return `import React from 'react';

${propsType}export function ${comp.name}(${propsParam}) {
  return (
    ${comp.jsx}
  );
}

export default ${comp.name};
`;
}

/**
 * Generate App component with imports
 */
function generateAppWithImports(
  extraction: ComponentExtractResult,
  componentName: string,
  useTypeScript: boolean,
  addRouting: boolean
): string {
  const imports = extraction.components
    .map(c => `import ${c.name} from './components/${c.name}';`)
    .join('\n');
  
  // Use HashRouter for preview compatibility (works in iframes without server rewrites)
  const routerImports = addRouting
    ? "import { HashRouter, Routes, Route } from 'react-router-dom';\n"
    : '';
  
  const content = addRouting
    ? `
    <HashRouter>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen">
            ${extraction.appJsx}
          </div>
        } />
      </Routes>
    </HashRouter>`
    : `
    <div className="min-h-screen">
      ${extraction.appJsx}
    </div>`;
  
  return `import React from 'react';
${routerImports}${imports}

export default function ${componentName}() {
  return (${content}
  );
}
`;
}

/**
 * Generate monolithic App component
 */
function generateMonolithicApp(
  content: ParsedWebContent,
  componentName: string,
  useTypeScript: boolean
): string {
  const jsx = htmlToJsx(content.html);
  
  // Always use native JSX — no dangerouslySetInnerHTML
  const cssStr = content.css?.trim() 
    ? JSON.stringify(content.css) 
    : '';

  let code = `import React${cssStr ? ', { useEffect }' : ''} from 'react';\n\n`;
  if (cssStr) {
    code += `const TEMPLATE_CSS = ${cssStr};\n\n`;
  }
  code += `export default function ${componentName}() {\n`;
  if (cssStr) {
    code += `  useEffect(() => {\n`;
    code += `    const s = document.createElement('style');\n`;
    code += `    s.setAttribute('data-template', '');\n`;
    code += `    s.textContent = TEMPLATE_CSS;\n`;
    code += `    document.head.appendChild(s);\n`;
    code += `    return () => { s.remove(); };\n`;
    code += `  }, []);\n\n`;
  }
  code += `  return (\n    <div className="min-h-screen">\n      ${jsx}\n    </div>\n  );\n}\n`;
  return code;
}

/**
 * Generate enhanced CSS with variables
 */
function generateEnhancedStyles(css: string, themeColor?: string): string {
  const primaryColor = themeColor || '#3b82f6';
  
  return `:root {
  --primary: ${primaryColor};
  --primary-foreground: #ffffff;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.75rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}

* {
  border-color: hsl(var(--border));
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Extracted styles */
${css}
`;
}

/**
 * Generate main entry file
 */
function generateMainEntry(useTypeScript: boolean): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')${useTypeScript ? '!' : ''}).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

/**
 * Generate index.html with meta
 */
function generateIndexHtml(meta: WebContentMeta, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="${meta.viewport}" />
  <meta name="description" content="${meta.description}" />
  ${meta.themeColor ? `<meta name="theme-color" content="${meta.themeColor}" />` : ''}
  <title>${meta.title || title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`;
}

/**
 * Generate package.json
 */
function generatePackageJson(name: string, addRouting: boolean): string {
  const deps: Record<string, string> = {
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
  };
  
  if (addRouting) {
    deps['react-router-dom'] = '^6.20.0';
  }
  
  return JSON.stringify({
    name: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: deps,
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      '@vitejs/plugin-react': '^4.0.0',
      'typescript': '^5.0.0',
      'vite': '^5.0.0',
    },
  }, null, 2);
}

/**
 * Generate Vite config
 */
function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
`;
}

/**
 * Generate TypeScript config
 */
function generateTsConfig(): string {
  return JSON.stringify({
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

// ============================================================================
// Code Transformation Utilities
// ============================================================================

/**
 * Transform mixed code output to clean VFS structure
 */
export function transformCodeToVFS(
  code: string,
  options: {
    preferReact?: boolean;
    projectName?: string;
  } = {}
): VFSGenerationResult {
  const { preferReact = true, projectName = 'Generated' } = options;
  
  // Detect code type
  const isReact = code.includes('import React') || code.includes('export default function') || 
                  code.includes('useState') || code.includes('useEffect');
  const isHtml = code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html');
  const isJsx = code.includes('return (') && code.includes('className=');
  
  if (isReact) {
    // Already React - wrap in VFS structure
    return wrapReactInVFS(code, projectName);
  }
  
  if (isHtml) {
    // Parse and convert
    const parsed = parseOnlineWebpage(code);
    return generateUniqueReactVFS(parsed, { projectName, splitComponents: true });
  }
  
  if (isJsx && preferReact) {
    // JSX snippet - wrap in component
    return wrapJsxInVFS(code, projectName);
  }
  
  // Fallback: treat as HTML fragment
  const parsed = parseOnlineWebpage(`<div>${code}</div>`);
  return generateUniqueReactVFS(parsed, { projectName, splitComponents: false });
}

/**
 * Wrap existing React code in VFS structure
 */
function wrapReactInVFS(code: string, projectName: string): VFSGenerationResult {
  const componentName = sanitizeComponentName(projectName);
  const hash = nanoid(8);
  
  const files: Record<string, string> = {
    '/src/App.tsx': code,
    '/src/main.tsx': generateMainEntry(true),
    '/src/index.css': generateEnhancedStyles('', undefined),
    '/index.html': generateIndexHtml({
      title: projectName,
      description: '',
      keywords: [],
      author: '',
      viewport: 'width=device-width, initial-scale=1',
      themeColor: '',
      favicon: '',
      ogImage: '',
      canonicalUrl: '',
    }, projectName),
    '/package.json': generatePackageJson(projectName, false),
    '/vite.config.ts': generateViteConfig(),
    '/tsconfig.json': generateTsConfig(),
  };
  
  return {
    files,
    entryPoint: '/src/main.tsx',
    componentName,
    hash,
    warnings: [],
  };
}

/**
 * Wrap JSX snippet in VFS structure
 */
function wrapJsxInVFS(jsx: string, projectName: string): VFSGenerationResult {
  const componentName = sanitizeComponentName(projectName);
  const hash = nanoid(8);
  
  const appCode = `import React from 'react';

export default function ${componentName}() {
  return (
    <div className="min-h-screen">
      ${jsx}
    </div>
  );
}
`;
  
  return wrapReactInVFS(appCode, projectName);
}

// ============================================================================
// Export aggregation
// ============================================================================

export {
  parseOnlineWebpage as parseWebpage,
  generateUniqueReactVFS as generateReactVFS,
  transformCodeToVFS as codeToVFS,
  htmlToJsx,
  sanitizeComponentName,
};
