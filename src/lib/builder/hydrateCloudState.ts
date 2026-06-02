/**
 * hydrateCloudState — async cloud-state loader invoked inside a useEffect.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 23. Encapsulates the
 * loadCloudState call + cancellation guard so WebBuilder only needs a
 * single-line useEffect that invokes this helper.
 */

import {
  loadCloudState,
  type CloudStateSnapshot,
  type CloudStateFallbacks,
} from "./loadCloudState";

export interface HydrateCloudStateInput {
  businessId?: string | null;
  projectId?: string | null;
  fallbacks?: CloudStateFallbacks;
  setCloudState: (
    value: CloudStateSnapshot | ((prev: CloudStateSnapshot) => CloudStateSnapshot)
  ) => void;
}

/**
 * Loads the cloud snapshot and feeds it into the provided setter.
 * Returns a cleanup function that cancels the async resolution if the
 * component unmounts or the effect re-runs before the promise settles.
 */
export function hydrateCloudState({
  businessId,
  projectId,
  fallbacks,
  setCloudState,
}: HydrateCloudStateInput): () => void {
  let cancelled = false;

  loadCloudState({ businessId, projectId, fallbacks }).then((result) => {
    if (cancelled) return;
    if (result.kind === "full") {
      setCloudState(result.snapshot);
    } else {
      setCloudState((prev) => ({ ...prev, ...result.patch }));
    }
  });

  return () => {
    cancelled = true;
  };
}
