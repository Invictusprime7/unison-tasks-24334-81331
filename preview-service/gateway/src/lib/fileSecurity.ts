import path from 'path';

const MAX_FILE_PATH_LENGTH = 240;
const MAX_FILE_CONTENT_BYTES = 1_000_000;

export function normalizePreviewFilePath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_FILE_PATH_LENGTH) {
    return null;
  }

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return null;
  }

  const slashNormalized = trimmed.replace(/\\/g, '/');
  const withoutLeadingSlash = slashNormalized.replace(/^\/+/, '');
  if (!withoutLeadingSlash) {
    return null;
  }

  const normalized = path.posix.normalize(withoutLeadingSlash);
  if (
    !normalized ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.endsWith('/..') ||
    path.posix.isAbsolute(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function assertPreviewFileContent(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('File content must be a string');
  }

  if (Buffer.byteLength(value, 'utf8') > MAX_FILE_CONTENT_BYTES) {
    throw new Error('File content exceeds maximum allowed size');
  }
}

export function resolveSessionPath(baseDir: string, filePath: string): string {
  const normalized = normalizePreviewFilePath(filePath);
  if (!normalized) {
    throw new Error('Invalid file path');
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedFile = path.resolve(resolvedBase, normalized);
  const relative = path.relative(resolvedBase, resolvedFile);

  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error('File path escapes session workspace');
  }

  return resolvedFile;
}
