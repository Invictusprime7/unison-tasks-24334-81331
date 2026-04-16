import DOMPurify from 'dompurify';

/**
 * HTML sanitization utilities using DOMPurify
 * 
 * Defense-in-depth against XSS, injection, and malicious content.
 * All user-generated or AI-generated HTML MUST pass through these utilities.
 */

export interface SanitizeOptions {
  allowStyles?: boolean;
  allowScripts?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  /** Max allowed HTML string length (default: 500KB) */
  maxLength?: number;
}

/** All event handler attributes to block — comprehensive list */
const FORBIDDEN_ATTRS = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
  'onmouseenter', 'onmouseleave', 'onmousedown', 'onmouseup',
  'onfocus', 'onblur', 'onsubmit', 'onreset', 'onchange',
  'oninput', 'onkeydown', 'onkeyup', 'onkeypress',
  'ondragstart', 'ondrop', 'onpaste', 'oncopy', 'oncut',
  'onscroll', 'onresize', 'onanimationend', 'ontransitionend',
  'onpointerdown', 'onpointerup', 'ontouchstart', 'ontouchend',
  'oncontextmenu', 'onwheel', 'onautoplay', 'onplay',
  'onloadstart', 'onloadend', 'onabort', 'onstalled',
  'formaction', 'xlink:href',
];

export function sanitizeHTML(html: string, options: SanitizeOptions = {}): string {
  // Guard against oversized payloads
  const maxLen = options.maxLength ?? 512_000;
  if (html.length > maxLen) {
    console.warn(`[htmlSanitizer] Input truncated from ${html.length} to ${maxLen} chars`);
    html = html.slice(0, maxLen);
  }

  const config: Parameters<typeof DOMPurify.sanitize>[1] = {
    ALLOWED_TAGS: options.allowedTags || [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img', 'ul', 'ol', 'li', 'strong', 'em', 'u', 'br', 'hr',
      'section', 'article', 'header', 'footer', 'nav', 'main',
      'button', 'input', 'label', 'form', 'textarea', 'select', 'option',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'figure', 'figcaption', 'blockquote', 'pre', 'code',
      'video', 'audio', 'source', 'picture', 'svg', 'path',
    ],
    ALLOWED_ATTR: options.allowedAttributes ? Object.values(options.allowedAttributes).flat() : [
      'class', 'id', 'data-*',
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height', 'loading',
      'type', 'name', 'value', 'placeholder', 'required', 'disabled',
      'aria-label', 'aria-hidden', 'aria-expanded', 'role',
      'viewBox', 'd', 'fill', 'stroke', 'stroke-width',
    ],
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: options.allowScripts ? [] : [
      'script', 'iframe', 'embed', 'object', 'applet',
      'base', 'link', 'meta', 'noscript', 'template',
    ],
    FORBID_ATTR: FORBIDDEN_ATTRS,
    ADD_ATTR: options.allowStyles ? ['style'] : [],
    // Force safe link attributes
    ADD_TAGS: [],
  };

  // Hook: force rel="noopener noreferrer" on all links with target
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      // Block javascript: and data: URIs in links
      if (/^(javascript|data|vbscript):/i.test(href.trim())) {
        node.removeAttribute('href');
        node.setAttribute('href', '#');
      }
      if (node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    // Block dangerous src values on images
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (/^(javascript|data:text\/html|vbscript):/i.test(src.trim())) {
        node.removeAttribute('src');
      }
    }
  });

  const result = DOMPurify.sanitize(html, config) as unknown as string;

  // Remove hooks after use to avoid stacking
  DOMPurify.removeAllHooks();

  return result;
}

export function sanitizeCSS(css: string): string {
  // Guard against oversized CSS
  if (css.length > 256_000) {
    console.warn(`[htmlSanitizer] CSS truncated from ${css.length} to 256000 chars`);
    css = css.slice(0, 256_000);
  }

  return css
    // Block dangerous CSS patterns
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/@import\s+/gi, '')
    .replace(/@import\s*url/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .replace(/-webkit-binding\s*:/gi, '')
    .replace(/url\s*\(\s*['"]?\s*javascript:/gi, 'url(')
    .replace(/url\s*\(\s*['"]?\s*data:text\/html/gi, 'url(')
    // Block CSS-based data exfiltration
    .replace(/url\s*\(\s*['"]?\s*https?:\/\/(?!fonts\.googleapis|fonts\.gstatic|cdn\.)/gi, 'url(');
}

export function createSecureHTML(html: string, css?: string): string {
  const sanitizedHTML = sanitizeHTML(html, { allowStyles: true });
  const sanitizedCSS = css ? sanitizeCSS(css) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <title>Preview</title>
  ${sanitizedCSS ? `<style>${sanitizedCSS}</style>` : ''}
</head>
<body>
  ${sanitizedHTML}
</body>
</html>`;
}
