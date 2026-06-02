/**
 * Redirect Page Generator (React/TSX Mode)
 * 
 * Parses multi-page AI output, splits into separate VFS files as React
 * components, and generates react-router App.tsx for Sandpack preview.
 * 
 * All output is React/TSX — no HTML document generation.
 * 
 * Flow:
 * 1. Systems AI generates React components or multi-file JSON
 * 2. This utility parses the output into individual page files
 * 3. Pages are written to VFS as .tsx files under /src/pages/
 * 4. A routing wrapper is generated for Sandpack preview
 * 5. Context is shared with in-builder AI for site-wide awareness
 */

// ============================================================================
// Types
// ============================================================================

export interface RedirectPage {
  /** Route path, e.g. "/checkout" */
  path: string;
  /** File path in VFS, e.g. "/src/pages/Checkout.tsx" */
  fileName: string;
  /** Component name, e.g. "CheckoutPage" */
  componentName: string;
  /** Full TSX content of the page */
  content: string;
  /** Human-readable label */
  label: string;
  /** Whether this is the main/index page */
  isMain: boolean;
}

export interface MultiPageParseResult {
  /** The main page (index/App) */
  mainPage: RedirectPage;
  /** All redirect/sub pages */
  redirectPages: RedirectPage[];
  /** All pages including main */
  allPages: RedirectPage[];
  /** VFS file map ready for import */
  vfsFiles: Record<string, string>;
  /** Summary for AI context sharing */
  contextSummary: string;
}

// ============================================================================
// Parser
// ============================================================================

const PAGE_MARKER_RE = /<!--\s*PAGE:\s*([^\s>]+)\s*(?:label="([^"]*)")?\s*-->/gi;

/**
 * Parse multi-page AI output into separate React pages.
 * 
 * Supports:
 * - JSON { files: { "/src/pages/X.tsx": "..." } } format
 * - PAGE marker format: <!-- PAGE: /checkout label="Checkout" -->
 * - Single component (no markers) → treated as main page
 */
export function parseMultiPageOutput(rawOutput: string): MultiPageParseResult {
  // Try JSON multi-file format first
  try {
    const trimmed = rawOutput.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"files"')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.files && typeof parsed.files === 'object') {
        return parseJsonFiles(parsed.files);
      }
    }
  } catch { /* not JSON, continue */ }

  // Try PAGE marker format
  const markers: { path: string; label: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(PAGE_MARKER_RE.source, PAGE_MARKER_RE.flags);
  
  while ((match = re.exec(rawOutput)) !== null) {
    markers.push({
      path: normalizePath(match[1]),
      label: match[2] || '',
      index: match.index,
    });
  }
  
  if (markers.length === 0) {
    // No markers — treat entire output as single main page
    const mainPage = buildPage('/', rawOutput.trim(), '', true);
    return buildResult(mainPage, []);
  }
  
  // Split content between markers
  const pages: RedirectPage[] = [];
  for (let i = 0; i < markers.length; i++) {
    const markerEnd = rawOutput.indexOf('-->', markers[i].index) + 3;
    const contentStart = markerEnd;
    const contentEnd = i + 1 < markers.length ? markers[i + 1].index : rawOutput.length;
    const content = rawOutput.slice(contentStart, contentEnd).trim();
    
    const isMain = markers[i].path === '/' || markers[i].path === '/index' || i === 0;
    pages.push(buildPage(markers[i].path, content, markers[i].label, isMain));
  }
  
  const mainPage = pages.find(p => p.isMain) || pages[0];
  if (mainPage) mainPage.isMain = true;
  
  const redirectPages = pages.filter(p => !p.isMain);
  return buildResult(mainPage, redirectPages);
}

function parseJsonFiles(files: Record<string, string>): MultiPageParseResult {
  const pages: RedirectPage[] = [];
  let mainContent = '';

  for (const [filePath, content] of Object.entries(files)) {
    if (filePath === '/src/App.tsx' || filePath === '/App.tsx') {
      mainContent = content;
      continue;
    }
    if (filePath.match(/\/src\/pages\/\w+\.tsx$/)) {
      const nameMatch = filePath.match(/\/(\w+)\.tsx$/);
      const componentName = nameMatch?.[1] || 'Page';
      const routePath = '/' + componentName.replace(/Page$/, '').toLowerCase();
      pages.push({
        path: routePath,
        fileName: filePath,
        componentName,
        content,
        label: componentName.replace(/Page$/, '').replace(/([A-Z])/g, ' $1').trim(),
        isMain: false,
      });
    }
  }

  const mainPage: RedirectPage = {
    path: '/',
    fileName: '/src/App.tsx',
    componentName: 'App',
    content: mainContent || 'export default function App() { return <div>Home</div>; }',
    label: 'Home',
    isMain: true,
  };

  return buildResult(mainPage, pages);
}

