/**
 * Produces a stable content signature for route-state VFS handoffs.
 * Path-only checks miss a newer snapshot when it updates existing files.
 */
export function createVfsHandoffSignature(files: Record<string, string> | null | undefined): string | null {
  if (!files) return null;

  let hash = 2166136261;
  const update = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  };

  for (const path of Object.keys(files).sort()) {
    update(path);
    update(files[path] || '');
  }

  return `${Object.keys(files).length}:${(hash >>> 0).toString(36)}`;
}