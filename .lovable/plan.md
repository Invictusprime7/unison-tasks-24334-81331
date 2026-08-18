# Fix: two navbars and two footers on generated sites

## What is actually happening

Generated sites have **two separate systems that each render site chrome**, and nothing reconciles them.

1. **Router-level chrome (global).** The canonical router always renders a shared navbar and footer around every route. `src/services/canonicalLaunchVfs.ts` builds the router with shared chrome enabled unconditionally, and `src/utils/topologyRouterGenerator.ts:178-208` emits `<SiteNavbar />` above the routes and `<SiteFooter />` below them. Those two files come from `src/services/wizardSharedChrome.ts`, which renders a sticky `<header>` with `NavLink`s and an active-state pill.

2. **Page-level chrome (per page).** Every page body is compiled from a composition whose `SECTIONS` array still contains `navbar` and `footer` sections. `src/sections/compositionToFileSet.ts:1081,1185` maps those section types to the local `Navbar`/`Footer` components (`:199-238`, `:540-579`), which render a second sticky `<header>` and a second `<footer>` inside the page.

In the screenshot: the first bar with the red "Home" pill is the router's `SiteNavbar` (that pill is `isActive ? bg-primary text-primary-foreground` in `wizardSharedChrome.ts`). The bar directly below with the brand mark and Gallery/Services/About/Contact is the page composition's `Navbar` section. Same duplication for footers at the bottom.

3. **A third possible source.** Lane B (the AI page author) may also hand-author `<header>`/`<footer>` markup. `wizardPresentationGuard.ts:171` rejects only `<nav`/`SiteNavbar` — `<header>` and `<footer>` are allowed, and the semantic-region check at `:177-179` actually counts `header`/`footer` toward passing. Even when a page is rejected, `SystemLauncher.tsx:3779-3790` only marks the launch `lane-b-degraded`; the offending file still ships.

## Direction

Make **shared chrome the single chrome authority**, because it owns real router navigation (`NavLink`, active state, `nav.goto` intents) and is snapshot-owned so the AI cannot overwrite it. Page bodies stop rendering chrome entirely.

To keep the design cohesion the art-direction work just landed, the shared navbar/footer are generated **from the sealed art-direction pack's `navbarFamily` / `footerFamily` variant**, so a `cinematic-portfolio` site still gets its minimal dark nav rather than a generic bar.

## Changes

1. **Strip chrome sections from page compositions.** In `src/sections/compositionToFileSet.ts`, filter `navbar` and `footer` section types out of the emitted `SECTIONS` when the site uses shared chrome, and stop emitting the now-unused `Navbar`/`Footer` page modules for those pages.

2. **Style shared chrome from the sealed pack.** Extend `src/services/wizardSharedChrome.ts` to accept the resolved `artDirectionPackId` and emit the pack's navbar/footer variant styling using `--ut-*` tokens only (no hardcoded geometry, so the pipeline lint guard stays green). Thread the pack id from `canonicalLaunchVfs.ts` where chrome is generated.

3. **Close the AI chrome hole.** Extend `generatedPageFallbackReason` in `src/services/wizardPresentationGuard.ts` to reject page-level `<header>`/`<footer>` chrome, and stop counting `header`/`footer`/`nav` toward the semantic-region minimum. Add an explicit rule to the Lane B brief (`src/services/wizardGenerationBrief.ts`) and the builder prompt: pages author body content only; navigation and footer are owned by the shared layout.

4. **Make rejection actually remove duplicate chrome.** In `SystemLauncher.tsx`, before merging Lane B output, strip page-level `<header>`/`<footer>` chrome blocks from AI files (or fall back to the canonical body for that page) instead of only flagging `lane-b-degraded`.

5. **Regression test.** A test asserting a compiled wizard site has exactly one `<header>`-rendering chrome component and one `<footer>` across router + page files.

## Alternative (if you'd rather keep page-level chrome)

Drop `<SiteNavbar />`/`<SiteFooter />` from the router and keep the composition's variant-driven navbar/footer. This preserves per-page art direction but loses router-aware active-nav state and re-exposes chrome to AI overwrite. The plan above is the recommended one.
