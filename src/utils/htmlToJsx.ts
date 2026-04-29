/**
 * HTML → JSX Converter
 *
 * Converts raw HTML strings into valid React/TSX component code
 * WITHOUT using dangerouslySetInnerHTML. Performs attribute conversion,
 * self-closing tag fixups, and style string → object transforms.
 */

// ============================================================================
// Attribute mapping
// ============================================================================

const ATTR_MAP: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  maxlength: 'maxLength',
  minlength: 'minLength',
  readonly: 'readOnly',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  crossorigin: 'crossOrigin',
  enctype: 'encType',
  formaction: 'formAction',
  formmethod: 'formMethod',
  formtarget: 'formTarget',
  novalidate: 'noValidate',
  accesskey: 'accessKey',
  contenteditable: 'contentEditable',
  contextmenu: 'contextMenu',
  datetime: 'dateTime',
  frameborder: 'frameBorder',
  hreflang: 'hrefLang',
  inputmode: 'inputMode',
  srcdoc: 'srcDoc',
  srcset: 'srcSet',
  usemap: 'useMap',
  // Event handlers
  onclick: 'onClick',
  onchange: 'onChange',
  onsubmit: 'onSubmit',
  onfocus: 'onFocus',
  onblur: 'onBlur',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onmouseover: 'onMouseOver',
  onmouseout: 'onMouseOut',
  onload: 'onLoad',
  onerror: 'onError',
};

/** Tags that must be self-closing in JSX */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// ============================================================================
// Style string → object conversion
// ============================================================================

function styleStringToObject(styleStr: string): string {
  const pairs = styleStr
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const colonIdx = s.indexOf(':');
      if (colonIdx < 0) return null;
      const prop = s.slice(0, colonIdx).trim();
      const val = s.slice(colonIdx + 1).trim();
      if (!prop || !val) return null;
      // Convert kebab-case to camelCase
      const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      // Keep numeric-like values as numbers
      const isNumeric = /^\d+(\.\d+)?$/.test(val);
      return `${camelProp}: ${isNumeric ? val : JSON.stringify(val)}`;
    })
    .filter(Boolean);
  return `{ ${pairs.join(', ')} }`;
}

// ============================================================================
// Core converter
// ============================================================================

/**
 * Convert an HTML attribute string (e.g. `class=\"foo\" style=\"color:red\"`)
 * into JSX-compatible attributes.
 */
function convertAttributes(attrString: string): string {
  if (!attrString || !attrString.trim()) return attrString;

  let result = attrString;

  // Convert style=\"...\" to style={{...}}
  result = result.replace(/\bstyle=\"([^\"]*)\"/g, (_, styleStr) => {
    return `style={${styleStringToObject(styleStr)}}`;
  });

  // Convert mapped attributes
  for (const [html, jsx] of Object.entries(ATTR_MAP)) {
    // Avoid double-converting (e.g. if className already present)
    const regex = new RegExp(`\\b${html}=`, 'g');
    result = result.replace(regex, `${jsx}=`);
  }

  return result;
}

/**
 * Convert raw HTML content into valid JSX.
 * Does NOT wrap in a component — returns just the JSX markup.
 */
export function htmlToJsx(html: string): string {
  let jsx = html;

  // 1. Convert HTML comments to JSX comments
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

  // 2. Convert attributes on all tags
  jsx = jsx.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)(\s*\/?\s*)>/g, (full, tag, attrs, close) => {
    const converted = convertAttributes(attrs);
    const tagLower = tag.toLowerCase();
    // Fix void elements that aren't self-closed
    if (VOID_ELEMENTS.has(tagLower) && !close.includes('/')) {
      return `<${tag}${converted} />`;
    }
    return `<${tag}${converted}${close}>`;
  });

  // 3. Remove closing tags for void elements (e.g. </br>, </img>)
  for (const voidEl of VOID_ELEMENTS) {
    const re = new RegExp(`</${voidEl}>`, 'gi');
    jsx = jsx.replace(re, '');
  }

  return jsx;
}

// ============================================================================
// Document → Component converter
// ============================================================================

/**
 * Extract body content from a full HTML document.
 */
function extractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  // Strip head if present
  const headless = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '');
  return headless.trim();
}

/**
 * Extract <style> blocks from HTML.
 */
function extractStyles(html: string): string[] {
  const blocks: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1].trim()) blocks.push(m[1].trim());
  }
  return blocks;
}

/**
 * Strips <script> tags entirely (they won't work in React components anyway).
 */
function stripScripts(html: string): string {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

/**
 * Detect if content is a full HTML document (not a React/TSX component).
 * Guards against false positives from TSX code that mentions HTML tags in
 * comments, strings, or JSX expressions.
 */
export function isHtmlDocument(code: string): boolean {
  const t = code.trim();
  // If it starts with an import/export or function declaration, it's TSX
  if (/^(import |export |const |function |\/\*\*|\/\/)/.test(t)) return false;
  return t.startsWith('<!DOCTYPE') ||
    t.startsWith('<html') ||
    (t.includes('<head') && t.includes('<body'));
}

/**
 * Convert a full HTML document (or fragment) into a React/TSX component
 * and extracted CSS. No DOM injection — CSS goes to a separate file.
 */
export function htmlDocToReactComponentWithCSS(html: string, componentName = 'App'): { code: string; css: string } {
  const styles = extractStyles(html);
  const bodyRaw = extractBody(stripScripts(html));
  const bodyClean = bodyRaw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  const jsxBody = htmlToJsx(bodyClean);

  const css = styles.length > 0 ? styles.join('\n\n') : '';

  const lines: string[] = [];
  lines.push(`import React from 'react';`);
  if (css) {
    lines.push(`import './template.css';`);
  }
  lines.push('');
  lines.push(`export default function ${componentName}() {`);
  lines.push(`  return (`);
  lines.push(`    <div className="min-h-screen">`);
  lines.push(`      ${jsxBody}`);
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);

  return { code: lines.join('\n'), css };
}

/**
 * Convert a full HTML document (or fragment) into a complete React/TSX
 * component string. Backward-compatible wrapper — embeds CSS via import.
 */
export function htmlDocToReactComponent(html: string, componentName = 'App'): string {
  return htmlDocToReactComponentWithCSS(html, componentName).code;
}

/**
 * Inline version for edge functions (same logic, standalone).
 * Returns the component source string.
 */
export function htmlToReactComponentString(html: string): string {
  return htmlDocToReactComponent(html, 'App');
}
