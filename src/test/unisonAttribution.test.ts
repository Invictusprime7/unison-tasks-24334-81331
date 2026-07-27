import { describe, expect, it } from 'vitest';
import {
  UNISON_ATTRIBUTION_ASSET,
  UNISON_ATTRIBUTION_MARKER,
  UNISON_ATTRIBUTION_SCRIPT,
  withPoweredByUnisonAttribution,
} from '@/services/export/unisonAttribution';

describe('Powered by Unison attribution', () => {
  it('adds a visible attribution asset and references it from deployable HTML', () => {
    const attributed = withPoweredByUnisonAttribution({
      'index.html': '<!doctype html><html><body><main>Site</main></body></html>',
    });

    expect(attributed['index.html']).toContain(UNISON_ATTRIBUTION_ASSET);
    expect(attributed[UNISON_ATTRIBUTION_ASSET]).toBe(UNISON_ATTRIBUTION_SCRIPT);
    expect(attributed[UNISON_ATTRIBUTION_ASSET]).toContain(UNISON_ATTRIBUTION_MARKER);
  });

  it('does not add a second attribution script when an export is processed again', () => {
    const once = withPoweredByUnisonAttribution({
      '/index.html': '<!doctype html><html><body><main>Site</main></body></html>',
    });
    const twice = withPoweredByUnisonAttribution(once);

    expect(twice['/index.html'].match(new RegExp(UNISON_ATTRIBUTION_ASSET, 'g'))).toHaveLength(1);
  });
});