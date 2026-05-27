const BLOCKED_PROTOCOLS = new Set(['blob:', 'file:', 'data:', 'javascript:']);

export function safeOpenExternal(rawUrl: string, target: '_blank' | '_self' = '_blank'): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  try {
    const url = new URL(rawUrl, window.location.origin);
    if (BLOCKED_PROTOCOLS.has(url.protocol)) return false;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    window.open(url.toString(), target, 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
