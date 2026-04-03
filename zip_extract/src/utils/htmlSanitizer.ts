import DOMPurify from 'dompurify';

/**
 * HTML sanitization utilities using DOMPurify
 */

export interface SanitizeOptions {
  allowStyles?: boolean;
  allowScripts?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}

export function sanitizeHTML(html: string, options: SanitizeOptions = {}): string {
  const config = {
    ALLOWED_TAGS: options.allowedTags || [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img', 'ul', 'ol', 'li', 'strong', 'em', 'u', 'br',
      'section', 'article', 'header', 'footer', 'nav', 'main',
      'button', 'input', 'label', 'form', 'textarea', 'select', 'option'
    ],
    ALLOWED_ATTR: options.allowedAttributes || {
      '*': ['class', 'id', 'style', 'data-*'],
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'input': ['type', 'name', 'value', 'placeholder'],
      'button': ['type'],
    } as any,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: options.allowScripts ? [] : ['script', 'iframe', 'embed', 'object'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  };

  if (!options.allowStyles) {
    config.FORBID_ATTR = [...(config.FORBID_ATTR || []), 'style'];
  }

  return DOMPurify.sanitize(html, config) as string;
}

export function sanitizeCSS(css: string): string {
  // Remove potentially dangerous CSS
  return css
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/import\s+/gi, '')
    .replace(/@import/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding/gi, '');
}

export function createSecureHTML(html: string, css?: string): string {
  const sanitizedHTML = sanitizeHTML(html, { allowStyles: true });
  const sanitizedCSS = css ? sanitizeCSS(css) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self';">
  <title>Preview</title>
  ${sanitizedCSS ? `<style>${sanitizedCSS}</style>` : ''}
</head>
<body>
  ${sanitizedHTML}
</body>
</html>`;
}
