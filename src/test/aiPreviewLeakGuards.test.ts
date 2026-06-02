import { describe, expect, it } from 'vitest';
import { getPreviewCodeLeakReason } from '@/lib/ai/aiPatchGuards';
import { extractLauncherPayload } from '@/utils/launcherPayload';
import { templateToVFSFiles } from '@/utils/templateToVFS';

describe('AI preview leak guards', () => {
  it('unwraps stringified launcher files payloads', () => {
    const payload = JSON.stringify({
      files: {
        '/src/App.tsx': 'export default function App() { return <main>Ready</main>; }',
      },
    });

    const stringifiedPayload = JSON.stringify(payload);
    const extracted = extractLauncherPayload(stringifiedPayload);

    expect(extracted?.files['/src/App.tsx']).toContain('Ready');
  });

  it('does not wrap launcher JSON as visible JSX text in templateToVFSFiles', () => {
    const payload = JSON.stringify({
      files: {
        '/src/App.tsx': 'export default function App() { return <main>Ready</main>; }',
      },
    });

    const files = templateToVFSFiles(payload, 'Generated');

    expect(files['/src/App.tsx']).toContain('Ready');
    expect(files['/src/App.tsx']).not.toContain('{"files"');
  });

  it('rejects components that render source code strings into preview', () => {
    const badSource = `
      import React from 'react';

      const generated = \`import React from 'react';
      export default function App() {
        return <main className="min-h-screen">Site</main>;
      }\`;

      export default function App() {
        return <pre className="font-mono whitespace-pre">{generated}</pre>;
      }
    `;

    expect(getPreviewCodeLeakReason(badSource, '/src/App.tsx')).toMatch(/source code/i);
  });

  it('allows ordinary renderable React source', () => {
    const goodSource = `
      import React from 'react';

      export default function App() {
        return <main className="min-h-screen">Site</main>;
      }
    `;

    expect(getPreviewCodeLeakReason(goodSource, '/src/App.tsx')).toBeNull();
  });

  it('allows normal Home.tsx pages with data arrays and JSX expressions', () => {
    const homeSource = `
      import React from 'react';

      const features = [
        { title: 'Fast setup', description: 'Launch a complete page in minutes.' },
        { title: 'Live routing', description: 'Keep every page connected.' },
      ];

      export default function Home() {
        return (
          <main className="min-h-screen bg-background text-foreground">
            <section className="mx-auto grid max-w-5xl gap-4 px-6 py-16">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-lg border p-4">
                  <h2 className="text-xl font-semibold">{feature.title}</h2>
                  <p className="text-muted-foreground">{feature.description}</p>
                </article>
              ))}
            </section>
          </main>
        );
      }
    `;

    expect(getPreviewCodeLeakReason(homeSource, '/src/pages/Home.tsx')).toBeNull();
  });
});
