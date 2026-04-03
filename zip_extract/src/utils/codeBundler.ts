/**
 * Advanced Code Bundler
 * Handles TypeScript, JavaScript, React/JSX, and asset resolution with Babel transpilation
 */

import * as Babel from '@babel/standalone';

export interface BundledCode {
  html: string;
  css: string;
  javascript: string;
  hasReact: boolean;
  hasTypeScript: boolean;
  dependencies: string[];
}

/**
 * Strip all comments from code
 */
function stripComments(code: string): string {
  // Remove single-line comments but preserve URLs (http://, https://)
  let cleaned = code.replace(/(?<!:)\/\/(?!\/).*$/gm, '');
  
  // Remove multi-line comments (/* ... */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  return cleaned;
}

/**
 * Parse and bundle code for iframe execution
 */
export function bundleCode(code: string): BundledCode {
  // Strip all comments first to avoid render issues
  const cleanCode = stripComments(code);
  
  const result: BundledCode = {
    html: '',
    css: '',
    javascript: '',
    hasReact: false,
    hasTypeScript: false,
    dependencies: [],
  };

  // Detect code type
  result.hasTypeScript = cleanCode.includes('interface ') || cleanCode.includes('type ') || cleanCode.includes(': React.') || cleanCode.includes(': string') || cleanCode.includes(': number');
  result.hasReact = cleanCode.includes('React') || cleanCode.includes('jsx') || cleanCode.includes('tsx') || cleanCode.includes('useState') || cleanCode.includes('useEffect') || cleanCode.includes('className=');

  // Extract imports
  const imports = extractImports(cleanCode);
  result.dependencies = imports;

  // Parse based on format
  if (cleanCode.includes('```html')) {
    parseHTMLBlocks(cleanCode, result);
  } else if (cleanCode.includes('```jsx') || cleanCode.includes('```tsx')) {
    parseReactCode(cleanCode, result);
  } else if (cleanCode.includes('```javascript') || cleanCode.includes('```typescript')) {
    parseScriptCode(cleanCode, result);
  } else if (cleanCode.includes('<html') || cleanCode.includes('<!DOCTYPE')) {
    parseRawHTML(cleanCode, result);
  } else if (result.hasReact || result.hasTypeScript) {
    // React/TypeScript component - transpile with Babel
    try {
      const transpiled = transpileReactWithBabel(cleanCode);
      result.javascript = sanitizeJavaScript(transpiled.javascript);
      result.html = transpiled.html;
      result.css = transpiled.css;
    } catch (error) {
      console.error('Babel transpilation failed:', error);
      // Fallback to basic transpilation
      result.javascript = sanitizeJavaScript(transpileTypeScript(cleanCode));
    }
  } else if (cleanCode.includes('function') || cleanCode.includes('const ') || cleanCode.includes('class ')) {
    // Plain JS/TS code
    result.javascript = sanitizeJavaScript(transpileTypeScript(cleanCode));
  } else {
    // Assume HTML
    result.html = cleanCode;
  }

  // Final sanitization pass on JavaScript
  if (result.javascript) {
    result.javascript = sanitizeJavaScript(result.javascript);
  }

  return result;
}

/**
 * Sanitize JavaScript to ensure it's valid vanilla JS for iframe execution
 */
