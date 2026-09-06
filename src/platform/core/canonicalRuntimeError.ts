/**
 * CanonicalRuntimeError — standalone error type with no upstream deps.
 *
 * Extracted so `snapshotProjector` can throw this error without creating a
 * runtime cycle with `canonicalRuntimeContract` (which imports snapshotProjector).
 */
import {
  PreviewPipelineError,
  type PreviewPipelineErrorDetails,
} from '@/services/previewPipelineError';

export type CanonicalRuntimeSurface =
  | 'preview'
  | 'readiness'
  | 'publish'
  | 'artifacts'
  | 'deploy';

export type CanonicalRuntimeCode =
  | 'MISSING_SNAPSHOT'
  | 'UNSEALED_SNAPSHOT'
  | 'MISSING_THEME_PRESET'
  | 'MISSING_SYSTEM_ID'
  | 'LEGACY_FALLBACK_BLOCKED';

export type CanonicalRecoveryAction =
  | 'run-system-launcher'
  | 'migrate-legacy-draft';

export interface CanonicalRuntimeErrorMeta {
  surface: CanonicalRuntimeSurface;
  code: CanonicalRuntimeCode;
  userMessage: string;
  developerMessage: string;
  recoveryActions: CanonicalRecoveryAction[];
}

export class CanonicalRuntimeError extends PreviewPipelineError {
  readonly isCanonicalRuntimeError = true;
  readonly canonical: CanonicalRuntimeErrorMeta;

  constructor(
    meta: CanonicalRuntimeErrorMeta,
    details: PreviewPipelineErrorDetails = {},
  ) {
    super('vfs', meta.developerMessage, {
      recoverableByRelaunch: true,
      ...details,
    });
    this.name = 'CanonicalRuntimeError';
    this.canonical = meta;
  }
}

export function isCanonicalRuntimeError(
  value: unknown,
): value is CanonicalRuntimeError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { isCanonicalRuntimeError?: boolean }).isCanonicalRuntimeError === true
  );
}

export const CANONICAL_USER_MESSAGE =
  'This project has not been launched yet. Unison needs a SiteBundleSnapshot before it can render a live business preview.';
