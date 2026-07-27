import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Web Builder preview ownership', () => {
  it('keeps SandpackProvider in VFSPreview only', () => {
    const sharedPreview = readSource('src/components/VFSPreview.tsx');
    const codeView = readSource('src/components/creatives/code-editor/VFSCodeView.tsx');

    expect(sharedPreview).toContain('<SandpackProvider');
    expect(codeView).toContain('<VFSPreview');
    expect(codeView).not.toContain('<SandpackProvider');
    expect(codeView).not.toContain('function InlinePreview');
  });

  it('threads VFS imports and remounts only when the dependency signature changes', () => {
    const sharedPreview = readSource('src/components/VFSPreview.tsx');
    const builder = readSource('src/components/creatives/WebBuilder.tsx');

    expect(sharedPreview).toContain('dependencySignatureRef');
    expect(sharedPreview).toContain('if (previewCompiling) return;');
    expect(sharedPreview).toContain('importIntoOwner(changedFiles)');
    expect(builder.match(/onImportFiles=\{virtualFS\.importFiles\}/g)).toHaveLength(2);
  });

  it('runs the controlled index mount module instead of the unmounted App export', () => {
    const sharedPreview = readSource('src/components/VFSPreview.tsx');

    expect(sharedPreview).toContain("const controlledEntries = ['/index.tsx', '/index.jsx'];");
    expect(sharedPreview.indexOf("const controlledEntries = ['/index.tsx', '/index.jsx'];"))
      .toBeLessThan(sharedPreview.indexOf("if (sandpackFiles['/App.tsx']) return '/App.tsx';"));
  });

  it('bootstraps Tailwind utilities from the controlled Sandpack entry', () => {
    const filePrep = readSource('src/utils/sandpackFilePrep.ts');

    expect(filePrep).toContain("source.type = 'text/tailwindcss';");
    expect(filePrep).toContain("source.textContent = '@tailwind base; @tailwind components; @tailwind utilities;';");
    expect(filePrep).toContain("loader.src = 'https://cdn.tailwindcss.com';");
    expect(filePrep).toContain('void __loadTailwindUtilities().finally(__mountPreview);');
  });

  it('keeps the deployed Sandpack dependency-module progress surface in the preview corner', () => {
    const sharedPreview = readSource('src/components/VFSPreview.tsx');

    expect(sharedPreview).toContain('useSandpackPreviewProgress({ timeout: 3000 })');
    expect(sharedPreview).toContain('window.setTimeout(() => setShowInitialInstall(false), 4000)');
    expect(sharedPreview).toContain("sandpack.status === 'initial' && showInitialInstall");
    expect(sharedPreview).toContain("? 'Installing preview modules'");
    expect(sharedPreview).toContain("const SANDPACK_BUNDLER_URL = 'https://sandpack-bundler.codesandbox.io'");
    expect(sharedPreview).toContain('bundlerURL: SANDPACK_BUNDLER_URL');
    expect(sharedPreview).toContain('absolute bottom-3 left-3');
    expect(sharedPreview).toContain('({dependencyCount} modules)');
    expect(sharedPreview).toContain('<SandpackDependencyProgress dependencyCount={Object.keys(sandpackDeps).length} />');
  });

  it('keeps template thumbnails painted but non-executable', () => {
    const thumbnail = readSource('src/components/creatives/web-builder/TemplatePreviewThumbnail.tsx');

    expect(thumbnail).not.toContain('<iframe');
    expect(thumbnail).toContain('template thumbnail');
  });
});
