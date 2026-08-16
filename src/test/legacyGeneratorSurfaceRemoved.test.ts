import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * R6 — the standalone AI page generator was a parallel visual pipeline:
 * its own PageRenderer, its own noir/warm/vibrant/minimal/luxury theme
 * presets, and no SiteBundleSnapshot. Canonical preview requires a snapshot,
 * so the surface is deleted rather than maintained.
 */
describe('R6 — legacy AI page generator surface stays deleted', () => {
  const deleted = [
    'src/components/creatives/AIPageGenerator.tsx',
    'src/components/creatives/PageRenderer.tsx',
    'src/hooks/usePageGenerator.ts',
    'supabase/functions/generate-page/index.ts',
  ];

  it.each(deleted)('%s does not exist', (path) => {
    expect(existsSync(path)).toBe(false);
  });

  it('/ai-generator redirects to the canonical builder', () => {
    const source = readFileSync('src/routes/routeConfig.tsx', 'utf8');
    expect(source).toContain('path: "/ai-generator"');
    expect(source).toContain('element: <Navigate to="/web-builder" replace />');
    expect(source).not.toContain('AIPageGenerator');
  });

  it('no surface links to the deleted generator', () => {
    const creatives = readFileSync('src/pages/Creatives.tsx', 'utf8');
    expect(creatives).not.toContain('/ai-generator');
  });
});