function sanitizeJavaScript(code: string): string {
  if (!code || typeof code !== 'string') return '';
  
  let sanitized = code;
  
  // Remove any remaining TypeScript type annotations
  sanitized = sanitized.replace(/:\s*[A-Z][a-zA-Z<>[\],\s|&]*(?=\s*[=,);{])/g, '');
  sanitized = sanitized.replace(/:\s*(?:string|number|boolean|any|void|null|undefined)(?:\[\])?(?=\s*[=,);{])/g, '');
  
  // Remove interface declarations
  sanitized = sanitized.replace(/interface\s+\w+\s*\{[^}]*\}/g, '');
  
  // Remove type declarations
  sanitized = sanitized.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
  
  // Remove generic type parameters
  sanitized = sanitized.replace(/<[A-Z][a-zA-Z<>[\],\s|&]*>/g, '');
  
  // Remove 'as' type assertions
  sanitized = sanitized.replace(/\s+as\s+[A-Za-z<>[\],\s|&]+/g, '');
  
  // Remove non-null assertions
  sanitized = sanitized.replace(/!(?=\.|\[)/g, '');
  
  // Convert arrow functions in specific problem patterns to regular functions
  // This handles cases like: const handleClick = (e) => { ... }
  sanitized = sanitized.replace(/const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/g, 'function $1($2) {');
  sanitized = sanitized.replace(/let\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/g, 'function $1($2) {');
  
  // Remove any remaining import/export statements
  sanitized = sanitized.replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '');
  sanitized = sanitized.replace(/import\s+['"][^'"]+['"];?\n?/g, '');
  sanitized = sanitized.replace(/export\s+default\s+/g, '');
  sanitized = sanitized.replace(/export\s+\{[^}]*\};?\n?/g, '');
  sanitized = sanitized.replace(/export\s+/g, '');
  
  // Clean up empty lines and extra whitespace
  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return sanitized.trim();
}

/**
 * Extract import statements
 */
function extractImports(code: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Parse HTML code blocks
 */
function parseHTMLBlocks(code: string, result: BundledCode): void {
  // Extract HTML
  const htmlMatch = code.match(/```html\n([\s\S]*?)```/);
  if (htmlMatch) {
    result.html = htmlMatch[1].trim();
  }

  // Extract CSS
  const cssMatch = code.match(/```css\n([\s\S]*?)```/);
  if (cssMatch) {
    result.css = cssMatch[1].trim();
  } else {
    // Look for inline style tags
    const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      result.css = styleMatch[1].trim();
    }
  }

  // Extract JavaScript
  const jsMatch = code.match(/```(?:javascript|js)\n([\s\S]*?)```/);
  if (jsMatch) {
    result.javascript = jsMatch[1].trim();
  } else {
    // Look for inline script tags
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      result.javascript = scriptMatch[1].trim();
    }
  }
}

/**
 * Parse React/JSX code
 */
function parseReactCode(code: string, result: BundledCode): void {
  const blockMatch = code.match(/```(?:jsx|tsx)\n([\s\S]*?)```/);
  const rawCode = blockMatch ? blockMatch[1].trim() : code;

  // Remove imports
  const cleanCode = rawCode.replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '');

  // Extract component
  const componentMatch = cleanCode.match(/(?:export\s+)?(?:default\s+)?function\s+(\w+)\s*\([^)]*\)\s*{([\s\S]*?)return\s*\(([\s\S]*?)\);?\s*}/);
  
  if (componentMatch) {
    const jsx = componentMatch[3].trim();
    result.html = convertJSXToHTML(jsx);
  } else {
    // Try to find JSX in return statement
    const returnMatch = cleanCode.match(/return\s*\(([\s\S]*?)\);?/);
    if (returnMatch) {
      result.html = convertJSXToHTML(returnMatch[1].trim());
    }
  }

  // Extract styles from styled components or inline styles
  const styleMatch = cleanCode.match(/const\s+styles\s*=\s*`([\s\S]*?)`;/);
  if (styleMatch) {
    result.css = styleMatch[1].trim();
  }
}

/**
 * Parse JavaScript/TypeScript code
 */
function parseScriptCode(code: string, result: BundledCode): void {
  const blockMatch = code.match(/```(?:javascript|typescript|js|ts)\n([\s\S]*?)```/);
  const rawCode = blockMatch ? blockMatch[1].trim() : code;

  result.javascript = transpileTypeScript(rawCode);
}

/**
 * Parse raw HTML document
 */
function parseRawHTML(code: string, result: BundledCode): void {
  result.html = code;

  // Extract embedded styles
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    result.css = styleMatch[1].trim();
  }

  // Extract embedded scripts
  const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    result.javascript = scriptMatch[1].trim();
  }
}

/**
 * Convert JSX to HTML
 */
