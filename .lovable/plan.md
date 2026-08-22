# Remove `*Body` page splitting — one file per route

## Problem

When a generated page ships without a navbar/footer, the merge step in `canonicalLaunchVfs.ts` splits the page into two modules: it moves the authored source into `HomeBody.tsx` and replaces `Home.tsx` with a chrome wrapper that imports it. That split is what produces the recurring `Identifier 'Home' has already been declared` Sandpack failures, an extra route-shaped file in the VFS, and page bodies the AI Builder no longer recognizes as the page.

## What changes

**One page = one file.** No `*Body.tsx` modules are ever created.

1. **Delete the body-split path.** In the chrome invariant loop, stop writing `<Page>Body.tsx` and stop generating chrome wrapper modules. Retire `buildPageChromeWrapper`.
2. **Chrome moves to the router for pages that lack it.** During the merge, detect per page whether the authored body already renders a nav and a footer. Pass the set of pages missing chrome to `generateCanonicalRouter`, which wraps only those routes with `<PageChromeHeader />` / `<PageChromeFooter />` around the route element. Pages that author their own chrome stay untouched, so no site can render two navbars.
3. **Purge legacy body modules.** Any `*Body.tsx` / `*Body.jsx` present in an existing snapshot or draft is removed during merge and during preview prep, so previously saved drafts recover without a relaunch.
4. **Keep the body source clean at the source.** The dedupe pass that repairs colliding declarations still runs on the page file itself before persistence, so the collision is fixed in the canonical snapshot rather than at render time.
5. **Route integrity check.** After the merge, assert every registered page resolves to exactly one VFS file and one route; log and fail loudly (recoverable-by-relaunch) if a duplicate route or orphan page file is detected.

## Technical notes

- `src/services/canonicalLaunchVfs.ts`: remove `bodyPath` writes; collect `pagesNeedingChrome`; pass it into `generateCanonicalRouter`; add the `*Body` purge and route-uniqueness assertion.
- `src/utils/topologyRouterGenerator.ts`: extend `CanonicalRouterOptions` with `chromeRoutes?: string[]` (or per-route flag) and wrap only those route elements in `buildRouterCode`. `PageChrome.tsx` stays the single chrome module.
- `src/services/wizardSharedChrome.ts`: drop `buildPageChromeWrapper`; keep `buildPageChromeModule` and `countPageChromeLandmarks`.
- `src/utils/sandpackFilePrep.ts` / `runFullPreflight`: treat `*Body.tsx` as stale and strip it, so cached drafts don't resurrect the split.
- Tests: update `src/test/wizardSharedChrome.test.ts` and `duplicateTopLevelDeclarations.test.ts`; add a case asserting a chrome-less page produces exactly one file plus a chrome-wrapped route.
