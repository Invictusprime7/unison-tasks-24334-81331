const STORAGE_PREFIX = 'unison:external-preview:';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface ExternalPreviewSession {
  files: Record<string, string>;
  title: string;
  createdAt: number;
}

const getStorageKey = (previewKey: string) => `${STORAGE_PREFIX}${previewKey}`;

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException
    && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

/** Drop every stored session, expired or not — they're all ephemeral/recreatable. */
function clearAllExternalPreviewSessions(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) localStorage.removeItem(key);
}

export function createExternalPreviewSession(
  files: Record<string, string>,
  title: string,
): string {
  const previewKey = crypto.randomUUID();
  const session: ExternalPreviewSession = {
    files,
    title,
    createdAt: Date.now(),
  };
  const serialized = JSON.stringify(session);

  try {
    localStorage.setItem(getStorageKey(previewKey), serialized);
    return previewKey;
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;
  }

  // Full generated sites (all pages + UI foundation modules) can exceed
  // localStorage's ~5-10MB quota on their own, but stale prior sessions
  // (up to a 24h TTL) are a common contributor. Free that space and retry
  // once before giving callers a clear, catchable failure instead of an
  // uncaught DOMException.
  clearAllExternalPreviewSessions();
  try {
    localStorage.setItem(getStorageKey(previewKey), serialized);
    return previewKey;
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;
    throw new Error('This site is too large to open in a new preview tab (browser storage limit). Preview it from the Web Builder instead.');
  }
}

export function readExternalPreviewSession(previewKey: string): ExternalPreviewSession | null {
  const storageKey = getStorageKey(previewKey);
  const serializedSession = localStorage.getItem(storageKey);
  if (!serializedSession) return null;

  try {
    const session = JSON.parse(serializedSession) as ExternalPreviewSession;
    if (
      !session
      || typeof session.createdAt !== 'number'
      || typeof session.title !== 'string'
      || typeof session.files !== 'object'
      || session.files === null
      || Date.now() - session.createdAt > SESSION_TTL_MS
    ) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}