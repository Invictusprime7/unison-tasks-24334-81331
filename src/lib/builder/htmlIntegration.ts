/**
 * Pure HTML document helpers — merge CSS / JS into single-file HTML strings
 * regardless of whether the input is a fragment or a full document.
 *
 * Extracted from WebBuilder.tsx (Phase C3). No React deps.
 */

/** Inject a <style> tag for the given CSS into an HTML string. */
export function integrateCSSIntoHTML(html: string, css: string): string {
  if (!css || !css.trim()) return html;

  const styleTag = `<style>\n${css}\n</style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  }
  if (html.includes('<html') || html.includes('<!DOCTYPE')) {
    if (html.includes('<body')) {
      return html.replace('<body', `<head>${styleTag}</head>\n<body`);
    }
    return html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${styleTag}</head>`);
  }
  // Fragment — wrap in a full document with Tailwind CDN + CSS.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  ${styleTag}
</head>
<body>
${html}
</body>
</html>`;
}

/** Inject a <script> tag for the given JS into an HTML string (before </body> when possible). */
export function integrateJSIntoHTML(html: string, js: string): string {
  if (!js || !js.trim()) return html;
  // Skip if the script body already appears verbatim (avoids double-injection on rehydrate).
  if (html.includes(js.substring(0, 50))) return html;
  const scriptTag = `<script>\n${js}\n</script>`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${scriptTag}\n</body>`);
  }
  return `${html}\n${scriptTag}`;
}

/** Merge separate css/js blobs into a single HTML document, skipping no-op cases. */
export function mergeCanvasAssets(opts: {
  html: string;
  css?: string;
  js?: string;
}): string {
  let out = opts.html;
  if (opts.css && !out.includes(opts.css.substring(0, 50))) {
    out = integrateCSSIntoHTML(out, opts.css);
  }
  if (opts.js) {
    out = integrateJSIntoHTML(out, opts.js);
  }
  return out;
}
