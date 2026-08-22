import { describe, expect, it } from 'vitest';

import { mergeRouteStatePreservingFiles } from '@/components/creatives/web-builder/aiCodeHelpers';

describe('Web Builder route-state merge', () => {
  it('keeps snapshot metadata and VFS files from the same handoff revision', () => {
    const pending = {
      revisionId: 'revision-new',
      siteBundleSnapshot: { snapshotId: 'snapshot-new' },
      vfsFiles: {
        '/src/pages/Home.tsx': 'export default function Home(){ return <main>New</main>; }',
      },
    };
    const staleContext = {
      revisionId: 'revision-old',
      siteBundleSnapshot: { snapshotId: 'snapshot-old' },
      vfsFiles: {
        '/src/App.tsx': 'export default function App(){ return <main>Old</main>; }',
      },
    };
    const routeIdentity = { revisionId: 'revision-new' };

    const merged = mergeRouteStatePreservingFiles(pending, staleContext, routeIdentity);

    expect((merged?.siteBundleSnapshot as { snapshotId: string }).snapshotId).toBe('snapshot-old');
    expect(merged?.vfsFiles).toEqual(staleContext.vfsFiles);
  });

  it('preserves the latest non-empty VFS when no snapshot is present', () => {
    const earlier = { vfsFiles: { '/src/App.tsx': 'earlier' }, label: 'earlier' };
    const later = { vfsFiles: { '/src/App.tsx': 'later' }, label: 'later' };

    const merged = mergeRouteStatePreservingFiles(earlier, later, { label: 'identity' });

    expect(merged?.vfsFiles?.['/src/App.tsx']).toBe('later');
    expect(merged?.label).toBe('identity');
  });
});