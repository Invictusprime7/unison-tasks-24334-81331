/**
 * Mode B — Source-project .zip export.
 *
 * Reads the current canonical VFS (SiteBundleSnapshot-projected), normalizes
 * it via prepareSandpackFiles(), and packages a fully runnable Vite + React
 * + Tailwind project you can `npm i && npm run dev` on any machine.
 */

import JSZip from 'jszip';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import {
  projectSnapshotVfsFiles,
  resolveSnapshot,
} from '@/services/snapshotProjector';
import type { RuntimeManifest } from '@/types/runtimeManifest';
import { synthesizeProjectFiles } from './packageJsonSynth';
import {
  netlifyRedirects,
  netlifyToml,
  vercelJson,
} from './hostAdapters';

export interface ExportSourceProjectOptions {
  projectName: string;
  entryPoint?: string;
  manifest?: RuntimeManifest;
}

export interface SourceProjectExportResult {
  blob: Blob;
  fileName: string;
  fileCount: number;
}

const SKIP_PATH_PREFIXES = [
  '/.unison/',       // internal snapshot/metadata
  '/.lovable/',
  '/node_modules/',
];

const SKIP_FILE_NAMES = new Set([
  '/package.json',
  '/vite.config.ts',
  '/tsconfig.json',
  '/tsconfig.node.json',
  '/tailwind.config.ts',
  '/tailwind.config.js',
  '/postcss.config.js',
  '/postcss.config.cjs',
  '/index.html',
  '/.gitignore',
  '/README.md',
]);

function shouldIncludeVfsFile(path: string): boolean {
  if (SKIP_FILE_NAMES.has(path)) return false;
  return !SKIP_PATH_PREFIXES.some((pref) => path.startsWith(pref));
}

function zipPath(vfsPath: string): string {
  // Strip leading slash for zip entries.
  return vfsPath.replace(/^\/+/, '');
}

export async function exportSourceProject(
  vfsFiles: Record<string, string>,
  options: ExportSourceProjectOptions,
): Promise<SourceProjectExportResult> {
  if (!vfsFiles || Object.keys(vfsFiles).length === 0) {
    throw new Error('No VFS files available to export');
  }

  // 1. Snapshot-first canonical projection so themed CSS + registry router
  //    are preserved (same guarantees the preview relies on).
  const resolution = resolveSnapshot(vfsFiles);
  const projected = projectSnapshotVfsFiles(vfsFiles, resolution);

  // 2. Normalize through the sandpack prep pipeline so @/ aliases, dep
  //    injection, and lint-repairs match what the preview actually ran.
  const prepared = prepareSandpackFiles(projected, {
    entryPoint: options.entryPoint,
    themePresetId: resolution.themePresetId ?? undefined,
  });

  // 3. Synthesize toolchain scaffolding.
  const scaffold = synthesizeProjectFiles(prepared, {
    projectName: options.projectName,
    manifest: options.manifest,
  });

  const zip = new JSZip();
  const projectSlug =
    options.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unison-site';
  const root = zip.folder(projectSlug);
  if (!root) throw new Error('Failed to create zip root folder');

  // 4. Emit VFS files.
  let fileCount = 0;
  for (const [path, contents] of Object.entries(prepared)) {
    if (typeof contents !== 'string') continue;
    if (!shouldIncludeVfsFile(path)) continue;
    root.file(zipPath(path), contents);
    fileCount++;
  }

  // 5. Emit toolchain scaffolding.
  root.file('package.json', scaffold.packageJson);
  root.file('vite.config.ts', scaffold.viteConfig);
  root.file('tsconfig.json', scaffold.tsConfig);
  root.file('tsconfig.node.json', scaffold.tsConfigNode);
  root.file('tailwind.config.ts', scaffold.tailwindConfig);
  root.file('postcss.config.js', scaffold.postcssConfig);
  root.file('index.html', scaffold.indexHtml);
  root.file('.gitignore', scaffold.gitignore);
  root.file('README.md', scaffold.readme);
  if (scaffold.envExample.trim()) {
    root.file('.env.example', scaffold.envExample);
  }

  // 6. Static-host SPA fallbacks (live at project root so `dist/` deploys
  //    pick them up when copied alongside).
  const publicFolder = root.folder('public') || root;
  publicFolder.file('_redirects', netlifyRedirects());
  root.file('vercel.json', vercelJson());
  root.file('netlify.toml', netlifyToml());

  fileCount += 10;

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    blob,
    fileName: `${projectSlug}-source.zip`,
    fileCount,
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
