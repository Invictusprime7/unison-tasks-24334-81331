import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import type { BusinessCapability } from '@/platform/core/capabilityRegistry';
import type { UnisonRuntimeContext } from '@/platform/core/runtimeManifest';

export type ProjectRuntimeMode = 'draft' | 'preview' | 'published';
export type ProjectPersistenceStatus = 'persisted' | 'pending' | 'failed';
export type ProjectSynchronizationStatus = 'synchronized' | 'pending' | 'conflicted' | 'offline';

export interface ProjectRuntimeEnvelope {
  version: '1.0';
  identity: {
    workspaceId: string;
    businessId: string;
    projectId: string;
    draftId: string;
  };
  snapshot: SiteBundleSnapshot;
  snapshotVersion: string;
  revisionId: string;
  activePublishedRevisionId: string | null;
  navigation: {
    activePagePath: string;
  };
  runtimeMode: ProjectRuntimeMode;
  provisionedCapabilities: BusinessCapability[];
  persistence: {
    status: ProjectPersistenceStatus;
    persistedAt: string | null;
    error: string | null;
  };
  synchronization: {
    status: ProjectSynchronizationStatus;
    synchronizedAt: string | null;
    error: string | null;
  };
}

export class InvalidProjectRuntimeEnvelopeError extends Error {
  constructor(message: string) {
    super(`[ProjectRuntimeEnvelope] ${message}`);
    this.name = 'InvalidProjectRuntimeEnvelopeError';
  }
}

export function assertProjectRuntimeEnvelope(
  envelope: ProjectRuntimeEnvelope,
): asserts envelope is ProjectRuntimeEnvelope {
  const requiredIdentity = ['workspaceId', 'businessId', 'projectId', 'draftId'] as const;
  for (const field of requiredIdentity) {
    if (!envelope.identity[field]?.trim()) {
      throw new InvalidProjectRuntimeEnvelopeError(`missing identity.${field}`);
    }
  }
  if (!envelope.revisionId.trim()) {
    throw new InvalidProjectRuntimeEnvelopeError('missing revisionId');
  }
  if (!envelope.snapshotVersion.trim()) {
    throw new InvalidProjectRuntimeEnvelopeError('missing snapshotVersion');
  }
  if (!envelope.snapshot?.snapshotId) {
    throw new InvalidProjectRuntimeEnvelopeError('missing canonical snapshot');
  }
  if (envelope.snapshot.snapshotId !== envelope.snapshotVersion) {
    throw new InvalidProjectRuntimeEnvelopeError('snapshotVersion does not match snapshot.snapshotId');
  }
  if (!envelope.navigation.activePagePath.trim()) {
    throw new InvalidProjectRuntimeEnvelopeError('missing navigation.activePagePath');
  }
  if (!(envelope.navigation.activePagePath in envelope.snapshot.vfsFiles)) {
    throw new InvalidProjectRuntimeEnvelopeError('navigation.activePagePath is not present in snapshot.vfsFiles');
  }
  if (
    envelope.runtimeMode === 'published'
    && envelope.activePublishedRevisionId !== envelope.revisionId
  ) {
    throw new InvalidProjectRuntimeEnvelopeError('published runtime does not match activePublishedRevisionId');
  }

  const runtimeContext = envelope.snapshot.appContext?.runtimeContext;
  if (runtimeContext) {
    const expected: Array<[keyof UnisonRuntimeContext, string]> = [
      ['workspaceId', envelope.identity.workspaceId],
      ['businessId', envelope.identity.businessId],
      ['projectId', envelope.identity.projectId],
      ['snapshotId', envelope.snapshotVersion],
    ];
    for (const [field, value] of expected) {
      if (runtimeContext[field] !== value) {
        throw new InvalidProjectRuntimeEnvelopeError(`snapshot runtimeContext.${field} does not match envelope identity`);
      }
    }
  }
}

export function projectRuntimeContext(
  envelope: ProjectRuntimeEnvelope,
): UnisonRuntimeContext | undefined {
  return envelope.snapshot.appContext?.runtimeContext;
}