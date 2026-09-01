/**
 * Technical runtime compatibility preflight.
 *
 * This answers "can the generated package graph actually boot in the preview
 * runtime", and deliberately stays OUT of PreviewGate/PublishGate business
 * readiness: a visitor's device lacking WebGL is a degradation, never a
 * publish blocker, while an unknown package or a React/R3F renderer mismatch
 * is a hard technical blocker.
 */
import {
  GENERATED_RUNTIME_PROFILE,
  findCapabilityForImport,
  type GeneratedRuntimeCapability,
} from '@/platform/core/generatedRuntimeCapabilities';
import {
  EXPERIENCE_IMPORT_ROOT,
  EXPERIENCE_RUNTIME_PACKAGES,
} from '@/platform/core/experiencePrimitives';
import { isSandpackAllowedImport } from '@/utils/sandpackDependencies';
import { runExperiencePreflight } from '@/services/experiencePreflightGate';

export interface RuntimeCompatibilityReport {
  runtimeProfile: string;
  dependenciesResolvable: boolean;
  importsApproved: boolean;
  reactRuntimeCompatible: boolean;
  fallbackPresent: boolean;
  budgetValid: boolean;
  capabilitiesUsed: string[];
  warnings: string[];
  blockers: string[];
  ok: boolean;
}

const IMPORT_PATTERN = /(?:\bimport\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s*|\bexport\s+(?:[\s\S]*?)\s+from\s*|\bimport\s*)['"]([^'"]+)['"]/g;
const FOUNDATION_PREFIX = '/src/unison/';

function isFoundationFile(path: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith(FOUNDATION_PREFIX);
}

function majorOf(range: string | undefined): number | null {
  if (!range) return null;
  const match = range.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export interface RuntimeCompatibilityInput {
  files: Record<string, string>;
  /** Dependencies the preview will actually install. */
  dependencies: Record<string, string>;
  /** Capability ids the launch envelope approved. */
  approvedCapabilities?: readonly string[];
}

/** Runs the technical compatibility checks over a sealed/candidate file set. */
export function runRuntimeCompatibilityPreflight(
  input: RuntimeCompatibilityInput,
): RuntimeCompatibilityReport {
  const { files, dependencies } = input;
  const approved = new Set(input.approvedCapabilities ?? []);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const capabilitiesUsed = new Set<string>();

  let importsApproved = true;
  let dependenciesResolvable = true;

  const localModules = new Set(Object.keys(files).map((path) => (path.startsWith('/') ? path : `/${path}`)));

  for (const [path, source] of Object.entries(files)) {
    if (typeof source !== 'string' || !/\.(tsx|jsx|ts|js)$/i.test(path)) continue;
    const foundation = isFoundationFile(path);

    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/')) continue;

      const capability: GeneratedRuntimeCapability | null = findCapabilityForImport(specifier);
      if (capability) {
        capabilitiesUsed.add(capability.id);
        if (!foundation) {
          importsApproved = false;
          blockers.push(
            `${path} imports "${specifier}" directly. ${capability.id} is only reachable through ${capability.facadeImports.join(', ')}.`,
          );
          continue;
        }
        if (approved.size > 0 && !approved.has(capability.id)) {
          importsApproved = false;
          blockers.push(`${path} reaches capability "${capability.id}", which this launch did not approve.`);
          continue;
        }
        const packageName = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0];
        if (!dependencies[packageName]) {
          dependenciesResolvable = false;
          blockers.push(`Required dependency "${packageName}" for ${capability.id} is missing from the preview package graph.`);
        }
        continue;
      }

      if (specifier.startsWith('@/unison/')) {
        if (specifier.startsWith(`${EXPERIENCE_IMPORT_ROOT}`)) capabilitiesUsed.add('experience.three-d');
        const modulePath = specifier.replace('@/', '/src/');
        const resolved = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].some((suffix) =>
          localModules.has(`${modulePath}${suffix}`),
        );
        if (!resolved) {
          dependenciesResolvable = false;
          blockers.push(`${path} imports canonical module "${specifier}", which is absent from the generated VFS.`);
        }
        continue;
      }
      if (specifier.startsWith('@/')) continue;

      if (!isSandpackAllowedImport(specifier)) {
        importsApproved = false;
        blockers.push(`${path} imports unknown package "${specifier}"; the preview runtime cannot install it.`);
      }
    }
  }

  // React renderer profile: the fiber major must match the React major.
  const reactMajor = majorOf(dependencies.react ?? GENERATED_RUNTIME_PROFILE.react);
  const profileMajor = majorOf(GENERATED_RUNTIME_PROFILE.react);
  const fiberMajor = majorOf(dependencies['@react-three/fiber']);
  let reactRuntimeCompatible = true;
  if (reactMajor !== profileMajor) {
    reactRuntimeCompatible = false;
    blockers.push(
      `Generated preview declares React ${dependencies.react} but the canonical runtime profile is ${GENERATED_RUNTIME_PROFILE.id} (React ${GENERATED_RUNTIME_PROFILE.react}).`,
    );
  }
  if (fiberMajor !== null && fiberMajor !== GENERATED_RUNTIME_PROFILE.fiberMajor) {
    reactRuntimeCompatible = false;
    blockers.push(
      `@react-three/fiber ${dependencies['@react-three/fiber']} is not the React ${profileMajor} renderer line (expected major ${GENERATED_RUNTIME_PROFILE.fiberMajor}).`,
    );
  }

  // Experience budget + fallback presence.
  const experience = runExperiencePreflight(files);
  for (const violation of experience.violations) blockers.push(violation);
  const budgetValid = experience.violations.length === 0;

  const usesExperience = experience.manifest.totalInstances > 0;
  const canvasSource = files['/src/unison/ui/experience/canvas.tsx'] || '';
  const fallbackPresent = !usesExperience || /fallback/.test(canvasSource);
  if (usesExperience && !fallbackPresent) {
    blockers.push('The experience canvas no longer ships a non-WebGL fallback; immersive pages would render blank.');
  }
  if (usesExperience) {
    capabilitiesUsed.add('experience.three-d');
    warnings.push('This site renders WebGL scenes; devices without WebGL or with reduced-motion enabled will see the DOM fallback.');
    if (experience.manifest.heavyInstances >= 3) {
      warnings.push(`Heavy scene count is ${experience.manifest.heavyInstances}; expect a higher GPU cost on low-power devices.`);
    }
    for (const name of EXPERIENCE_RUNTIME_PACKAGES) {
      if (!dependencies[name]) {
        dependenciesResolvable = false;
        blockers.push(`Experience layer is in use but "${name}" is missing from the preview package graph.`);
      }
    }
  }

  return {
    runtimeProfile: GENERATED_RUNTIME_PROFILE.id,
    dependenciesResolvable,
    importsApproved,
    reactRuntimeCompatible,
    fallbackPresent,
    budgetValid,
    capabilitiesUsed: [...capabilitiesUsed],
    warnings,
    blockers,
    ok: blockers.length === 0,
  };
}
