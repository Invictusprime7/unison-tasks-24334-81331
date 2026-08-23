/**
 * surgicalProjection — the non-regenerating canonical commit mode.
 *
 * Wizard launch (`executeCanonicalPipeline`) GENERATES a site. Playground edit
 * (`recompileFromPlayground`) REGENERATES its structure — it needs wizard-grade
 * inputs (themePresetId, themeTokens, a healthy PlaygroundState, matching
 * design-intervention mirrors) and throws when any of them drifted on a
 * Lane A/Lane B generated draft.
 *
 * A surgical AI edit to an already-registered page needs none of that. It needs:
 *   apply file ops → validate coverage → re-stamp the snapshot → persist.
 *
 * This module is that third mode. It takes the existing SiteBundleSnapshot plus
 * the patched VFS as truth and re-derives ONLY the derived artifacts
 * (snapshot vfsFiles mirror, runtime manifest, compile projection, seal stamp).
 * It never re-runs Stage 4b, never requires themeTokens, and never rewrites a
 * file the AI did not touch — so the sealed wizard output stays authoritative.
 */

import type {
  CanonicalPipelineResult,
  SiteBundleSnapshot,
} from './canonicalPipeline';
import type { PlaygroundState, PlaygroundCompileResult } from './playground';
import { createRuntimeManifest, type RuntimeAppContext } from './runtimeManifest';
import { sealSnapshot } from './snapshotSeal';
import { assertWithinCommit } from './pipelineGuard';

export class SurgicalProjectionError extends Error {
  constructor(message: string) {
    super(`[surgical-edit] ${message}`);
    this.name = 'SurgicalProjectionError';
  }
}

export interface SurgicalProjectionInput {
  /** Existing sealed (or at least compiled) snapshot — the authority. */
  siteBundleSnapshot: SiteBundleSnapshot;
  /** Full VFS AFTER the patch file ops were applied. */
  vfsFiles: Record<string, string>;
  /** Optional playground carried by the builder; derived from the snapshot when absent. */
  playground?: PlaygroundState | null;
  businessName?: string;
  industry?: string;
}

/** Registered page file paths on a snapshot. */
export function registeredPagePaths(snapshot: SiteBundleSnapshot): string[] {
  const pages = Object.values(snapshot.pageRegistry?.pages || {}) as Array<{ filePath?: string }>;
  return pages.map((p) => p.filePath).filter((p): p is string => Boolean(p));
}

/**
 * True when the patch only touches paths the snapshot already knows about and
 * carries no structural intent. Structural patches (new/removed/renamed pages,
 * router or topology rewrites) must keep using `playground-edit`.
 */
export function isSurgicalPatch(
  snapshot: SiteBundleSnapshot | null | undefined,
  changedPaths: string[],
): boolean {
  if (!snapshot) return false;
  if (!changedPaths.length) return false;

  const known = new Set(Object.keys(snapshot.vfsFiles || {}));
  for (const path of registeredPagePaths(snapshot)) known.add(path);

  return changedPaths.every((raw) => {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    // Router / topology / platform metadata are structural by definition.
    if (path === '/src/App.tsx') return false;
    if (path.startsWith('/.unison/')) return false;
    // A brand new page file means the registry has to change → recompile.
    if (/^\/src\/pages\//i.test(path) && !known.has(path)) return false;
    return known.has(path) || !/^\/src\/pages\//i.test(path);
  });
}

function playgroundFromSnapshot(snapshot: SiteBundleSnapshot): PlaygroundState {
  return {
    creatorData: snapshot.creatorData,
    pageRegistry: snapshot.pageRegistry,
    bindings: snapshot.bindings || {},
    calendars: snapshot.calendars || {},
    popups: snapshot.popups || {},
  };
}

function appContextFor(snapshot: SiteBundleSnapshot, input: SurgicalProjectionInput): RuntimeAppContext {
  const existing = snapshot.appContext;
  return {
    ...(existing || ({} as RuntimeAppContext)),
    industry: input.industry || existing?.industry || snapshot.meta?.industry || snapshot.industry,
    businessName: existing?.businessName || input.businessName || snapshot.businessName,
    systemType: existing?.systemType ?? snapshot.meta?.systemId ?? undefined,
    themePresetId: existing?.themePresetId ?? snapshot.meta?.themePresetId ?? undefined,
    templateId: existing?.templateId ?? snapshot.meta?.templateId ?? undefined,
    generatedAt: new Date().toISOString(),
  } as RuntimeAppContext;
}

/**
 * Project a patched VFS onto an existing snapshot without regenerating it.
 * Must be called inside a `commitToPipeline` context.
 */
export function projectSurgicalCommit(
  input: SurgicalProjectionInput,
): CanonicalPipelineResult {
  assertWithinCommit('projectSurgicalCommit');

  const snapshot = input.siteBundleSnapshot;
  if (!snapshot) {
    throw new SurgicalProjectionError('a surgical commit requires an existing SiteBundleSnapshot.');
  }

  const files = { ...(snapshot.vfsFiles || {}), ...(input.vfsFiles || {}) };

  const missing = registeredPagePaths(snapshot).filter((p) => !files[p]);
  if (missing.length > 0) {
    throw new SurgicalProjectionError(
      `patched VFS is missing files for registered pages: ${missing.join(', ')}. ` +
        'Structural page changes must go through a playground recompile.',
    );
  }
  if (!files['/src/App.tsx']) {
    throw new SurgicalProjectionError('patched VFS is missing the deterministic /src/App.tsx router.');
  }
  if (!files['/src/index.css']) {
    throw new SurgicalProjectionError('patched VFS is missing the Stage 4b themed /src/index.css.');
  }

  const appContext = appContextFor(snapshot, input);
  const nextSnapshot = sealSnapshot({
    artifact: snapshot,
    vfsFiles: files,
    appContext,
    sealedBy: 'builder-commit',
  });

  const runtimeManifest = createRuntimeManifest(nextSnapshot.vfsFiles, {
    industry: nextSnapshot.industry,
    brandName: nextSnapshot.businessName,
    aesthetic: nextSnapshot.meta?.themePresetId || undefined,
    appContext,
  });

  const compileResult: PlaygroundCompileResult = {
    pageRouteRegistry: nextSnapshot.pageRegistry,
    vfsFiles: nextSnapshot.vfsFiles,
    routerFile: nextSnapshot.routerFile,
    bindingManifest: nextSnapshot.bindings || {},
    previewManifest: {
      routes: nextSnapshot.routes,
      homeRoute: nextSnapshot.homeRoute,
    },
  };

  return {
    success: true,
    capabilities: [] as never,
    playground: input.playground || playgroundFromSnapshot(nextSnapshot),
    validations: [],
    compileResult,
    siteBundleSnapshot: nextSnapshot,
    runtimeManifest,
    sitePlan: null,
    warnings: [],
    errors: [],
  };
}
