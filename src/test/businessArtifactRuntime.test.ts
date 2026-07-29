import { describe, expect, it } from 'vitest';
import { evaluateBusinessArtifactReadiness } from '@/platform/core/businessArtifactRuntime';
import type { SectionDataBindingDTO } from '@/types/catalog';

const identity = { businessId: 'business-1', projectId: 'project-1' };
const artifact = {
  ...identity,
  componentType: 'ServiceGrid',
  status: 'draft',
};
const serviceBinding: SectionDataBindingDTO = {
  id: 'binding-1',
  ...identity,
  snapshotId: 'snapshot-1',
  pagePath: '/',
  sectionId: 'ServiceGrid-0',
  slotKey: null,
  bindingType: 'section',
  sourceKind: 'service',
  sourceTable: 'services',
  collectionId: null,
  filters: { is_active: true },
  sort: { field: 'sort_order', direction: 'asc' },
  limitCount: 12,
  displayMapping: {},
  fallbackMode: 'empty_state',
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:00.000Z',
};

describe('evaluateBusinessArtifactReadiness', () => {
  it('marks a correctly scoped ServiceGrid with enough service rows ready', () => {
    expect(evaluateBusinessArtifactReadiness({
      identity,
      artifact,
      dataBinding: serviceBinding,
      availableRows: 3,
    })).toEqual({
      ready: true,
      blockers: [],
      requiredRows: 3,
      availableRows: 3,
    });
  });

  it('reports missing binding and service rows independently', () => {
    const result = evaluateBusinessArtifactReadiness({ identity, artifact });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(['data_binding_missing', 'catalog_rows_missing']);
  });

  it('rejects cross-business bindings even when the source shape is valid', () => {
    const result = evaluateBusinessArtifactReadiness({
      identity,
      artifact,
      dataBinding: { ...serviceBinding, businessId: 'business-2' },
      availableRows: 3,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('data_binding_business_mismatch');
  });

  it('rejects a binding whose catalog source does not match ServiceGrid', () => {
    const result = evaluateBusinessArtifactReadiness({
      identity,
      artifact,
      dataBinding: { ...serviceBinding, sourceKind: 'product', sourceTable: 'products' },
      availableRows: 3,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('data_source_mismatch');
  });
});