// ============================================================================
// VFS File Generation
// ============================================================================

/**
 * Generate VFS files for multi-page Sandpack preview.
 * Creates individual .tsx page components and a routing App.tsx.
 */
export function generateMultiPageVFS(result: MultiPageParseResult): Record<string, string> {
  const files: Record<string, string> = {};
  
  // Write each page as a React component
  for (const page of result.allPages) {
    if (page.isMain) {
      // Main page content goes into App or is wrapped in router
      continue;
    }
    files[page.fileName] = page.content;
  }
  
  // If only one page, no routing needed
  if (result.redirectPages.length === 0) {
    files['/src/App.tsx'] = result.mainPage.content;
    return files;
  }
  
  // Generate React Router App.tsx
  files['/src/App.tsx'] = generateRouterApp(result);
  files['/src/main.tsx'] = generateMainTsx();
  files['/src/index.css'] = generateBaseCss();
  
  return files;
}

// ============================================================================
// AI Context Generation
// ============================================================================

/**
 * Build a context string for in-builder AI to understand the site structure.
 * This enables the AI assistant to make site-wide customizations.
 */
export function buildRedirectPageContext(result: MultiPageParseResult): string {
  const lines: string[] = [];
  lines.push('\n=== MULTI-PAGE REACT SITE STRUCTURE ===');
  lines.push(`Total pages: ${result.allPages.length}`);
  lines.push('');
  
  for (const page of result.allPages) {
    const intents = extractIntents(page.content);
    lines.push(`📄 ${page.label} (${page.fileName})${page.isMain ? ' [MAIN]' : ''}`);
    lines.push(`   Component: ${page.componentName}`);
    lines.push(`   Route: ${page.path}`);
    if (intents.length > 0) lines.push(`   Intents: ${intents.join(', ')}`);
    lines.push(`   Size: ${page.content.length} chars`);
  }
  
  lines.push('');
  lines.push('Rules for site-wide edits:');
  lines.push('- All pages are React/TSX components using react-router-dom');
  lines.push('- Changes to nav/footer should be applied across ALL pages');
  lines.push('- Brand colors, fonts, and design tokens must be consistent');
  lines.push('- Use Tailwind CSS semantic tokens (hsl(var(--primary)), etc.)');
  
  return lines.join('\n');
}

/**
 * Detect if AI output contains multi-page markers
 */
export function hasMultiPageMarkers(code: string): boolean {
  return PAGE_MARKER_RE.test(code);
}

/**
 * Analyze main page React component to suggest redirect pages.
 * Inspects navigation links and routes for pages that don't exist yet.
 */
