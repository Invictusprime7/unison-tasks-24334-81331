import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { exportSourceProject } from '@/services/export/exportSourceProject';

describe('exportSourceProject', () => {
  it('bakes Unison metadata into the zip so re-import is restorable', async () => {
    const vfsFiles: Record<string, string> = {
      '/src/main.tsx': "import App from './App';\nexport default App;",
      '/src/App.tsx': 'export default function App(){ return <main>Hi</main>; }',
      '/src/index.css': ':root { --primary: 0 0% 0%; }',
      '/.unison/site-bundle-snapshot.json': JSON.stringify({ snapshotId: 'snap_1' }),
      '/.unison/canonical-playground.json': JSON.stringify({ pageRegistry: {} }),
      '/.unison/wizard-seed.json': JSON.stringify({ industry: 'agency' }),
    };

    const result = await exportSourceProject(vfsFiles, { projectName: 'Northstar Studio' });
    const zip = await JSZip.loadAsync(result.blob);
    const paths = Object.keys(zip.files);

    for (const name of [
      'runtime-manifest.json',
      'site-bundle-snapshot.json',
      'canonical-playground.json',
      'wizard-seed.json',
    ]) {
      expect(paths.some((p) => p.endsWith(`.unison/${name}`))).toBe(true);
    }
  });
});
