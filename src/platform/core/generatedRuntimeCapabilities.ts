/**
 * Canonical generated runtime profile + capability registry.
 *
 * This is the ONE place that answers "which React runtime do generated sites
 * run on, and which advanced npm ecosystems are they allowed to reach".
 * Sandpack dependency resolution, the generated UI manifest, the Lane B
 * authoring prompt and the runtime compatibility preflight all derive from
 * this file — never from scattered `startsWith('@react-three')` exceptions.
 *
 * Intentionally dependency-free so every layer can import it without cycles.
 */

/** The single generated React runtime profile. */
export const GENERATED_RUNTIME_PROFILE = {
  id: 'react19-webgl-v1',
  react: '^19.2.0',
  reactDom: '^19.2.0',
  reactTypes: '^19.2.0',
  reactDomTypes: '^19.2.0',
  /** Major line of react-three-fiber that matches the React major above. */
  fiberMajor: 9,
} as const;

export type GeneratedRuntimeProfileId = typeof GENERATED_RUNTIME_PROFILE.id;

export interface GeneratedRuntimeCapability {
  id: string;
  /** npm packages the capability's foundation implementation may import. */
  imports: readonly string[];
  /** Pinned versions installed only when the capability is actually reached. */
  dependencies: Readonly<Record<string, string>>;
  /** Nested runtime packages Sandpack cannot discover by itself. */
  transitiveDependencies: Readonly<Record<string, string>>;
  /** Import roots generated pages (Lane B) may use for this capability. */
  facadeImports: readonly string[];
  previewSupport: 'required' | 'optional';
  fallback: 'dom' | 'static' | 'none';
  performanceClass: 'light' | 'medium' | 'heavy';
  /** React runtime profile this capability's versions were pinned against. */
  runtimeProfile: GeneratedRuntimeProfileId;
}

export const EXPERIENCE_CAPABILITY_ID = 'experience.three-d' as const;

export const THREE_D_CAPABILITY: GeneratedRuntimeCapability = {
  id: EXPERIENCE_CAPABILITY_ID,
  imports: ['three', '@react-three/fiber', '@react-three/drei'],
  dependencies: {
    three: '^0.180.0',
    // R3F 9 is the React 19 line; never resolve these with `latest`.
    '@react-three/fiber': '^9.3.0',
    '@react-three/drei': '^10.7.0',
  },
  transitiveDependencies: {
    scheduler: '0.27.0',
    'react-reconciler': '0.32.0',
    'its-fine': '2.0.0',
    'suspend-react': '0.1.3',
    zustand: '5.0.8',
    'use-sync-external-store': '1.5.0',
    '@use-gesture/react': '10.3.1',
    maath: '0.10.8',
    'three-stdlib': '2.36.0',
    'detect-gpu': '5.0.70',
    '@babel/runtime': '7.28.4',
  },
  facadeImports: ['@/unison/ui/experience'],
  previewSupport: 'required',
  fallback: 'dom',
  performanceClass: 'heavy',
  runtimeProfile: GENERATED_RUNTIME_PROFILE.id,
};

export const GENERATED_RUNTIME_CAPABILITIES: readonly GeneratedRuntimeCapability[] = [
  THREE_D_CAPABILITY,
];

export function getGeneratedRuntimeCapability(id: string): GeneratedRuntimeCapability | null {
  return GENERATED_RUNTIME_CAPABILITIES.find((capability) => capability.id === id) ?? null;
}

/** Every package any registered capability is allowed to install. */
export const GENERATED_RUNTIME_CAPABILITY_DEPENDENCIES: Readonly<Record<string, string>> =
  Object.freeze(
    Object.assign({}, ...GENERATED_RUNTIME_CAPABILITIES.map((capability) => capability.dependencies)),
  );

/** Returns the capability that owns an npm specifier, if any. */
export function findCapabilityForImport(specifier: string): GeneratedRuntimeCapability | null {
  return (
    GENERATED_RUNTIME_CAPABILITIES.find((capability) =>
      capability.imports.some((name) => specifier === name || specifier.startsWith(`${name}/`)),
    ) ?? null
  );
}

/** Default, compiler-visible performance budget for the experience layer. */
export const EXPERIENCE_PERFORMANCE_BUDGET = {
  maxCanvasRootsPerPage: 2,
  maxHeavyScenesPerPage: 2,
  maxHeavyScenesPerSite: 6,
  maxModelBytes: 6_000_000,
  prefersReducedMotionFallback: true,
  webglFallback: true,
} as const;

export type ExperiencePerformanceBudget = typeof EXPERIENCE_PERFORMANCE_BUDGET;
