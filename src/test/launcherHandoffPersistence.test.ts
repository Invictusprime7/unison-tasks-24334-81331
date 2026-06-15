import { describe, expect, it, beforeEach } from "vitest";

import {
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
});