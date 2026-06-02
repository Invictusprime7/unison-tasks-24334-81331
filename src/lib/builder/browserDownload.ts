/**
 * browserDownload — tiny DOM helpers for client-side file downloads and
 * the Fullscreen API. Extracted from WebBuilder.tsx in Phase C3 Slice 9.
 *
 * Keeps the imperative DOM glue (Blob → object URL → anchor click) and
 * Fullscreen request/exit logic out of the React component so callers
 * stay focused on state.
 */

/**
 * Trigger a browser download of `contents` as `filename` with the given
 * MIME type. Cleans up the temporary anchor + object URL.
 */
export function downloadBlob(
  contents: BlobPart,
  filename: string,
  mimeType: string,
): void {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Convenience: download a JSON-serialisable value as a pretty-printed file. */
export function downloadJSON(value: unknown, filename: string): void {
  downloadBlob(JSON.stringify(value, null, 2), filename, 'application/json');
}

export interface ToggleFullscreenResult {
  isFullscreen: boolean;
  error?: unknown;
}

/**
 * Request or exit fullscreen on the given element. Returns the new
 * fullscreen state so the caller can sync React state. Throws are
 * caught and surfaced via `error`.
 */
export async function toggleElementFullscreen(
  element: HTMLElement | null,
): Promise<ToggleFullscreenResult> {
  if (!element) return { isFullscreen: !!document.fullscreenElement };
  try {
    if (!document.fullscreenElement) {
      await element.requestFullscreen();
      return { isFullscreen: true };
    }
    await document.exitFullscreen();
    return { isFullscreen: false };
  } catch (error) {
    return { isFullscreen: !!document.fullscreenElement, error };
  }
}
