/**
 * Pure VFS helpers for WebBuilder.
 * Extracted from WebBuilder.tsx (Phase C3). No React deps.
 */
import { resolveLauncherEntryPoint } from '@/utils/launcherPayload';

/**
 * Pick the editor's active entry path from a file map.
 * Prefers `preferredPath`, then the resolved launcher entry point, then a
 * sensible fallback (page files > non-entry TSX > any TSX > index.html > first).
 */
export function selectEditableEntryPath(
  files: Record<string, string>,
  preferredPath?: string | null,
  launchEntryPoint?: string,
): string | null {
  if (preferredPath && files[preferredPath]) {
    return preferredPath;
  }

  const resolvedEntryPath = resolveLauncherEntryPoint(
    files,
    preferredPath || launchEntryPoint,
  );
  if (resolvedEntryPath && files[resolvedEntryPath]) {
    return resolvedEntryPath;
  }

  return (
    Object.keys(files).find((path) => /\/pages\/.+\.(tsx|jsx)$/.test(path)) ||
    Object.keys(files).find(
      (path) => /\.(tsx|jsx)$/.test(path) && !/\/(main|index)\.(tsx|jsx)$/.test(path),
    ) ||
    Object.keys(files).find((path) => /\.(tsx|jsx)$/.test(path)) ||
    (files['/index.html'] ? '/index.html' : null) ||
    Object.keys(files)[0] ||
    null
  );
}

/**
 * Cheap stable signature of a VFS file map for change detection.
 * Hashes `path + length + last-32-char tail` per file in sorted-key order.
 */
export function computeVfsSignature(files: Record<string, string>): string {
  const keys = Object.keys(files).sort();
  if (keys.length === 0) return '';
  let hash = 0;
  for (const k of keys) {
    const v = files[k] ?? '';
    const tail = v.length > 32 ? v.slice(-32) : v;
    const seg = `${k}:${v.length}:${tail}|`;
    for (let i = 0; i < seg.length; i++) {
      hash = ((hash << 5) - hash + seg.charCodeAt(i)) | 0;
    }
  }
  return `${keys.length}:${hash}`;
}
