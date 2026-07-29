import { describe, expect, it } from 'vitest';
import {
  computeBuilderVfsSignature,
  getBuilderRecoveryKey,
  markBuilderRecoveryPersisted,
  readBuilderRecoverySnapshot,
  writeBuilderRecoverySnapshot,
  type BuilderRecoverySnapshot,
} from '@/services/builderStateRecovery';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function snapshot(templateId: string | null = null): BuilderRecoverySnapshot {
  const vfsFiles = {
    '/src/App.tsx': 'export default function App(){ return <main>Recovered AI edit</main>; }',
    '/src/index.css': 'body { color: hotpink; }',
  };
  return {
    version: 2,
    code: vfsFiles['/src/App.tsx'],
    editorCode: vfsFiles['/src/App.tsx'],
    savedAt: '2026-07-28T12:00:00.000Z',
    templateId,
    vfsSignature: computeBuilderVfsSignature(vfsFiles),
    vfsFiles,
    reason: 'ai_edit',
    pendingRemote: true,
  };
}

describe('builderStateRecovery', () => {
  it('detects same-length edits outside the file tail', () => {
    const before = {
      '/src/App.tsx': `AAA${'x'.repeat(64)}same-tail`,
    };
    const after = {
      '/src/App.tsx': `BBB${'x'.repeat(64)}same-tail`,
    };

    expect(before['/src/App.tsx']).toHaveLength(after['/src/App.tsx'].length);
    expect(computeBuilderVfsSignature(before)).not.toBe(computeBuilderVfsSignature(after));
  });

  it('journals the complete VFS synchronously before remote persistence', () => {
    const storage = createStorage();
    const pending = snapshot();

    expect(writeBuilderRecoverySnapshot(pending, storage)).toBe(true);
    expect(readBuilderRecoverySnapshot(null, storage)).toEqual(pending);
  });

  it('moves an acknowledged first save under its durable draft id', () => {
    const storage = createStorage();
    const pending = snapshot();
    const draftId = '80df1c0d-bf83-49aa-bc50-851e0f2d3a63';
    writeBuilderRecoverySnapshot(pending, storage);

    expect(markBuilderRecoveryPersisted(pending, draftId, storage)).toBe(true);
    expect(storage.getItem(getBuilderRecoveryKey(null))).toBeNull();
    expect(readBuilderRecoverySnapshot(draftId, storage)).toMatchObject({
      templateId: draftId,
      pendingRemote: false,
      vfsFiles: pending.vfsFiles,
    });
  });

  it('retains an unscoped resume alias for anonymous local projects', () => {
    const storage = createStorage();
    const pending = snapshot();
    writeBuilderRecoverySnapshot(pending, storage);

    markBuilderRecoveryPersisted(pending, 'local-123', storage);

    expect(readBuilderRecoverySnapshot(null, storage)).toMatchObject({
      templateId: 'local-123',
      pendingRemote: false,
      vfsFiles: pending.vfsFiles,
    });
  });

  it('does not let an older remote acknowledgement replace a newer journal', () => {
    const storage = createStorage();
    const older = snapshot('draft-1');
    const newer: BuilderRecoverySnapshot = {
      ...older,
      savedAt: '2026-07-28T12:00:01.000Z',
      vfsFiles: {
        ...older.vfsFiles,
        '/src/App.tsx': 'export default function App(){ return <main>Newest AI edit</main>; }',
      },
    };
    newer.vfsSignature = computeBuilderVfsSignature(newer.vfsFiles);

    writeBuilderRecoverySnapshot(older, storage);
    writeBuilderRecoverySnapshot(newer, storage);

    expect(markBuilderRecoveryPersisted(older, 'draft-1', storage)).toBe(false);
    expect(readBuilderRecoverySnapshot('draft-1', storage)).toEqual(newer);
  });
});
