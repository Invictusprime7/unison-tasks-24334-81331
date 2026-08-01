import { describe, expect, it } from 'vitest';
import {
  artifactRequiredCapabilities,
  artifactRequiredTables,
  artifactSupportsAction,
  canAIEdit,
  describeArtifactForAI,
  getArtifact,
  listArtifacts,
  listArtifactsByDataSource,
  listArtifactsForCapability,
  resolveArtifact,
} from '@/platform/core/artifactRegistry';
import { getCatalogSurface } from '@/platform/core/catalogSurfaceRegistry';
import { getIntentDef } from '@/platform/core/intentSurfaceRegistry';

describe('artifactRegistry', () => {
  it('resolves an artifact from every spelling space', () => {
    for (const spelling of ['services', 'ServiceGrid', 'ServicesGrid', 'service_grid']) {
      expect(getArtifact(spelling)?.artifactId, spelling).toBe('services');
    }
    expect(getArtifact('HeroSection')?.artifactId).toBe('hero');
    expect(getArtifact('SiteNavbar')?.artifactId).toBe('navbar');
    expect(getArtifact('definitely-not-real')).toBeNull();
  });

  it('derives catalog facts from catalogSurfaceRegistry rather than restating them', () => {
    const resolved = resolveArtifact('products');
    const surface = getCatalogSurface('products');

    expect(resolved?.catalogSurface?.sourceTable).toBe(surface?.sourceTable);
    expect(resolved?.requiredTables).toEqual([surface?.sourceTable]);
    expect(resolved?.editableFields).toBe(surface?.editableFields);
    expect(resolved?.dataSource.minRows).toBe(surface?.minRows);
  });

  it('only advertises intents the intent registry actually knows', () => {
    for (const artifact of listArtifacts()) {
      const resolved = resolveArtifact(artifact.artifactId)!;
      for (const intent of resolved.knownIntents) {
        expect(getIntentDef(intent), `${artifact.artifactId}:${intent}`).not.toBeNull();
      }
    }
  });

  it('classifies every artifact under exactly one data source', () => {
    const total = listArtifacts().length;
    const counted =
      listArtifactsByDataSource('catalog').length +
      listArtifactsByDataSource('business-profile').length +
      listArtifactsByDataSource('authored').length +
      listArtifactsByDataSource('behavioral').length;
    expect(counted).toBe(total);
  });

  it('aggregates required tables and capabilities across artifacts', () => {
    expect(artifactRequiredTables(['services', 'testimonials', 'hero']).sort()).toEqual([
      'services',
      'testimonials',
    ]);
    expect(artifactRequiredCapabilities(['services', 'contact'])).toEqual(
      expect.arrayContaining(['booking', 'lead-capture']),
    );
    expect(listArtifactsForCapability('commerce').map((a) => a.artifactId)).toContain('products');
  });

  it('gates AI edits by scope', () => {
    expect(canAIEdit('hero', 'bindings')).toBe(true);
    // Catalog artifacts are layout-scoped: AI may rearrange, never rebind data.
    expect(canAIEdit('services', 'layout')).toBe(true);
    expect(canAIEdit('services', 'bindings')).toBe(false);
    // Chrome is content-only.
    expect(canAIEdit('navbar', 'layout')).toBe(false);
    expect(canAIEdit('navbar', 'content')).toBe(true);
    expect(canAIEdit('unknown-artifact', 'content')).toBe(false);
  });

  it('exposes toolbar affordances per artifact', () => {
    expect(artifactSupportsAction('services', 'bind-data')).toBe(true);
    expect(artifactSupportsAction('navbar', 'delete')).toBe(false);
  });

  it('produces a terse AI description', () => {
    const line = describeArtifactForAI('services')!;
    expect(line).toContain('ServiceGrid');
    expect(line).toContain('live rows from services');
    expect(line).toContain('ai-scope: layout');
    expect(describeArtifactForAI('nope')).toBeNull();
  });
});
