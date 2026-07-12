/**
 * catalogHydrationModule — VFS-injected runtime hook.
 *
 * Emits `/src/components/catalogHydration.ts` into every generated site so
 * pages can request live catalog rows from the Builder host via postMessage.
 *
 * The host (VFSPreview) listens for `CATALOG_HYDRATE_REQUEST`, calls
 * `resolveHydrationRequest` in `@/services/catalogRuntime`, and posts back a
 * `CATALOG_HYDRATE_RESPONSE` with the projected rows.
 */

export const CATALOG_HYDRATION_PATH = '/src/components/catalogHydration.ts';

export const CATALOG_HYDRATION_MODULE = `import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Shape returned to callers
// ─────────────────────────────────────────────────────────────────────────────
export type SectionHydrationState = {
  loading: boolean;
  rows: any[] | null;
  fallback: 'ok' | 'empty_state' | 'hide_section' | 'show_placeholder' | null;
  error: string | null;
};

let __seq = 0;
const nextId = () => \`h_\${Date.now().toString(36)}_\${(++__seq).toString(36)}\`;

/**
 * Request live catalog rows for a generated section. Falls back gracefully
 * when there is no parent (published/standalone) or when the host has no
 * binding — callers should retain their static \`items\` prop as the seed.
 */
export function useSectionData(
  sectionId: string,
  sectionType?: string,
  occurrenceIndex?: number,
): SectionHydrationState {
  const [state, setState] = useState<SectionHydrationState>({
    loading: true,
    rows: null,
    fallback: null,
    error: null,
  });
  const [bump, setBump] = useState(0);
  const mounted = useRef(true);


  useEffect(() => {
    mounted.current = true;
    if (typeof window === 'undefined' || window.parent === window) {
      setState({ loading: false, rows: null, fallback: null, error: null });
      return () => { mounted.current = false; };
    }

    const requestId = nextId();
    const pagePath =
      (typeof window.location !== 'undefined' && window.location.hash)
        ? window.location.hash.replace(/^#/, '') || '/'
        : '/';

    const onMessage = (event: MessageEvent) => {
      const data: any = event.data;
      if (!data) return;
      if (data.type === 'CATALOG_BINDINGS_CHANGED') {
        // Force a fresh hydration request.
        setState((prev) => ({ ...prev, loading: true }));
        setBump((b) => b + 1);
        return;
      }
      if (data.type !== 'CATALOG_HYDRATE_RESPONSE') return;
      if (data.requestId !== requestId) return;
      if (!mounted.current) return;
      setState({
        loading: false,
        rows: Array.isArray(data.rows) ? data.rows : null,
        fallback: data.fallback ?? null,
        error: data.error ?? null,
      });
    };
    window.addEventListener('message', onMessage);


    try {
      window.parent.postMessage(
        {
          type: 'CATALOG_HYDRATE_REQUEST',
          requestId,
          pagePath,
          sectionId,
          sectionType: sectionType || null,
          occurrenceIndex: typeof occurrenceIndex === 'number' ? occurrenceIndex : null,
        },
        '*',
      );
    } catch (err) {
      setState({ loading: false, rows: null, fallback: null, error: String(err) });
    }

    // Give the host ~1.5s; if nothing arrives, resolve to null so seeds render.
    const timer = window.setTimeout(() => {
      if (!mounted.current) return;
      setState((prev) => (prev.loading ? { loading: false, rows: null, fallback: null, error: null } : prev));
    }, 1500);

    return () => {
      mounted.current = false;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, [sectionId, sectionType, occurrenceIndex, bump]);

  return state;
}

/**
 * Merge live rows into a section's items prop. When hydration returns rows,
 * the live rows win. When it returns null (no binding / no parent /
 * timeout), the seed items are preserved. When it returns an empty array
 * with fallback 'hide_section', callers can hide the block.
 */
export function mergeHydratedItems(
  seedItems: any[] | undefined,
  hydration: SectionHydrationState,
): { items: any[]; hide: boolean } {
  if (hydration.loading) return { items: seedItems || [], hide: false };
  if (hydration.rows && hydration.rows.length > 0) {
    return { items: hydration.rows, hide: false };
  }
  if (hydration.rows && hydration.rows.length === 0 && hydration.fallback === 'hide_section') {
    return { items: [], hide: true };
  }
  return { items: seedItems || [], hide: false };
}
`;

/**
 * Section-type strings (in the composition's `s.type` vocabulary) that should
 * subscribe to live catalog hydration in the preview. Derived from the
 * canonical `catalogSurfaceRegistry` so there is no drift.
 */
import { listHydratableSectionTypes } from '@/platform/core/catalogSurfaceRegistry';

export const HYDRATABLE_SECTION_TYPES: readonly string[] = // from catalogSurfaceRegistry
  listHydratableSectionTypes();


