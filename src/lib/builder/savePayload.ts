/**
 * Pure save-payload assembler for WebBuilder drafts.
 * Extracted from WebBuilder.tsx (Phase C3). No React deps.
 *
 * Takes a wide bag of inputs (everything WebBuilder already has on hand) and
 * returns the canonical save payload — recompiles the pipeline, builds launch
 * artifacts, and assembles metadata. WebBuilder stays the React shell that
 * gathers state; this module owns the deterministic shape.
 */
import { commitToPipeline } from '@/platform/core';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';

export interface AssembleSavePayloadInput {
  // Canonical playground state
  pageRegistry: any;
  creatorData: any;
  playgroundBindings: any;
  playgroundCalendars: any;
  playgroundPopups: any;
  // Files + entry
  currentFiles: Record<string, string>;
  launchEntryPoint: string;
  activePagePath: string | null | undefined;
  // Identity
  businessId: string | null | undefined;
  projectId: string | null | undefined;
  manifestId: string | null | undefined;
  systemType: string | null | undefined;
  systemName: string | null | undefined;
  templateName: string | null | undefined;
  templateCategory: string | null | undefined;
  designPreset: string | null | undefined;
  // Display
  projectDisplayName: string;
  saveProjectName: string;
  projectNameFromState: string | null | undefined;
  // Route context
  effectiveRouteState: any;
  routeStateHasStructuredProject: boolean;
}

export function assembleSavePayload(input: AssembleSavePayloadInput) {
  const canonicalPlayground = {
    pageRegistry: input.pageRegistry,
    creatorData: input.creatorData,
    bindings: input.playgroundBindings,
    calendars: input.playgroundCalendars,
    popups: input.playgroundPopups,
  };

  const effectiveBusinessName =
    input.creatorData?.businessInfo?.businessName ||
    input.templateName ||
    input.projectNameFromState ||
    input.systemName ||
    'Business';

  const route = input.effectiveRouteState;
  const preservedTemplateId =
    route?.siteBundleSnapshot?.appContext?.templateId ||
    route?.siteBundleSnapshot?.selectedTemplateId ||
    route?.runtimeManifest?.appContext?.templateId ||
    route?.wizardSelections?.templateId ||
    undefined;
  const preservedThemePresetId =
    route?.siteBundleSnapshot?.appContext?.themePresetId ||
    route?.siteBundleSnapshot?.selectedThemeId ||
    route?.runtimeManifest?.appContext?.themePresetId ||
    route?.wizardSelections?.themeId ||
    input.designPreset ||
    undefined;

  const recompilation = commitToPipeline(
    {
      playground: canonicalPlayground,
      existingVfsFiles: input.currentFiles,
      businessName: effectiveBusinessName,
      industry: route?.siteBundleSnapshot?.industry,
      selectedTemplateId: preservedTemplateId,
      selectedThemeId: preservedThemePresetId,
      themePresetId: preservedThemePresetId,
    },
    'playground-edit',
  );

  const launchArtifacts = buildCanonicalLaunchArtifacts({
    generatedFiles: input.currentFiles,
    preferredEntryPoint: input.launchEntryPoint,
    siteBundleSnapshot: recompilation.siteBundleSnapshot,
    compiledPlayground: recompilation.compileResult,
    canonicalPlayground,
    businessId: input.businessId ?? undefined,
    projectId: input.projectId ?? undefined,
    manifestId: input.manifestId || undefined,
    systemType: input.systemType || undefined,
    systemName: input.systemName || effectiveBusinessName,
    templateName: input.templateName || effectiveBusinessName,
    templateCategory: input.templateCategory || undefined,
    templateId: preservedTemplateId,
    businessName: effectiveBusinessName,
    industry: recompilation.siteBundleSnapshot.industry,
    aesthetic: preservedThemePresetId,
    themePresetId: preservedThemePresetId,
    backendRequired: route?.runtimeManifest?.backendRequired ?? false,
    wizardSelections: route?.wizardSelections || undefined,
  });

  // Project identity is strictly the project's own name. Never fall back to a
  // business/wizard name here — that's how legacy drafts ended up titled
  // "My Business".
  const resolvedName =
    (
      input.projectDisplayName.trim() ||
      input.saveProjectName.trim() ||
      input.projectNameFromState ||
      input.templateName ||
      ''
    ).trim() || `Project ${(input.projectId || '').slice(0, 8) || 'untitled'}`;

  const launchSource = route?.wizardSelections
    ? 'system_launcher'
    : route?.systemsBuildContext
      ? 'business_launcher'
      : input.routeStateHasStructuredProject
        ? 'launcher'
        : 'web_builder';

  return {
    vfsFiles: launchArtifacts.files,
    entryPoint: launchArtifacts.entryPoint,
    activePagePath: input.activePagePath,
    businessId: input.businessId ?? null,
    projectId: input.projectId ?? null,
    canonicalPlayground: launchArtifacts.canonicalPlayground,
    siteBundleSnapshot: launchArtifacts.siteBundleSnapshot,
    metadata: {
      name: resolvedName,
      projectName: resolvedName,
      businessName: effectiveBusinessName,
      systemType: input.systemType || null,
      templateCategory: input.templateCategory || null,
      aesthetic: input.designPreset || null,
      manifestId: input.manifestId || null,
      launchSource,
    },
  };
}
