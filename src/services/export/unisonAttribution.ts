export const UNISON_ATTRIBUTION_ASSET = 'unison-powered-by-unison.js';
export const UNISON_ATTRIBUTION_MARKER = 'Powered by Unison';

export const UNISON_ATTRIBUTION_SCRIPT = `(() => {
  if (document.getElementById('unison-powered-by')) return;
  const link = document.createElement('a');
  link.id = 'unison-powered-by';
  link.href = 'https://unisontasks.com';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = '${UNISON_ATTRIBUTION_MARKER}';
  link.setAttribute('aria-label', '${UNISON_ATTRIBUTION_MARKER}');
  link.style.cssText = 'display:block;padding:14px 16px;text-align:center;font:500 12px/1.4 system-ui,sans-serif;color:#64748b;background:#f8fafc;text-decoration:none;';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(link), { once: true });
})();
`;

export function injectPoweredByUnisonScript(indexHtml: string): string {
  if (indexHtml.includes(UNISON_ATTRIBUTION_ASSET) || indexHtml.includes(UNISON_ATTRIBUTION_MARKER)) {
    return indexHtml;
  }
  const script = `<script defer src="/${UNISON_ATTRIBUTION_ASSET}"></script>`;
  return /<\/body>/i.test(indexHtml)
    ? indexHtml.replace(/<\/body>/i, `${script}</body>`)
    : `${indexHtml}\n${script}\n`;
}

export function withPoweredByUnisonAttribution(files: Record<string, string>): Record<string, string> {
  const next = { ...files };
  const indexPath = Object.keys(next).find((path) => path.replace(/^\//, '') === 'index.html');
  if (indexPath) next[indexPath] = injectPoweredByUnisonScript(next[indexPath]);
  const assetPath = indexPath?.startsWith('/') ? `/${UNISON_ATTRIBUTION_ASSET}` : UNISON_ATTRIBUTION_ASSET;
  next[assetPath] = UNISON_ATTRIBUTION_SCRIPT;
  return next;
}