function convertJSXToHTML(jsx: string): string {
  return jsx
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/onClick=/g, 'onclick=')
    .replace(/onChange=/g, 'onchange=')
    .replace(/onSubmit=/g, 'onsubmit=')
    .replace(/\{(['"])(.*?)\1\}/g, '$2') // Remove simple string expressions
    .replace(/\{(\w+)\}/g, '$1') // Replace simple variable expressions
    .replace(/<>/g, '<div>') // Replace fragments
    .replace(/<\/>/g, '</div>');
}

/**
 * Transpile React/TypeScript with Babel
 */
function transpileReactWithBabel(code: string): { javascript: string; html: string; css: string } {
  try {
    // Clean up the code
    let cleanCode = code.trim();

    // Remove ALL import statements (they won't work in iframe anyway)
    cleanCode = cleanCode.replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '');
    cleanCode = cleanCode.replace(/import\s+['"][^'"]+['"];?\n?/g, '');
    
    // Remove ALL export statements BEFORE transpilation
    cleanCode = cleanCode.replace(/export\s+default\s+/g, '');
    cleanCode = cleanCode.replace(/export\s+/g, '');
    
    // Extract component name
    const componentMatch = cleanCode.match(/(?:function|const)\s+(\w+)/);
    const componentName = componentMatch ? componentMatch[1] : 'App';

    // Try to convert to plain HTML/CSS/JS for better compatibility
    const convertedToPlain = convertReactToPlainHTML(cleanCode, componentName);
    if (convertedToPlain.success) {
      console.log('[CodeBundler] Successfully converted React to plain HTML');
      return {
        javascript: convertedToPlain.javascript,
        html: convertedToPlain.html,
        css: convertedToPlain.css,
      };
    }
    
    // Fallback to React rendering if conversion fails
    // Wrap if it's just a component without wrapper
    if (!cleanCode.includes('ReactDOM') && !cleanCode.includes('render')) {
      cleanCode = `
${cleanCode}

// Auto-render component
if (typeof window !== 'undefined' && document.getElementById('root')) {
  const root = document.getElementById('root');
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  
  if (root && ReactDOM && typeof ${componentName} !== 'undefined') {
    ReactDOM.render(React.createElement(${componentName}, null), root);
  }
}
`;
    }

    // Transpile with Babel
    const babelResult = Babel.transform(cleanCode, {
      presets: [
        ['react', { runtime: 'classic' }],
        ['typescript', { isTSX: true, allExtensions: true }]
      ],
      filename: 'component.tsx',
    });

    let transpiledCode = babelResult.code || '';
    
    // Post-process: Remove any remaining export statements that Babel might have left
    transpiledCode = transpiledCode.replace(/export\s+default\s+/g, '');
    transpiledCode = transpiledCode.replace(/export\s+\{[^}]*\};?\n?/g, '');
    transpiledCode = transpiledCode.replace(/export\s+/g, '');

    // Extract CSS from styled-components or template literals if present
    let css = '';
    const cssMatch = cleanCode.match(/const\s+styles?\s*=\s*`([\s\S]*?)`;/);
    if (cssMatch) {
      css = cssMatch[1].trim();
    }

    return {
      javascript: transpiledCode,
      html: '<div id="root"></div>',
      css,
    };
  } catch (error) {
    console.error('Babel transpilation error:', error);
    throw error;
  }
}

/**
 * Convert React component to plain HTML/CSS/JS for better compatibility
 */
function convertReactToPlainHTML(code: string, componentName: string): { 
  success: boolean; 
  html: string; 
  css: string; 
  javascript: string;
} {
  try {
    // Extract JSX from return statement - handle multiple patterns
    let returnMatch = code.match(/return\s*\(([\s\S]*?)\);?\s*}[^}]*$/);
    if (!returnMatch) {
      // Try simpler pattern for single-line returns
      returnMatch = code.match(/return\s*\(([\s\S]+)\)/);
    }
    if (!returnMatch) {
      // Try to find any JSX-like content
      returnMatch = code.match(/<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z]+>/);
      if (returnMatch) {
        returnMatch = [code, returnMatch[0]];
      }
    }
    if (!returnMatch) {
      return { success: false, html: '', css: '', javascript: '' };
    }

    const jsx = returnMatch[1].trim();
    
    // Convert JSX to HTML with comprehensive transformations
    let html = convertJSXToVanillaHTML(jsx);

    // Extract state and effects to create plain JS
    const stateMatches = code.matchAll(/useState<[^>]+>\(([^)]+)\)|useState\(([^)]+)\)/g);
    const states = Array.from(stateMatches).map((match, i) => ({
      name: `state${i}`,
      initial: match[1] || match[2] || '""'
    }));

    // Extract inline styles and Tailwind classes for CSS extraction
    let css = '';
    const styleMatch = code.match(/const\s+styles?\s*=\s*`([\s\S]*?)`;/);
    if (styleMatch) {
      css = styleMatch[1].trim();
    }

    // Create plain JavaScript - ensure it's valid vanilla JS
    let javascript = '';
    if (states.length > 0) {
      javascript = states.map(s => `var ${s.name} = ${s.initial};`).join('\n');
    }

    // Extract event handlers and convert arrow functions to regular functions
    const handlerMatches = code.matchAll(/const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>\s*\{([^}]*)\}/g);
    for (const match of handlerMatches) {
      const handlerName = match[1];
      const handlerBody = match[2].trim();
      // Convert to vanilla function
      javascript += `\nfunction ${handlerName}() {\n  ${handlerBody}\n}`;
    }

    // Replace React-specific template expressions with IDs for manipulation
    let idCounter = 0;
    html = html.replace(/\{(\w+)\}/g, (match, varName) => {
      const id = `dynamic-${idCounter++}`;
      javascript += `\nif (document.getElementById('${id}')) { document.getElementById('${id}').textContent = (typeof ${varName} !== 'undefined' ? ${varName} : ''); }`;
      return `<span id="${id}"></span>`;
    });

    // Clean up any remaining JSX expressions
    html = cleanRemainingJSXExpressions(html);

    return {
      success: true,
      html,
      css,
      javascript: javascript ? `(function() {\n${javascript}\n})();` : ''
    };
  } catch (error) {
    console.warn('Plain HTML conversion failed:', error);
    return { success: false, html: '', css: '', javascript: '' };
  }
}

