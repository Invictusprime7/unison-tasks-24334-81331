/**
 * Canonical published-runtime module materialization.
 *
 * Generated hydration/action modules import this source module at runtime.
 * The JSON contract is persisted independently so older or compacted Wizard
 * artifacts can deterministically restore the exact module without inventing
 * UI, data, endpoints, or fallback behavior.
 */

export const PUBLISHED_RUNTIME_METADATA_PATH = '/.unison/published-runtime.json';
export const PUBLISHED_RUNTIME_MODULE_PATH = '/src/unison/publishedRuntime.ts';

export interface PublishedRuntimeConfig {
  version: '1.0';
  runtimeVersion: '1.0';
  siteId: string | null;
  businessId: string | null;
  projectId: string | null;
  snapshotId: string | null;
  endpoint: string | null;
  runtimeEndpoint: string | null;
  formEndpoint: string | null;
  controllerEndpoints: Record<string, string>;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function isPublishedRuntimeConfig(value: unknown): value is PublishedRuntimeConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  return config.version === '1.0'
    && config.runtimeVersion === '1.0'
    && isNullableString(config.siteId)
    && isNullableString(config.businessId)
    && isNullableString(config.projectId)
    && isNullableString(config.snapshotId)
    && isNullableString(config.endpoint)
    && isNullableString(config.runtimeEndpoint)
    && isNullableString(config.formEndpoint)
    && Boolean(config.controllerEndpoints)
    && typeof config.controllerEndpoints === 'object'
    && !Array.isArray(config.controllerEndpoints);
}

export function buildPublishedRuntimeModule(config: PublishedRuntimeConfig): string {
  return `export const PUBLISHED_RUNTIME_CONFIG = ${JSON.stringify(config, null, 2)} as const;\n`;
}

/**
 * Restore only from the persisted, validated runtime contract. If neither the
 * source module nor its contract exists, leave the bundle untouched so the
 * canonical missing-import gate still fails closed.
 */
export function restorePublishedRuntimeModule(
  files: Record<string, string>,
): Record<string, string> {
  if (files[PUBLISHED_RUNTIME_MODULE_PATH]) return files;
  const raw = files[PUBLISHED_RUNTIME_METADATA_PATH];
  if (!raw) return files;

  try {
    const config = JSON.parse(raw) as unknown;
    if (!isPublishedRuntimeConfig(config)) return files;
    return {
      ...files,
      [PUBLISHED_RUNTIME_MODULE_PATH]: buildPublishedRuntimeModule(config),
    };
  } catch {
    return files;
  }
}