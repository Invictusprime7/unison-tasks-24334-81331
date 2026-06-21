import { describe, expect, it } from "vitest";
import { buildCanonicalLaunchArtifacts, CANONICAL_METADATA_FILE_PATHS } from "@/services/canonicalLaunchVfs";
import type { SiteBundleSnapshot } from "@/services/canonicalPipeline";
import { createEmptyCreatorData } from "@/types/creatorData";
import { createBuilderPage, createEmptyPageRegistry } from "@/types/pageRegistry";

function createSnapshot(): SiteBundleSnapshot {
  const pageRegistry = createEmptyPageRegistry();
  const homePage = createBuilderPage("page_home", "Home", "/", "home", {
    isHome: true,
    filePath: "/src/pages/Home.tsx",
  });
  pageRegistry.pages[homePage.pageId] = homePage;
  pageRegistry.homePageId = homePage.pageId;

  return {
    snapshotId: "snap_123",
    businessName: "Acme Co",
    industry: "agency",
    pageRegistry,
    vfsFiles: {
      "/src/App.tsx": "import { Routes, Route } from 'react-router-dom';\nimport Home from './pages/Home';\nexport default function App(){ return <Routes><Route path=\"/\" element={<Home />} /></Routes>; }",
      "/src/pages/Home.tsx": "export default function Home(){ return <div>Placeholder</div>; }",
    },
    routerFile: {
      path: "/src/App.tsx",
      content: "import { Routes, Route } from 'react-router-dom';",
    },
    manifest: {
      routes: [{ path: "/", pageId: "page_home", isHome: true }],
      nav: [{ label: "Home", path: "/", pageId: "page_home" }],
      layout: { header: "default", footer: "default" },
      metadata: { title: "Acme Co", description: "Agency site" },
    },
    bindings: {},
    calendars: {},
    popups: {},
    creatorData: createEmptyCreatorData("Acme Co"),
    componentInstances: {},
    routes: ["/"],
    homeRoute: "/",
    createdAt: "2026-04-23T00:00:00.000Z",
    meta: {
      source: "wizard",
      systemId: "agency",
      industry: "agency",
      verticalContractId: "agency",
    },
  };
}

describe("buildCanonicalLaunchArtifacts", () => {
  it("wires launcher output into canonical VFS metadata and package dependencies", () => {
    const snapshot = createSnapshot();
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        "/src/App.tsx": "import { motion } from 'framer-motion';\nexport default function App(){ return <motion.div>Hello</motion.div>; }",
      },
      preferredEntryPoint: "/src/App.tsx",
      siteBundleSnapshot: snapshot,
      compiledPlayground: { vfsFiles: snapshot.vfsFiles },
      businessId: "biz_123",
      projectId: "project_123",
      systemType: "agency",
      systemName: "Acme Co",
      templateName: "Acme Launch",
      templateCategory: "landing",
      businessName: "Acme Co",
      industry: "agency",
      aesthetic: "modern",
      backendRequired: false,
    });

    expect(artifacts.files["/src/App.tsx"]).toContain("Routes");
    expect(artifacts.files["/src/pages/Home.tsx"]).toContain("motion.div");
    expect(artifacts.files["/package.json"]).toContain("\"framer-motion\"");
    expect(artifacts.runtimeManifest.appContext?.projectId).toBe("project_123");
    expect(artifacts.runtimeManifest.metadataFiles).toContain(CANONICAL_METADATA_FILE_PATHS.appContext);
    expect(artifacts.files[CANONICAL_METADATA_FILE_PATHS.runtimeManifest]).toContain("\"sessionKey\"");
    expect(artifacts.files[CANONICAL_METADATA_FILE_PATHS.siteBundleSnapshot]).toContain("\"vfsFilePaths\"");
  });

  it("can preserve generated wizard output without merging canonical snapshot files", () => {
    const snapshot = createSnapshot();
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        "/src/App.tsx": "export default function App(){ return <main>Wizard First</main>; }",
      },
      preferredEntryPoint: "/src/App.tsx",
      siteBundleSnapshot: snapshot,
      compiledPlayground: { vfsFiles: snapshot.vfsFiles },
      mergeWithCanonicalSnapshot: false,
      businessId: "biz_456",
      projectId: "project_456",
      systemType: "agency",
      systemName: "Acme Co",
      templateName: "Acme Launch",
      templateCategory: "landing",
      businessName: "Acme Co",
      industry: "agency",
      aesthetic: "modern",
      backendRequired: false,
    });

    expect(artifacts.files["/src/App.tsx"]).toContain("Wizard First");
    expect(artifacts.files["/src/pages/Home.tsx"]).toBeUndefined();
    expect(artifacts.files[CANONICAL_METADATA_FILE_PATHS.runtimeManifest]).toContain("\"sessionKey\"");
  });

  it("preserves wizard-themed canonical Home across registered routes when snapshot carries a themePresetId", () => {
    const snapshot = createSnapshot();
    // Promote the snapshot to a wizard-themed bundle and add an About page so
    // we can assert tokens/seeds stay consistent across multiple routes.
    snapshot.meta = { ...snapshot.meta, themePresetId: "modern" };
    const aboutPage = {
      ...snapshot.pageRegistry.pages[snapshot.pageRegistry.homePageId!],
      pageId: "page_about",
      title: "About",
      path: "/about",
      isHome: false,
      filePath: "/src/pages/About.tsx",
    };
    snapshot.pageRegistry.pages["page_about"] = aboutPage as typeof aboutPage;
    snapshot.vfsFiles["/src/pages/Home.tsx"] =
      "import Hero from '../components/Hero';\nexport default function Home(){ return <div className='bg-background text-foreground'><Hero/></div>; }";
    snapshot.vfsFiles["/src/pages/About.tsx"] =
      "import Hero from '../components/Hero';\nexport default function About(){ return <div className='bg-background text-foreground'><Hero/></div>; }";

    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        // AI Lane B produces a bespoke Home composition that would normally
        // overwrite the themed Home and break route consistency.
        "/src/App.tsx":
          "import { motion } from 'framer-motion';\nexport default function App(){ return <motion.div>AI Home</motion.div>; }",
        // AI also tries to overwrite a registered subpage — must be ignored.
        "/src/pages/About.tsx":
          "export default function About(){ return <div>AI About Override</div>; }",
      },
      preferredEntryPoint: "/src/App.tsx",
      siteBundleSnapshot: snapshot,
      compiledPlayground: { vfsFiles: snapshot.vfsFiles },
      themePresetId: "modern",
      businessId: "biz_789",
      projectId: "project_789",
      systemType: "agency",
      systemName: "Acme Co",
      templateName: "Acme Launch",
      templateCategory: "landing",
      businessName: "Acme Co",
      industry: "agency",
      aesthetic: "modern",
      backendRequired: false,
    });

    // Wizard-themed Home survives — AI seed does not leak into the page file.
    expect(artifacts.files["/src/pages/Home.tsx"]).toContain("bg-background");
    expect(artifacts.files["/src/pages/Home.tsx"]).not.toContain("AI Home");
    // Registered subpage stays themed too.
    expect(artifacts.files["/src/pages/About.tsx"]).toContain("bg-background");
    expect(artifacts.files["/src/pages/About.tsx"]).not.toContain("AI About Override");
    // Router is still the canonical generated one.
    expect(artifacts.files["/src/App.tsx"]).toContain("Routes");
  });
});
