import { describe, expect, it, vi } from 'vitest';
import { applyAIBuilderFiles } from '@/services/aiBuilderApply';
import { applyAIOutputToVFS } from '@/services/aiVFSOrchestrator';
import { buildPreviewArtifacts } from '@/utils/previewArtifacts';

describe('applyAIBuilderFiles', () => {
  it('waits for the VFS callback before reporting success', async () => {
    let resolveApply!: (value: { success: boolean }) => void;
    const apply = vi.fn(() => new Promise<{ success: boolean }>((resolve) => {
      resolveApply = resolve;
    }));

    let settled = false;
    const pending = applyAIBuilderFiles(apply, { '/src/pages/Home.tsx': 'updated' })
      .then((result) => {
        settled = true;
        return result;
      });

    await Promise.resolve();
    expect(settled).toBe(false);

    resolveApply({ success: true });
    await expect(pending).resolves.toEqual({ success: true });
  });

  it('preserves a commit-gate rejection instead of converting it to success', async () => {
    await expect(applyAIBuilderFiles(
      async () => ({ success: false, errors: ['Preview gate rejected the patch.'] }),
      { '/src/pages/Home.tsx': 'broken' },
    )).resolves.toEqual({
      success: false,
      errors: ['Preview gate rejected the patch.'],
    });
  });

  it('rejects empty sanitized output without invoking the VFS', async () => {
    const apply = vi.fn();
    await expect(applyAIBuilderFiles(apply, {})).resolves.toEqual({
      success: false,
      errors: ['The AI response did not contain any valid files to apply.'],
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it('turns thrown callback failures into a visible failure outcome', async () => {
    await expect(applyAIBuilderFiles(
      async () => { throw new Error('VFS write failed'); },
      { '/src/pages/Home.tsx': 'updated' },
    )).resolves.toEqual({ success: false, errors: ['VFS write failed'] });
  });

  it('writes an accepted AI edit into the same files compiled for Sandpack', () => {
    let files: Record<string, string> = {
      '/src/App.tsx': 'export default function App(){ return <main>Before</main>; }',
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
    };
    const result = applyAIOutputToVFS({
      '/src/App.tsx': 'export default function App(){ return <main>After AI edit</main>; }',
    }, {
      nodes: [],
      getSandpackFiles: () => files,
      importFiles: (nextFiles) => { files = { ...files, ...nextFiles }; },
    }, { skipDeps: true });

    expect(result.success).toBe(true);
    expect(files['/src/App.tsx']).toContain('After AI edit');

    const preview = buildPreviewArtifacts({ sourceFiles: files });
    expect(Object.values(preview.sandpackFiles).join('\n')).toContain('After AI edit');
  });
});