export function suggestRedirectPages(mainPageCode: string): string[] {
  const suggestions: string[] = [];
  
  // Find React Router <Link to="/path"> patterns
  const linkRe = /<Link\s+[^>]*to=["']\/([a-zA-Z][\w-]*)["']/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRe.exec(mainPageCode)) !== null) {
    const pageName = linkMatch[1];
    if (pageName !== 'index' && !suggestions.includes(pageName)) {
      suggestions.push(pageName);
    }
  }

  // Find navigate("/path") calls
  const navRe = /navigate\(["']\/([a-zA-Z][\w-]*)["']\)/gi;
  while ((linkMatch = navRe.exec(mainPageCode)) !== null) {
    const pageName = linkMatch[1];
    if (!suggestions.includes(pageName)) {
      suggestions.push(pageName);
    }
  }
  
  // Check data-ut-path attributes
  const pathRe = /data-ut-path=["']\/?([\w-]+)(?:\.html)?["']/gi;
  while ((linkMatch = pathRe.exec(mainPageCode)) !== null) {
    const pageName = linkMatch[1];
    if (pageName !== 'index' && !suggestions.includes(pageName)) {
      suggestions.push(pageName);
    }
  }

  // Check href attributes (legacy HTML patterns in JSX)
  const hrefRe = /href=["']\/?([\w-]+)(?:\.html)?["']/gi;
  while ((linkMatch = hrefRe.exec(mainPageCode)) !== null) {
    const pageName = linkMatch[1];
    if (pageName !== 'index' && !suggestions.includes(pageName)) {
      suggestions.push(pageName);
    }
  }
  
  return suggestions;
}

// ============================================================================
// Helpers
// ============================================================================

function normalizePath(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = '/' + p;
  // Strip .html extension
  p = p.replace(/\.html$/, '');
  if (p === '/index') p = '/';
  return p;
}

function pathToComponentName(path: string): string {
  const cleaned = path.replace(/^\//, '') || 'Home';
  return cleaned
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase()) + 'Page';
}

function buildPage(path: string, content: string, label: string, isMain: boolean): RedirectPage {
  const componentName = isMain ? 'App' : pathToComponentName(path);
  const fileName = isMain ? '/src/App.tsx' : `/src/pages/${componentName}.tsx`;
  const inferredLabel = label || extractComponentLabel(content) || fileNameToLabel(componentName);
  
  // Ensure content is a valid React component
  let finalContent = content;
  if (!content.includes('export default') && !content.includes('export function')) {
    // Wrap raw JSX in a component
    finalContent = `import React from 'react';
import { Link } from 'react-router-dom';

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      ${content}
    </div>
  );
}`;
  }
  
  return {
    path,
    fileName,
    componentName,
    content: finalContent,
    label: inferredLabel,
    isMain,
  };
}

function buildResult(mainPage: RedirectPage, redirectPages: RedirectPage[]): MultiPageParseResult {
  const allPages = [mainPage, ...redirectPages];
  
  const vfsFiles: Record<string, string> = {};
  for (const page of allPages) {
    vfsFiles[page.fileName] = page.content;
  }
  
  const contextSummary = buildRedirectPageContext({ mainPage, redirectPages, allPages, vfsFiles, contextSummary: '' });
  
  return {
    mainPage,
    redirectPages,
    allPages,
    vfsFiles,
    contextSummary,
  };
}

function extractComponentLabel(code: string): string {
  // Try to extract from component name
  const exportMatch = code.match(/export default function (\w+)/);
  if (exportMatch) {
    return exportMatch[1].replace(/Page$/, '').replace(/([A-Z])/g, ' $1').trim();
  }
  return '';
}

function fileNameToLabel(name: string): string {
  return name
    .replace(/Page$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function extractIntents(code: string): string[] {
  const intents: string[] = [];
  const intentRe = /data-ut-intent=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = intentRe.exec(code)) !== null) {
    if (!intents.includes(m[1])) intents.push(m[1]);
  }
  // Also check for intent prop patterns in React
  const intentPropRe = /intent=["']([^"']+)["']/gi;
  while ((m = intentPropRe.exec(code)) !== null) {
    if (!intents.includes(m[1])) intents.push(m[1]);
  }
  return intents;
}

// ============================================================================
// React Router Code Generation
// ============================================================================

function generateRouterApp(result: MultiPageParseResult): string {
  const imports = result.redirectPages
    .map(p => `import ${p.componentName} from './pages/${p.componentName}';`)
    .join('\n');
  
  const routes = result.redirectPages
    .map(p => `        <Route path="${p.path}" element={<${p.componentName} />} />`)
    .join('\n');

  // Extract the main component body
  const mainCode = result.mainPage.content;
  const hasDefaultExport = mainCode.includes('export default');

  if (hasDefaultExport) {
    return `import { BrowserRouter, Routes, Route } from 'react-router-dom';
${imports}

// Original home component
${mainCode.replace(/export default/g, 'const HomePage =')}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
${routes}
      </Routes>
    </BrowserRouter>
  );
}
`;
  }

  return `import { BrowserRouter, Routes, Route } from 'react-router-dom';
${imports}

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold p-8">Home</h1>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
${routes}
      </Routes>
    </BrowserRouter>
  );
}
`;
}

function generateMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function generateBaseCss(): string {
  return `:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --card: 0 0% 100%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
}

* { border-color: hsl(var(--border)); }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
`;
}
