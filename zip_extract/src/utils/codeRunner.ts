/**
 * Code Runner Utility
 * Bundles and executes HTML/CSS/JS code in an iframe safely
 */

export interface CodeBundle {
  html: string;
  css: string;
  javascript: string;
}

/**
 * Extract HTML, CSS, and JS from mixed code
 */
export function parseCodeBlock(code: string): CodeBundle {
  const bundle: CodeBundle = {
    html: '',
    css: '',
    javascript: '',
  };

  // Check if it's a React component
  if (code.includes('export') || code.includes('import React')) {
    // Convert React component to HTML
    bundle.html = convertReactToHTML(code);
    return bundle;
  }

  // Extract HTML
  const htmlMatch = code.match(/```html\n([\s\S]*?)```/);
  if (htmlMatch) {
    bundle.html = htmlMatch[1].trim();
  } else if (code.includes('<') && code.includes('>')) {
    // Assume it's HTML if it contains tags
    bundle.html = code.trim();
  }

  // Extract CSS
  const cssMatch = code.match(/```css\n([\s\S]*?)```/);
  if (cssMatch) {
    bundle.css = cssMatch[1].trim();
  } else {
    // Try to find style tags
    const styleMatch = code.match(/<style>([\s\S]*?)<\/style>/);
    if (styleMatch) {
      bundle.css = styleMatch[1].trim();
    }
  }

  // Extract JavaScript
  const jsMatch = code.match(/```(?:javascript|js)\n([\s\S]*?)```/);
  if (jsMatch) {
    bundle.javascript = jsMatch[1].trim();
  } else {
    // Try to find script tags
    const scriptMatch = code.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      bundle.javascript = scriptMatch[1].trim();
    }
  }

  return bundle;
}

/**
 * Convert basic React component to HTML
 */
function convertReactToHTML(reactCode: string): string {
  // Simple conversion - extract JSX and convert to HTML
  const jsxMatch = reactCode.match(/return\s*\(([\s\S]*?)\);/);
  if (!jsxMatch) {
    return '<div>Unable to convert React component</div>';
  }

  let html = jsxMatch[1].trim();
  
  // Remove React-specific syntax
  html = html
    .replace(/className=/g, 'class=')
    .replace(/onClick=/g, 'onclick=')
    .replace(/\{[^}]*\}/g, ''); // Remove JSX expressions
  
  return html;
}

/**
 * Create a complete HTML document from code bundle
 */
export function createHTMLDocument(bundle: CodeBundle): string {
  const { html, css, javascript } = bundle;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Preview</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
          }
        }
      }
    }
  </script>
  <!-- React & ReactDOM from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: #ffffff;
    }
    #root {
      width: 100%;
      min-height: 100vh;
    }
    ${css}
  </style>
</head>
<body>
  <div id="root">${html}</div>
  
  <script>
    // Error handling
    window.addEventListener('error', (event) => {
      console.error('Preview error:', event.error);
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ef4444; color: white; padding: 12px 16px; border-radius: 8px; font-size: 14px; z-index: 9999; max-width: 300px;';
      errorDiv.textContent = 'Error: ' + event.error.message;
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000);
    });
    
    (function() {
      ${javascript}
    })();
  </script>
</body>
</html>`;
}

/**
 * Create blob URL for iframe
 */
export function createPreviewURL(code: string): string {
  const bundle = parseCodeBlock(code);
  const html = createHTMLDocument(bundle);
  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

/**
 * Cleanup blob URL
 */
export function revokePreviewURL(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if code is previewable
 */
export function isPreviewableCode(code: string): boolean {
  return (
    code.includes('<') || 
    code.includes('html') || 
    code.includes('css') ||
    code.includes('React') ||
    code.includes('export')
  );
}
