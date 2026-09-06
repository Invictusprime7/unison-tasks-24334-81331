import { getCatalogSurface } from '@/platform/core/catalogSurfaceRegistry';
import type { SectionDataBindingDTO } from '@/types/catalog';

export type ArtifactReadinessBlocker =
  | 'artifact_archived'
  | 'artifact_business_mismatch'
  | 'artifact_project_mismatch'
  | 'definition_missing'
  | 'data_binding_missing'
  | 'data_binding_business_mismatch'
  | 'data_binding_project_mismatch'
  | 'data_source_mismatch'
  | 'catalog_rows_missing';

export interface BusinessArtifactIdentity {
  businessId: string;
  projectId: string;
}

export interface BusinessArtifactRecord extends BusinessArtifactIdentity {
  componentType: string;
  status: string;
}

export interface BusinessArtifactReadiness {
  ready: boolean;
  blockers: ArtifactReadinessBlocker[];
  requiredRows: number;
  availableRows: number;
}

export function evaluateBusinessArtifactReadiness({
  identity,
  artifact,
  dataBinding,
  availableRows = 0,
}: {
  identity: BusinessArtifactIdentity;
  artifact: BusinessArtifactRecord;
  dataBinding?: SectionDataBindingDTO | null;
  availableRows?: number;
}): BusinessArtifactReadiness {
  const blockers: ArtifactReadinessBlocker[] = [];
  const surface = getCatalogSurface(artifact.componentType);

  if (artifact.status === 'archived') blockers.push('artifact_archived');
  if (artifact.businessId !== identity.businessId) blockers.push('artifact_business_mismatch');
  if (artifact.projectId !== identity.projectId) blockers.push('artifact_project_mismatch');
  if (!surface) blockers.push('definition_missing');

  if (surface) {
    if (!dataBinding) {
      blockers.push('data_binding_missing');
    } else {
      if (dataBinding.businessId !== identity.businessId) blockers.push('data_binding_business_mismatch');
      if (dataBinding.projectId !== identity.projectId) blockers.push('data_binding_project_mismatch');
      if (
        dataBinding.sourceKind !== surface.catalogKind ||
        dataBinding.sourceTable !== surface.sourceTable
      ) {
        blockers.push('data_source_mismatch');
      }
    }

    if (availableRows < surface.minRows) blockers.push('catalog_rows_missing');
  }

  return {
    ready: blockers.length === 0,
    blockers,
    requiredRows: surface?.minRows ?? 0,
    availableRows,
  };
}