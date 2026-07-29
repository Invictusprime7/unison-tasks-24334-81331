import { describe, expect, it } from "vitest";
import {
  buildCanonicalLaunchArtifacts,
  CANONICAL_METADATA_FILE_PATHS,
  mergeGeneratedVfsWithCanonicalSnapshot,
} from "@/services/canonicalLaunchVfs";
import type { SiteBundleSnapshot } from "@/platform/core/canonicalPipeline";
import { createEmptyCreatorData } from "@/types/creatorData";
import { createBuilderPage, createEmptyPageRegistry } from "@/types/pageRegistry";
import { launchStateToSandpackFiles } from "@/utils/launchToSandpack";
import { createLaunchState } from "@/types/launchState";

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
      "/src/index.css": ":root { --primary: 221.2 83.2% 53.3%; --background: 0 0% 100%; --foreground: 222.2 84% 4.9%; }",
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
      themePresetId: "modern",
      themeInjection: {
        version: "1.0",
        stage: "4b",
        presetId: "modern",
        cssPath: "/src/index.css",
      },
    },
  };
}

describe("buildCanonicalLaunchArtifacts", () => {
  it("replaces Lane B shared chrome with registry-derived modules at canonical merge", () => {
    const snapshot = createSnapshot();
    const aboutPage = createBuilderPage("page_about", "About", "/about", "about", {
      filePath: "/src/pages/About.tsx",
      showInNav: true,
      navOrder: 1,
    });
    snapshot.pageRegistry.pages[aboutPage.pageId] = aboutPage;
    snapshot.vfsFiles[aboutPage.filePath!] =
      "export default function About(){ return <main>Canonical About</main>; }";

    const merged = mergeGeneratedVfsWithCanonicalSnapshot(
      {
        "/src/pages/Home.tsx": "export default function Home(){ return <main>Lane B Home</main>; }",
        "/src/pages/About.tsx": "export default function About(){ return <main>Lane B About</main>; }",
        "/src/sections/SiteNavbar.tsx": "export default function SiteNavbar(){ return <nav>Stale menu</nav>; }",
      },
      snapshot.vfsFiles,
      snapshot,
    );

    expect(merged["/src/sections/SiteNavbar.tsx"]).toContain('"path": "/about"');
    expect(merged["/src/sections/SiteNavbar.tsx"]).not.toContain("Stale menu");
    expect(merged["/src/sections/SiteFooter.tsx"]).toContain('"path": "/about"');
    expect(merged["/src/App.tsx"]).toContain("<SiteNavbar />");
    expect(merged["/src/App.tsx"]).toContain("<SiteFooter />");
  });

  it("uses the snapshot fallback policy when accepting generated wizard pages", () => {
    const snapshot = createSnapshot();
    snapshot.vfsFiles["/src/pages/Home.tsx"] =
      "export default function Home(){ return <main>Canonical home</main>; }";

    expect(() => mergeGeneratedVfsWithCanonicalSnapshot(
      {
        "/src/pages/Home.tsx":
          "export default function Home(){ return <main>New site preview</main>; }",
      },
      snapshot.vfsFiles,
      snapshot,
    )).toThrow("minimal/fallback scaffold");
  });

  it("preserves snapshot-owned UI foundation files when merging Lane B output", () => {
    const snapshot = createSnapshot();
    snapshot.vfsFiles["/src/unison/ui/button.tsx"] =
      "// canonical UI foundation\nexport const Button = () => null;";
    snapshot.vfsFiles["/.unison/ui-manifest.json"] =
      '{"importRoot":"@/unison/ui"}';
    snapshot.vfsFiles['/.unison/design-intervention.json'] =
      '{"layoutRecipe":"collage-hero"}';

    const merged = mergeGeneratedVfsWithCanonicalSnapshot(
      {
        "/src/pages/Home.tsx": "export default function Home(){ return <main>Lane B page</main>; }",
        "/src/unison/ui/button.tsx": "export const Button = () => <button>unsafe override</button>;",
        "/.unison/ui-manifest.json": '{"importRoot":"@/other-ui"}',
        '/.unison/design-intervention.json': '{"layoutRecipe":"conversion-form"}',
      },
      snapshot.vfsFiles,
      snapshot,
    );

    expect(merged["/src/pages/Home.tsx"]).toContain("Lane B page");
    expect(merged["/src/unison/ui/button.tsx"]).toContain("canonical UI foundation");
    expect(merged["/.unison/ui-manifest.json"]).toContain("@/unison/ui");
    expect(merged['/.unison/design-intervention.json']).toContain('collage-hero');
  });

  it("uses LaunchState VFS when the builder preview mounts before VFS import", () => {
    const launchState = createLaunchState({
      systemType: "agency",
      systemName: "Agency",
      businessName: "Acme Co",
      templateName: "Acme Launch",
      templateCategory: "landing",
      aesthetic: "modern",
      preloadedIntents: [],
      entryPoint: "/src/App.tsx",
      vfsFiles: {
        "/src/App.tsx": "export default function App(){ return <main>Generated Launch</main>; }",
        "/src/index.css": ":root { --primary: 221.2 83.2% 53.3%; }",
      },
    });

    const sandpackFiles = launchStateToSandpackFiles({
      launchState,
      vfsFiles: {},
    });

    expect(sandpackFiles["/App.tsx"]).toContain("Generated Launch");
  });

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
      organizationId: "biz_123",
      siteId: "site_123",
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
    expect(artifacts.runtimeManifest.appContext?.runtimeContext).toMatchObject({
      workspaceId: 'biz_123',
      businessId: 'biz_123',
      projectId: 'project_123',
      websiteId: 'site_123',
      snapshotId: 'snap_123',
    });
    expect(artifacts.runtimeManifest.appContext?.previewRuntime?.foundation).toBe('token-glass');
    expect(artifacts.appContext).not.toHaveProperty('experienceContract');
    expect(artifacts.runtimeManifest.metadataFiles).toContain(CANONICAL_METADATA_FILE_PATHS.appContext);
    expect(artifacts.runtimeManifest.metadataFiles).toContain(CANONICAL_METADATA_FILE_PATHS.wizardRuntime);
    expect(artifacts.files[CANONICAL_METADATA_FILE_PATHS.runtimeManifest]).toContain("\"sessionKey\"");
    expect(artifacts.files[CANONICAL_METADATA_FILE_PATHS.wizardRuntime]).toContain('token-glass');
    expect(artifacts.files[CANONICAL_METADATA_FILE_PATHS.siteBundleSnapshot]).toContain("\"vfsFilePaths\"");
    expect(artifacts.files['/src/components/businessProfile.ts']).toContain('useBusinessProfile');
  });

  it("uses SiteBundleSnapshot VFS instead of a stale compile result at launch", () => {
    const snapshot = createSnapshot();
    snapshot.meta = { ...snapshot.meta, themePresetId: 'modern' };
    snapshot.vfsFiles['/src/components/SharedRuntime.tsx'] = 'export const source = "snapshot";';

    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        '/src/pages/Home.tsx': 'export default function Home(){ return <main>Lane B Home</main>; }',
      },
      preferredEntryPoint: '/src/App.tsx',
      siteBundleSnapshot: snapshot,
      compiledPlayground: {
        vfsFiles: {
          ...snapshot.vfsFiles,
          '/src/components/SharedRuntime.tsx': 'export const source = "stale-compile";',
        },
      },
      themePresetId: 'modern',
      strictPreflight: true,
    });

    expect(artifacts.files['/src/components/SharedRuntime.tsx']).toContain('snapshot');
    expect(artifacts.siteBundleSnapshot?.vfsFiles['/src/components/SharedRuntime.tsx']).toContain('snapshot');
  });

  it("can preserve generated wizard output without merging canonical snapshot files", () => {
    const snapshot = createSnapshot();
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        "/src/App.tsx": "export default function App(){ return <main>Wizard First</main>; }",
        "/src/index.css": snapshot.vfsFiles["/src/index.css"],
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

  it("keeps Lane B AI page output authoritative at wizard launch (no canonical lock)", () => {
    const snapshot = createSnapshot();
    // Wizard-themed bundle with a registered About route.
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
    // Canonical scaffold ships minimal stubs.
    snapshot.vfsFiles["/src/pages/Home.tsx"] =
      "export default function Home(){ return <div>Canonical Home Stub</div>; }";
    snapshot.vfsFiles["/src/pages/About.tsx"] =
      "export default function About(){ return <div>Canonical About Stub</div>; }";

    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        // Lane B authors rich pages for both routes — these MUST win.
        "/src/pages/Home.tsx":
          "import Hero from '../components/Hero';\nexport default function Home(){ return <main className='bg-background text-foreground'><Hero/>Lane B Home</main>; }",
        "/src/pages/About.tsx":
          "export default function About(){ return <main className='bg-background text-foreground'>Lane B About</main>; }",
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

    // Lane B authority: rich AI pages win over canonical stubs even with
    // a wizard themePresetId present. Themed token classes are preserved
    // because Lane B authored them; canonical stubs do not preempt.
    expect(artifacts.files["/src/pages/Home.tsx"]).toContain("Lane B Home");
    expect(artifacts.files["/src/pages/About.tsx"]).toContain("Lane B About");
    expect(artifacts.files["/src/pages/Home.tsx"]).not.toContain("Canonical Home Stub");
    expect(artifacts.files["/src/pages/About.tsx"]).not.toContain("Canonical About Stub");
    // Canonical router still owns /src/App.tsx.
    expect(artifacts.files["/src/App.tsx"]).toContain("Routes");
  });

  it("can block canonical page fallback so wizard launches cannot mask missing Lane B pages", () => {
    const snapshot = createSnapshot();
    const aboutPage = {
      ...snapshot.pageRegistry.pages[snapshot.pageRegistry.homePageId!],
      pageId: "page_about",
      title: "About",
      path: "/about",
      isHome: false,
      filePath: "/src/pages/About.tsx",
    };
    snapshot.pageRegistry.pages["page_about"] = aboutPage as typeof aboutPage;
    snapshot.vfsFiles["/src/pages/About.tsx"] =
      "export default function About(){ return <div>Canonical About Fallback</div>; }";

    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        "/src/pages/Home.tsx": "export default function Home(){ return <main>Wizard Home</main>; }",
      },
      preferredEntryPoint: "/src/App.tsx",
      siteBundleSnapshot: snapshot,
      compiledPlayground: { vfsFiles: snapshot.vfsFiles },
      allowCanonicalPageFallback: false,
      businessId: "biz_strict",
      projectId: "project_strict",
      systemType: "agency",
      systemName: "Acme Co",
      templateName: "Acme Launch",
      templateCategory: "landing",
      businessName: "Acme Co",
      industry: "agency",
      aesthetic: "modern",
      backendRequired: false,
    });

    expect(artifacts.files["/src/pages/Home.tsx"]).toContain("Wizard Home");
    expect(artifacts.files["/src/pages/About.tsx"]).toBeUndefined();
    expect(artifacts.files["/src/App.tsx"]).toContain("Routes");
  });

  it("refuses to persist a quarantined wizard page when strict preflight is enabled", () => {
    const snapshot = createSnapshot();

    expect(() => buildCanonicalLaunchArtifacts({
      generatedFiles: {
        "/src/pages/Home.tsx": "export default function Home(){ return <main><section>Broken</section>; } }",
      },
      preferredEntryPoint: "/src/App.tsx",
      siteBundleSnapshot: snapshot,
      compiledPlayground: { vfsFiles: snapshot.vfsFiles },
      themePresetId: "modern",
      strictPreflight: true,
    })).toThrow(/refusing to persist quarantine scaffolds.*Unterminated JSX contents/);
  });

  it('refuses to persist a Wizard VFS with an unresolved JSX import contract', () => {
    const snapshot = createSnapshot();

    expect(() => buildCanonicalLaunchArtifacts({
      generatedFiles: {
        '/src/pages/Home.tsx': [
          "import { MissingHero, MissingCaption } from '../components/HeroParts';",
          'export default function Home(){ return <main><MissingHero /><MissingCaption /></main>; }',
        ].join('\n'),
        '/src/components/HeroParts.tsx': 'export function HeroTitle(){ return <h1>Ready</h1>; } export function HeroCopy(){ return <p>Ready</p>; }',
      },
      preferredEntryPoint: '/src/App.tsx',
      siteBundleSnapshot: snapshot,
      compiledPlayground: { vfsFiles: snapshot.vfsFiles },
      themePresetId: 'modern',
      strictPreflight: true,
    })).toThrow(/Wizard runtime preflight failed before persistence:.*Home\.tsx imports JSX component "MissingHero".*HeroTitle, HeroCopy/i);
  });
});