/**
 * Convert JSX to vanilla HTML with comprehensive transformations
 */
function convertJSXToVanillaHTML(jsx: string): string {
  let html = jsx
    // React attribute to HTML attribute conversions
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/onClick=/g, 'onclick=')
    .replace(/onChange=/g, 'onchange=')
    .replace(/onSubmit=/g, 'onsubmit=')
    .replace(/onInput=/g, 'oninput=')
    .replace(/onFocus=/g, 'onfocus=')
    .replace(/onBlur=/g, 'onblur=')
    .replace(/onKeyDown=/g, 'onkeydown=')
    .replace(/onKeyUp=/g, 'onkeyup=')
    .replace(/onMouseOver=/g, 'onmouseover=')
    .replace(/onMouseOut=/g, 'onmouseout=')
    .replace(/onMouseEnter=/g, 'onmouseenter=')
    .replace(/onMouseLeave=/g, 'onmouseleave=')
    .replace(/tabIndex=/g, 'tabindex=')
    .replace(/autoComplete=/g, 'autocomplete=')
    .replace(/autoFocus/g, 'autofocus')
    .replace(/readOnly/g, 'readonly')
    .replace(/maxLength=/g, 'maxlength=')
    .replace(/minLength=/g, 'minlength=')
    // Handle fragments
    .replace(/<>/g, '<div>')
    .replace(/<\/>/g, '</div>')
    .replace(/<React\.Fragment>/g, '<div>')
    .replace(/<\/React\.Fragment>/g, '</div>')
    // Handle simple string expressions in attributes
    .replace(/\{['"]([^'"]+)['"]\}/g, '$1')
    // Handle template literals in attributes
    .replace(/\{`([^`]+)`\}/g, '$1')
    // Handle boolean attributes
    .replace(/=\{true\}/g, '')
    .replace(/=\{false\}/g, '=""')
    // Handle numeric attributes
    .replace(/=\{(\d+)\}/g, '="$1"')
    // Handle inline styles object (simplified)
    .replace(/style=\{\{([^}]+)\}\}/g, (match, styleObj) => {
      const cssStyle = styleObj
        .replace(/(['"]?)(\w+)\1:\s*(['"]?)([^,'"]+)\3/g, (m: string, q1: string, prop: string, q2: string, val: string) => {
          const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${cssProp}: ${val}`;
        })
        .replace(/,\s*/g, '; ');
      return `style="${cssStyle}"`;
    });

  return html;
}

