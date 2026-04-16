/**
 * Template to VFS Converter (React-only)
 * 
 * Converts template code into React/TSX VFS file structures.
 * All output is native JSX React components — TypeScript/React from start to finish.
 */

import { fixJsxVoidElements, fixJsxStyleStrings } from './aiCodeCleaner';
import { htmlDocToReactComponentWithCSS } from './htmlToJsx';

// ============================================================================
// Embedded CSS Extraction
// ============================================================================

/**
 * Extracts embedded TEMPLATE_STYLES or TEMPLATE_CSS from component code
 * and returns a clean component with a CSS import instead.
 */
export function extractEmbeddedCSS(code: string): { cleanCode: string; css: string } {
  // Match const TEMPLATE_STYLES = "..." or const TEMPLATE_CSS = "..."
  const constMatch = code.match(/const\s+(?:TEMPLATE_STYLES|TEMPLATE_CSS)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*;?\n?/s);
  if (!constMatch) return { cleanCode: code, css: '' };

  let css = '';
  try { css = JSON.parse(constMatch[1]); } catch { return { cleanCode: code, css: '' }; }

  let cleanCode = code;

  // Remove the const declaration
  cleanCode = cleanCode.replace(constMatch[0], '');

  // Remove the useEffect that injects styles via DOM
  cleanCode = cleanCode.replace(
    /\s*\/\/\s*Inject styles\n?\s*useEffect\(\(\)\s*=>\s*\{[^}]*document\.createElement\('style'\)[^}]*\}\s*;\s*\}\s*,\s*\[\]\);?\n?/s,
    '\n'
  );

  // Add CSS import if not already present
  if (!cleanCode.includes("import './template.css'")) {
    cleanCode = cleanCode.replace(
      /(import React[\s\S]*?from\s+['"]react['"];?\n)/,
      "$1import './template.css';\n"
    );
  }

  // Clean up empty lines left behind
  cleanCode = cleanCode.replace(/\n{3,}/g, '\n\n');

  return { cleanCode, css };
}

// ============================================================================
// VFS File Structure Generator
// ============================================================================

/**
 * Creates a complete VFS file structure from React component code.
 * Always outputs .tsx files.
 */
export function templateToVFSFiles(
  templateCode: string,
  templateName: string = 'Template'
): Record<string, string> {
  const files: Record<string, string> = {};

  // Sanitize component name
  const componentName = templateName
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^([a-z])/, (m) => m.toUpperCase()) || 'Template';

  // Fix void HTML elements and style strings for JSX compatibility
  const code = fixJsxStyleStrings(fixJsxVoidElements(templateCode));

  const mainTSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  const baseCSS = `:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
  --radius: 0.75rem;
}

* { border-color: hsl(var(--border)); }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
`;

  // Legacy HTML documents — auto-migrate to React/TSX component
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    console.warn('[templateToVFSFiles] Migrating legacy HTML document to React/TSX');
    const result = htmlDocToReactComponentWithCSS(code, componentName);
    files['/src/App.tsx'] = result.code;
    if (result.css) {
      files['/src/template.css'] = result.css;
    }
  }
  // Detect if it's already a full React component
  else if (code.includes('export default function') ||
    code.includes('export default const') ||
    code.includes('function App()')) {
    // Extract any embedded TEMPLATE_STYLES/TEMPLATE_CSS and route to CSS file
    const { cleanCode, css } = extractEmbeddedCSS(code);
    files['/src/App.tsx'] = cleanCode;
    if (css) {
      files['/src/template.css'] = css;
    }
  } else if (code.includes('import ') || code.includes('export ')) {
    // It's a React component but not the App — wrap it
    const cleanCode = code
      .replace(/export\s+default\s+/g, '')
      .replace(/^import.*$/gm, '');
    const funcMatch = cleanCode.match(/(?:function|const)\s+(\w+)/);
    const extractedName = funcMatch ? funcMatch[1] : componentName;

    files['/src/App.tsx'] = `import React from 'react';

${cleanCode}

export default function App() {
  return <${extractedName} />;
}
`;
  } else {
    // JSX snippet — wrap in App component
    files['/src/App.tsx'] = `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      ${code}
    </div>
  );
}
`;
  }

  files['/src/main.tsx'] = mainTSX;
  files['/src/index.css'] = baseCSS;

  return files;
}

// ============================================================================
// Element Patch — Append JSX to existing component
// ============================================================================

/**
 * Appends a JSX element to an existing React component
 */
export function appendElementToComponent(
  existingCode: string,
  elementJsx: string,
  elementName: string
): string {
  // Find the return statement and inject before the closing tag
  const returnMatch = existingCode.match(/return\s*\(\s*([\s\S]*)\s*\);?\s*\}[\s\n]*$/);

  if (!returnMatch) {
    return `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ${elementName} */}
      ${elementJsx}
    </div>
  );
}
`;
  }

  const returnContent = returnMatch[1];
  const lastDivIndex = returnContent.lastIndexOf('</div>');
  if (lastDivIndex > -1) {
    const newContent =
      returnContent.slice(0, lastDivIndex) +
      `\n      {/* ${elementName} */}\n      ${elementJsx}\n    ` +
      returnContent.slice(lastDivIndex);

    return existingCode.replace(returnMatch[1], newContent);
  }

  return existingCode.replace(
    returnMatch[1],
    returnContent.replace(/(<\/div>\s*)$/, `\n      ${elementJsx}\n    $1`)
  );
}

/**
 * Creates files for a single element insertion
 */
export function elementToVFSPatch(
  existingFiles: Record<string, string>,
  elementJsx: string,
  elementName: string
): Record<string, string> {
  const appContent = existingFiles['/src/App.tsx'] || '';

  if (!appContent) {
    return {
      '/src/App.tsx': `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      {/* ${elementName} */}
      ${elementJsx}
    </div>
  );
}
`
    };
  }

  return {
    '/src/App.tsx': appendElementToComponent(appContent, elementJsx, elementName)
  };
}
