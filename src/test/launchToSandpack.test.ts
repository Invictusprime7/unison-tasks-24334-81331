import { describe, expect, it } from "vitest";
import { planSiteTopology } from "@/platform/core/siteTopologyPlanner";
import { buildCanonicalLaunchArtifacts } from "@/services/canonicalLaunchVfs";
import { commitToPipeline } from "@/platform/core";
import { getCompositionsBySystemType } from "@/sections/templates";
import { createLaunchState } from "@/types/launchState";
import { launchStateToSandpackFiles } from "@/utils/launchToSandpack";

describe("launchStateToSandpackFiles", () => {
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

  it("injects a safe fallback when a TSX module is prose-only", () => {
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

    const previewFiles = launchStateToSandpackFiles({
      launchState,
      vfsFiles: launchState.vfsFiles,
    });

    const recoveredPage = previewFiles["/pages/Home.tsx"] || "";
    expect(recoveredPage).toContain("Preview recovered");
    expect(recoveredPage).toContain("safe fallback was injected");
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

  it("replaces canonical placeholder pages with the selected template scaffold before preview compilation", () => {
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
    };

    const pipeline = executeCanonicalPipeline(wizardSelections);
    const sitePlan = planSiteTopology("salon", "Vela Salon", {
      selectedTemplateId: templateId,
    });

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

    const servicesPage = artifacts.files["/src/pages/Services.tsx"] || "";
    expect(servicesPage).toContain("export default function");
    expect(servicesPage).not.toContain("This page was scaffolded from the canonical playground");
    expect(servicesPage).not.toContain("Page Ready");
  });
});
