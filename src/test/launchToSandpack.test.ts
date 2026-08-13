import { describe, expect, it } from "vitest";
import { buildCanonicalLaunchArtifacts } from "@/services/canonicalLaunchVfs";
import { commitToPipeline } from "@/platform/core";
import { getCompositionsBySystemType } from "@/sections/templates";
import { createLaunchState } from "@/types/launchState";
import { launchStateToSandpackFiles } from "@/utils/launchToSandpack";
import { buildPreviewArtifacts } from "@/utils/previewArtifacts";
import { SANDPACK_PREVIEW_CORE_DEPENDENCIES } from "@/utils/sandpackDependencies";
import { THEME_PRESETS } from "@/components/onboarding/themePresets";
import { themePresetToThemeTokens } from "@/components/onboarding/themePresetToTokens";
import { buildThemedIndexCss } from "@/components/onboarding/themePresetToIndexCss";
import { buildGeneratedUiFoundation } from '@/platform/core/generatedUiFoundation';

describe("launchStateToSandpackFiles", () => {
  it('blocks a wizard preview when Sandpack disconnects a registered route from its router', () => {
    const snapshot = {
      snapshotId: 'snap_route_reachability',
      businessName: 'Vela',
      industry: 'salon',
      pageRegistry: {
        homePageId: 'home',
        pages: {
          home: { pageId: 'home', isHome: true, filePath: '/src/pages/Home.tsx', path: '/', navOrder: 0 },
          contact: { pageId: 'contact', isHome: false, filePath: '/src/pages/Contact.tsx', path: '/contact', navOrder: 1 },
        },
      },
      vfsFiles: {
        '/src/App.tsx': "import Home from './pages/Home'; export default function App(){ return <Home />; }",
        '/src/pages/Home.tsx': 'export default function Home(){ return <main>Home</main>; }',
        '/src/pages/Contact.tsx': 'export default function Contact(){ return <main>Contact</main>; }',
        '/src/index.css': ':root { --primary: 221 83% 53%; }',
      },
      meta: {
        source: 'wizard',
        themePresetId: 'modern',
        themeInjection: { version: '1.0', stage: '4b', presetId: 'modern', cssPath: '/src/index.css' },
      },
    };

    expect(() => buildPreviewArtifacts({
      sourceFiles: {
        '/.unison/site-bundle-snapshot.json': JSON.stringify(snapshot),
      },
    })).toThrow(/disconnected from \/App\.tsx/);
  });

  it('keeps every generated runtime file, including public assets, in the Sandpack overlay', () => {
    const snapshot = {
      snapshotId: 'snap_file_coverage',
      pageRegistry: { pages: {} },
      vfsFiles: {
        '/src/App.tsx': 'export default function App(){ return <main>Coverage</main>; }',
        '/src/components/Notice.tsx': 'export default function Notice(){ return <aside>Notice</aside>; }',
        '/src/assets/wordmark.svg': '<svg viewBox="0 0 1 1" />',
        '/public/images/hero.svg': '<svg viewBox="0 0 1 1" />',
        '/src/index.css': ':root { --primary: 221 83% 53%; }',
      },
      meta: {
        source: 'wizard',
        themePresetId: 'modern',
        themeInjection: { version: '1.0', stage: '4b', presetId: 'modern', cssPath: '/src/index.css' },
      },
    };

    const result = buildPreviewArtifacts({
      sourceFiles: { '/.unison/site-bundle-snapshot.json': JSON.stringify(snapshot) },
    });

    expect(result.sandpackFiles['/components/Notice.tsx']).toContain('function Notice');
    expect(result.sandpackFiles['/assets/wordmark.svg']).toContain('<svg');
    expect(result.sandpackFiles['/public/images/hero.svg']).toContain('<svg');
  });

  it('rejects generated files that would collide after Sandpack path flattening', () => {
    const snapshot = {
      snapshotId: 'snap_file_collision',
      pageRegistry: { pages: {} },
      vfsFiles: {
        '/src/App.tsx': 'export default function App(){ return <main>Collision</main>; }',
        '/src/components/Notice.tsx': 'export default function Notice(){ return <aside>Source</aside>; }',
        '/components/Notice.tsx': 'export default function Notice(){ return <aside>Root</aside>; }',
        '/src/index.css': ':root { --primary: 221 83% 53%; }',
      },
      meta: {
        source: 'wizard',
        themePresetId: 'modern',
        themeInjection: { version: '1.0', stage: '4b', presetId: 'modern', cssPath: '/src/index.css' },
      },
    };

    expect(() => buildPreviewArtifacts({
      sourceFiles: { '/.unison/site-bundle-snapshot.json': JSON.stringify(snapshot) },
    })).toThrow(/refusing to drop either generated file/);
  });

  it("merges the lightweight preview runtime with final artifact imports while preserving themePresetId CSS", () => {
    const organic = THEME_PRESETS.find((preset) => preset.id === "organic");
    expect(organic).toBeDefined();

    const result = buildPreviewArtifacts({
      sourceFiles: {
        "/src/App.tsx": [
          "import * as Dialog from '@radix-ui/react-dialog';",
          "import { kebabCase } from 'lodash-es';",
          "export default function App() { return <Dialog.Root><Dialog.Trigger>{kebabCase('Open dialog')}</Dialog.Trigger></Dialog.Root>; }",
        ].join("\n"),
        "/src/index.css": buildThemedIndexCss(organic!),
        "/.unison/app-context.json": JSON.stringify({ themePresetId: "organic" }),
      },
    });

    expect(result.dependencies).toMatchObject(SANDPACK_PREVIEW_CORE_DEPENDENCIES);
    expect(result.dependencies["@radix-ui/react-dialog"]).toBeUndefined();
    expect(result.dependencies["@swc/helpers"]).toBeDefined();
    expect(result.dependencies["lodash-es"]).toBe("latest");
    expect(result.dependencies.recharts).toBeUndefined();
    expect(result.dependencies.tailwindcss).toBeUndefined();
    expect(result.sandpackFiles["/index.css"]).toContain("WIZARD THEME: Organic");
    expect(result.sandpackFiles["/index.css"]).not.toContain("WIZARD FINAL THEME OVERRIDE: organic");
  });

  it("adds a curated dependency when generated source actually imports it", () => {
    const result = buildPreviewArtifacts({
      sourceFiles: {
        "/src/App.tsx": [
          "import * as Dialog from '@radix-ui/react-dialog';",
          "export default function App() { return <Dialog.Root><Dialog.Trigger>Open</Dialog.Trigger></Dialog.Root>; }",
        ].join("\n"),
        "/src/index.css": ":root { --primary: 221 83% 53%; }",
      },
    });

    expect(result.dependencies["@radix-ui/react-dialog"]).toBeUndefined();
    expect(result.dependencies.recharts).toBeUndefined();
  });

  it('keeps a wizard preview on the core runtime when no optional facade is imported', () => {
    const result = buildPreviewArtifacts({
      sourceFiles: {
        '/src/App.tsx': 'export default function App(){ return <main>Wizard preview</main>; }',
        '/src/index.css': ':root { --primary: 221 83% 53%; }',
        '/.unison/site-bundle-snapshot.json': JSON.stringify({
          snapshotId: 'snap_runtime_foundation',
          pageRegistry: { pages: {} },
          vfsFiles: {
            '/src/App.tsx': 'export default function App(){ return <main>Wizard preview</main>; }',
            '/src/index.css': ':root { --primary: 221 83% 53%; }',
          },
          meta: {
            source: 'wizard',
            themePresetId: 'modern',
            themeInjection: { version: '1.0', stage: '4b', presetId: 'modern', cssPath: '/src/index.css' },
          },
        }),
      },
    });

    expect(result.dependencies.react).toBeDefined();
    expect(result.dependencies['react-dom']).toBeDefined();
    expect(result.dependencies['@swc/helpers']).toBeDefined();
    expect(result.dependencies['framer-motion']).toBeUndefined();
    expect(result.dependencies['lucide-react']).toBeUndefined();
    expect(result.dependencies['@radix-ui/react-dialog']).toBeUndefined();
    expect(result.dependencies['@babel/standalone']).toBeUndefined();
    expect(result.dependencies.bootstrap).toBeUndefined();
    expect(result.dependencies['@stylexjs/stylex']).toBeUndefined();
    expect(result.dependencies.tailwindcss).toBeUndefined();
    expect(result.dependencies.bulma).toBeUndefined();
  });

  it('keeps the Wizard runtime path after canonical projection has consumed VFS metadata', () => {
    const result = buildPreviewArtifacts({
      sourceFiles: {
        '/src/App.tsx': 'export default function App(){ return <main>Projected wizard preview</main>; }',
        '/src/index.css': ':root { --primary: 221 83% 53%; }',
        '/.unison/site-bundle-snapshot.json': JSON.stringify({
          snapshotId: 'snap_projection_runtime',
          pageRegistry: { pages: {} },
          vfsFiles: {
            '/src/App.tsx': 'export default function App(){ return <main>Projected wizard preview</main>; }',
            '/src/index.css': ':root { --primary: 221 83% 53%; }',
          },
          meta: {
            source: 'wizard',
            themePresetId: 'modern',
            themeInjection: { version: '1.0', stage: '4b', presetId: 'modern', cssPath: '/src/index.css' },
          },
        }),
      },
    });

    expect(result.dependencies['@radix-ui/react-dialog']).toBeUndefined();
    expect(result.dependencies['@babel/standalone']).toBeUndefined();
    expect(result.dependencies['@stylexjs/stylex']).toBeUndefined();
  });

  it('installs only dependencies reached through a wizard UI foundation import', () => {
    const foundation = buildGeneratedUiFoundation({
      industry: 'salon',
      themePresetId: 'organic',
      needsBooking: true,
    });
    const result = buildPreviewArtifacts({
      sourceFiles: {
        ...foundation.files,
        '/src/App.tsx': "import { Button } from '@/unison/ui/button'; export default function App(){ return <Button>Book</Button>; }",
        '/src/index.css': buildThemedIndexCss(THEME_PRESETS.find((preset) => preset.id === 'organic')!),
        '/.unison/site-bundle-snapshot.json': JSON.stringify({
          snapshotId: 'snap_reachable_foundation',
          pageRegistry: { pages: {} },
          vfsFiles: {},
          meta: {
            source: 'wizard',
            themePresetId: 'organic',
            themeInjection: { version: '1.0', stage: '4b', presetId: 'organic', cssPath: '/src/index.css' },
          },
        }),
      },
    });

    expect(result.dependencies['@radix-ui/react-slot']).toBeUndefined();
    expect(result.dependencies['class-variance-authority']).toBeDefined();
    expect(result.dependencies['@radix-ui/react-dialog']).toBeUndefined();
    expect(result.dependencies['@swc/helpers']).toBeDefined();
    expect(result.sandpackFiles['/unison/ui/radix/slot-safe.tsx']).toContain("from '../../../radix-shim'");
    expect(result.dependencies['framer-motion']).toBeUndefined();
    expect(result.dependencies['lucide-react']).toBeUndefined();
  });

  it('recovers a legacy manifestless animation facade through the local Sandpack shim', () => {
    const result = buildPreviewArtifacts({
      sourceFiles: {
        '/src/App.tsx': "import { motion } from '@/unison/ui/animation'; export default function App(){ return <motion.main>Ready</motion.main>; }",
        '/src/index.css': ':root { --primary: 221 83% 53%; }',
      },
    });

    expect(result.sandpackFiles['/unison/ui/animation.ts']).toContain("export * from '../../motion-shim'");
    expect(result.sandpackFiles['/motion-shim.tsx']).toContain('export const motion = new Proxy');
    expect(result.dependencies['framer-motion']).toBeUndefined();
  });

  it("does not reintroduce embedded JSON launcher wrappers after normalization", () => {
    const leakedJsonWrapper = [
      "/** @jsx React.createElement */",
      "/** @jsxFrag React.Fragment */",
      "import * as React from 'react';",
      '{"files":{"src/App.tsx":"export default function App(){ return <div>ok</div>; }","src/index.css":":root { --primary: 221.2 83.2% 53.3%; }"}}',
    ].join("\n");

    const launchState = createLaunchState({
      systemType: "store",
      systemName: "Store",
      businessName: "Vela",
      templateName: "Storefront",
      templateCategory: "store",
      vfsFiles: {
        "/src/pages/Home.tsx": leakedJsonWrapper,
      },
      preloadedIntents: [],
    });

    const previewFiles = launchStateToSandpackFiles({
      launchState,
      vfsFiles: launchState.vfsFiles,
    });

    const allCodeFiles = Object.entries(previewFiles).filter(([path]) => /\.(tsx|jsx|ts|js)$/.test(path));

    expect(allCodeFiles.length).toBeGreaterThan(0);
    for (const [, content] of allCodeFiles) {
      expect(content.trimStart().startsWith('{"files"')).toBe(false);
    }

    expect(previewFiles["/App.tsx"] || "").not.toContain('{"files"');
  });

  it("extracts TSX from fenced markdown responses", () => {
    const fencedTsx = [
      "Here is your component:",
      "```tsx",
      "export default function App(){",
      "  return <div>clean</div>;",
      "}",
      "```",
    ].join("\n");

    const launchState = createLaunchState({
      systemType: "store",
      systemName: "Store",
      businessName: "Vela",
      templateName: "Storefront",
      templateCategory: "store",
      vfsFiles: {
        "/src/App.tsx": fencedTsx,
      },
      preloadedIntents: [],
    });

    const previewFiles = launchStateToSandpackFiles({
      launchState,
      vfsFiles: launchState.vfsFiles,
    });

    expect(previewFiles["/App.tsx"] || "").toContain("export default function App()");
    expect(previewFiles["/App.tsx"] || "").toContain("return <div>clean</div>");
  });

  it("blocks prose-only TSX modules instead of rendering fallback content", () => {
    const proseOnly = "I will now create a polished landing page with a modern hero and strong CTA.";

    const launchState = createLaunchState({
      systemType: "store",
      systemName: "Store",
      businessName: "Vela",
      templateName: "Storefront",
      templateCategory: "store",
      vfsFiles: {
        "/src/pages/Home.tsx": proseOnly,
      },
      preloadedIntents: [],
    });

    expect(() => launchStateToSandpackFiles({
      launchState,
      vfsFiles: launchState.vfsFiles,
    })).toThrow(/Prose-only module/);
  });

  it("repairs parenthesized and concise-arrow {children} object returns", () => {
    const brokenChildrenCode = [
      "import React from 'react';",
      "const Wrapper = ({ children }: { children: React.ReactNode }) => ({ children });",
      "const Forwarded = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(function Forwarded({ children }, ref) { return { children: children ?? null }; });",
      "const MemoChild = React.memo(({ children }: { children: React.ReactNode }) => ({ children, }));",
      "export default function App({ children }: { children?: React.ReactNode }) {",
      "  return ({ children: children });",
      "}",
    ].join("\n");

    const launchState = createLaunchState({
      systemType: "store",
      systemName: "Store",
      businessName: "Vela",
      templateName: "Storefront",
      templateCategory: "store",
      vfsFiles: {
        "/src/App.tsx": brokenChildrenCode,
      },
      preloadedIntents: [],
    });

    const previewFiles = launchStateToSandpackFiles({
      launchState,
      vfsFiles: launchState.vfsFiles,
    });

    const appCode = previewFiles["/App.tsx"] || "";
    expect(appCode).not.toContain("=> ({ children })");
    expect(appCode).not.toContain("return ({ children: children });");
    expect(appCode).not.toContain("return { children: children ?? null };");
    expect(appCode).not.toContain("=> ({ children, })");
    expect(appCode).toContain("=> (<>{children}</>)");
    expect(appCode).toContain("return <>{children}</>");
    expect(appCode).toContain("return <>{children ?? null}</>");

    const tsconfig = JSON.parse(previewFiles["/tsconfig.json"] || "{}");
    expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
    expect(tsconfig.compilerOptions.jsxFactory).toBeUndefined();
  });

  it("strips generated router providers because preview index owns the router", () => {
    const appWithRouter = [
      "import React from 'react';",
      "import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';",
      "function Home(){ return <Link to=\"/about\">About</Link>; }",
      "function About(){ return <main>About</main>; }",
      "export default function App(){",
      "  return (",
      "    <Router basename=\"/\">",
      "      <Routes>",
      "        <Route path=\"/\" element={<Home />} />",
      "        <Route path=\"/about\" element={<About />} />",
      "      </Routes>",
      "    </Router>",
      "  );",
      "}",
    ].join("\n");

    const launchState = createLaunchState({
      systemType: "store",
      systemName: "Store",
      businessName: "Vela",
      templateName: "Storefront",
      templateCategory: "store",
      vfsFiles: {
        "/src/App.tsx": appWithRouter,
      },
      preloadedIntents: [],
    });

    const previewFiles = launchStateToSandpackFiles({
      launchState,
      vfsFiles: launchState.vfsFiles,
    });

    const appCode = previewFiles["/App.tsx"] || "";
    expect(appCode).toContain("import { Routes, Route, Link } from 'react-router-dom';");
    expect(appCode).toContain("<Routes>");
    expect(appCode).not.toContain("HashRouter");
    expect(appCode).not.toContain("<Router");
    expect(appCode).not.toContain("</Router>");
  });

  it("does not monkey-patch React component rendering in the runtime entry", () => {
    const launchState = createLaunchState({
      systemType: "store",
      systemName: "Store",
      businessName: "Vela",
      templateName: "Storefront",
      templateCategory: "store",
      vfsFiles: {
        "/src/App.tsx": [
          "import React from 'react';",
          "import { Routes, Route } from 'react-router-dom';",
          "export default function App(){",
          "  return <Routes><Route path=\"/\" element={<main>Home</main>} /></Routes>;",
          "}",
        ].join("\n"),
      },
      preloadedIntents: [],
    });

    const previewFiles = launchStateToSandpackFiles({
      launchState,
      vfsFiles: launchState.vfsFiles,
    });

    const indexCode = previewFiles["/index.tsx"] || "";
    expect(indexCode).toContain("PreviewErrorBoundary");
    expect(indexCode).toContain("__RouterGuard");
    expect(indexCode).not.toContain("React.createElement =");
    expect(indexCode).not.toContain("SafeCreateElement");
    expect(indexCode).not.toContain("_sanitizeChildValue");
    expect(indexCode).not.toContain("PreviewSafeType");
    expect(indexCode).not.toContain("_wrapRenderableType");
    expect(indexCode).not.toContain("React.forwardRef =");
    expect(indexCode).not.toContain("React.memo =");
    expect(indexCode).not.toContain("Safe_Route");
  });

  it("scaffolds only explicitly selected wizard pages before Builder readiness", () => {
    const templateId = getCompositionsBySystemType("booking")[0]?.id;
    expect(templateId).toBeTruthy();

    const wizardSelections = {
      businessName: "Vela Salon",
      businessModel: "appointment_service" as const,
      industryOverlay: "salon" as const,
      primaryGoal: "book_appointments",
      secondaryGoals: ["book_service"],
      needsBooking: true,
      wantsLeadCapture: true,
      templateId,
      themeId: "modern",
      themePresetId: "modern",
      themeTokens: themePresetToThemeTokens(
        THEME_PRESETS.find((preset) => preset.id === "modern")!,
      ),
      requestedPages: ["services"],
      scaffoldMode: "selected-pages" as const,
    };

    const pipeline = commitToPipeline({ selections: wizardSelections }, 'wizard-launch');
    for (const page of Object.values(pipeline.siteBundleSnapshot.pageRegistry.pages)) {
      expect(page.pageRole).toBeTruthy();
      expect(page.pageRole).not.toBe('custom');
      expect(page.pageType).not.toBe('custom');
      expect(page.path).toMatch(/^\//);
      expect(page.filePath).toBeTruthy();
      expect(pipeline.compileResult.vfsFiles[page.filePath!]).toMatch(/export\s+default\b/);
    }
    expect(pipeline.compileResult.vfsFiles['/src/App.tsx']).toContain('<Routes>');

    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        "/src/App.tsx": "export default function App(){ return <main>Generated Home</main>; }",
      },
      preferredEntryPoint: "/src/App.tsx",
      siteBundleSnapshot: pipeline.siteBundleSnapshot,
      compiledPlayground: pipeline.compileResult,
      canonicalPlayground: pipeline.playground,
      systemType: "booking",
      systemName: "Booking",
      templateName: "Vela Salon Site",
      templateCategory: "salon",
      businessName: "Vela Salon",
      industry: "salon",
      aesthetic: "modern",
      backendRequired: false,
      wizardSelections,
    });

    expect(artifacts.files["/src/pages/Services.tsx"]).toBeTruthy();
    expect(artifacts.files["/src/App.tsx"]).toContain('path="/services"');
    expect(artifacts.files["/src/pages/Booking.tsx"]).toBeFalsy();
    expect(artifacts.files["/src/App.tsx"]).not.toContain('path="/booking"');
  });

  it('rejects an unknown wizard template instead of substituting an industry scaffold', () => {
    const modern = THEME_PRESETS.find((preset) => preset.id === 'modern');
    expect(modern).toBeTruthy();

    expect(() => commitToPipeline({
      selections: {
        businessName: 'Broken Card Co',
        businessModel: 'appointment_service',
        industryOverlay: 'salon',
        primaryGoal: 'book_appointments',
        secondaryGoals: [],
        templateId: 'missing-template-card',
        themePresetId: 'modern',
        themeTokens: themePresetToThemeTokens(modern!),
        requestedPages: ['services'],
        scaffoldMode: 'selected-pages',
      },
    }, 'wizard-launch')).toThrow('Wizard selected template "missing-template-card" is not registered');
  });
});
