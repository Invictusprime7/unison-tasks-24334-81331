const STORAGE_PREFIX = 'unison:external-preview:';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface ExternalPreviewSession {
  files: Record<string, string>;
  title: string;
  createdAt: number;
}

const getStorageKey = (previewKey: string) => `${STORAGE_PREFIX}${previewKey}`;

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

  localStorage.setItem(getStorageKey(previewKey), JSON.stringify(session));
  return previewKey;
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