/**
 * Clean remaining JSX expressions that couldn't be converted
 */
function cleanRemainingJSXExpressions(html: string): string {
  // Remove arrow function expressions from event handlers
  html = html.replace(/=\{[^}]*=>[^}]*\}/g, '=""');
  
  // Remove complex object expressions
  html = html.replace(/=\{\{[^}]+\}\}/g, '=""');
  
  // Remove function call expressions
  html = html.replace(/=\{[a-zA-Z_$][\w$]*\([^)]*\)\}/g, '=""');
  
  // Remove remaining variable expressions in attributes (convert to empty)
  html = html.replace(/=\{[a-zA-Z_$][\w$]*\}/g, '=""');
  
  // Remove TypeScript type annotations that might remain
  html = html.replace(/:\s*[A-Z][a-zA-Z]*(?:<[^>]+>)?/g, '');
  
  // Clean up dangling expressions in text content (wrap in spans)
  html = html.replace(/>\{([^}]+)\}</g, '><span data-bind="$1"></span><');
  
  return html;
}

/**
 * Basic TypeScript to JavaScript transpilation
 */
function transpileTypeScript(code: string): string {
  // Try Babel first for better compatibility
  try {
    // Remove imports and exports BEFORE Babel
    const cleanCode = code
      .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '')
      .replace(/import\s+['"][^'"]+['"];?\n?/g, '')
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+/g, '');

    const result = Babel.transform(cleanCode, {
      presets: [
        ['typescript', { allExtensions: true }]
      ],
      filename: 'code.ts',
    });
    
    let transpiledCode = result.code || cleanCode;
    
    // Post-process: Remove any remaining exports
    transpiledCode = transpiledCode.replace(/export\s+default\s+/g, '');
    transpiledCode = transpiledCode.replace(/export\s+\{[^}]*\};?\n?/g, '');
    transpiledCode = transpiledCode.replace(/export\s+/g, '');
    
    return transpiledCode;
  } catch (error) {
    console.warn('Babel transpilation failed, using fallback:', error);
    // Fallback to regex-based transpilation
    let js = code
      .replace(/:\s*[\w<>[\]|&]+(\s*[=,;)])/g, '$1') // Remove type annotations
      .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '') // Remove type aliases
      .replace(/<[\w<>[\]|&, ]+>/g, '') // Remove generic type parameters
      .replace(/as\s+[\w<>[\]|&]+/g, '') // Remove type assertions
      .replace(/!\./, '.') // Remove non-null assertions
      .replace(/\?\./g, '?.'); // Keep optional chaining

    // Remove import statements
    js = js.replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '');
    js = js.replace(/import\s+['"][^'"]+['"];?\n?/g, '');

    // Remove ALL export statements
    js = js.replace(/export\s+default\s+/g, '');
    js = js.replace(/export\s+\{[^}]*\};?\n?/g, '');
    js = js.replace(/export\s+/g, '');

    return js.trim();
  }
}

/**
 * Resolve asset paths
 */
export function resolveAssetPath(path: string): string {
  // Handle relative paths
  if (path.startsWith('./') || path.startsWith('../')) {
    return path;
  }

  // Handle absolute paths
  if (path.startsWith('/')) {
    return path;
  }

  // Handle URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Handle data URLs
  if (path.startsWith('data:')) {
    return path;
  }

  // Default: treat as relative
  return './' + path;
}

/**
 * Extract image sources from code
 */
export function extractImageSources(code: string): string[] {
  const images: string[] = [];
  
  // HTML img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(code)) !== null) {
    images.push(match[1]);
  }

  // CSS background images
  const bgRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(code)) !== null) {
    images.push(match[1]);
  }

  // JSX image imports
  const jsxImgRegex = /import\s+\w+\s+from\s+["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["']/gi;
  while ((match = jsxImgRegex.exec(code)) !== null) {
    images.push(match[1]);
  }

  return images;
}
