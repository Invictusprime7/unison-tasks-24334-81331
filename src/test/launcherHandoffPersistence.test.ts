import { describe, expect, it, beforeEach } from "vitest";

import {
  buildLauncherNavigationState,
  clearLauncherHandoff,
  persistLauncherHandoff,
  readLauncherHandoff,
} from "@/services/launcherHandoffPersistence";

describe("launcher handoff persistence", () => {
  beforeEach(() => {
    clearLauncherHandoff();
  });

  it("keeps a launcher handoff available across dashboard redirects", () => {
    persistLauncherHandoff({
      routeState: {
        fromLauncher: true,
        startInPreview: true,
        templateName: "Shine Site",
        systemType: "store",
        vfsFiles: {
          "/src/App.tsx": "export default function App(){return <main />}",
        },
      },
    });

    const handoff = readLauncherHandoff();

    expect(handoff?.targetPath).toBe("/web-builder");
    expect(handoff?.routeState.fromLauncher).toBe(true);
    expect(handoff?.routeState.templateName).toBe("Shine Site");
    expect(handoff?.routeState.vfsFiles).toEqual({
      "/src/App.tsx": "export default function App(){return <main />}",
    });
  });

  it('keeps a compact VFS recovery copy in both session storage and browser history', () => {
    const routeState = {
      fromLauncher: true,
      startInPreview: true,
      vfsFiles: {
        '/src/App.tsx': 'export default function App(){ return <main />; }',
        '/.unison/site-bundle-snapshot.json': JSON.stringify({
          snapshotId: 'snap_1',
          vfsFiles: { '/src/App.tsx': 'duplicate source' },
        }),
      },
      siteBundleSnapshot: {
        snapshotId: 'snap_1',
        vfsFiles: { '/src/App.tsx': 'duplicate source' },
      },
      compiledPlayground: {
        vfsFiles: { '/src/App.tsx': 'duplicate source' },
      },
    };

    persistLauncherHandoff({ routeState });
    const handoff = readLauncherHandoff();
    const navigationState = buildLauncherNavigationState(routeState);

    expect(handoff?.routeState.vfsFiles).toMatchObject({
      '/src/App.tsx': 'export default function App(){ return <main />; }',
    });
    expect((handoff?.routeState.siteBundleSnapshot as { vfsFiles?: unknown }).vfsFiles).toBeUndefined();
    expect((handoff?.routeState.compiledPlayground as { vfsFiles?: unknown }).vfsFiles).toBeUndefined();
    expect((navigationState as { vfsFiles?: unknown }).vfsFiles).toMatchObject({
      '/src/App.tsx': 'export default function App(){ return <main />; }',
    });
    expect((navigationState.siteBundleSnapshot as { vfsFiles?: unknown }).vfsFiles).toBeUndefined();
    expect((navigationState.compiledPlayground as { vfsFiles?: unknown }).vfsFiles).toBeUndefined();
  });
});