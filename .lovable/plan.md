
# Rebase + Lane A / Lane B / Stage 4b Merge Restoration

## Goal

Return generated sites to last week's "free-styled but on-brand" quality by:
1. Removing the interaction-enrichment layer that's flattening compositions.
2. Re-sequencing generation so **every** page runs Lane A → Lane B → Stage 4b in that exact order.
3. Making Lane B retry the *only* recovery path — no canonical/minimal scaffold backfill, ever.

Today's other implementations (catalog registry, business profile, VFSCommitService, export/import, theme injection bridge in `PageRenderer`, freeze fixes, floating toolbar rewire) stay intact — they are the base we rebase onto.

---

## Pass 1 — Remove interaction enrichment entirely

**Delete/deactivate:**
- `src/services/wizardInteractionEnrichment.ts` — remove.
- `src/test/wizardInteractionEnrichment.test.ts` — remove.
- Any `<UnisonInteractionRuntime />` injection sites in `canonicalLaunchVfs.ts`, `SystemLauncher.tsx`, `wizardPlaygroundMaterializer.ts`.
- `/src/components/UnisonInteractionRuntime.tsx` synthesis in `buildCanonicalLaunchArtifacts` — remove.
- `/.unison/interaction-manifest.json` write + read — remove.
- Planner prompt path in `supabase/functions/ai-code-assistant/*` that requests the interaction manifest — remove.

**Keep:** any Framer Motion the AI itself writes into a page during Lane A/B stays untouched.

---

## Pass 2 — Formalize the three-stage merge

Single generation contract, applied per page, no exceptions:

```text
Lane A (fast composer)
   ├─ Input: SiteBundleSnapshot section plan + topology seed + industry profile
   └─ Output: free-styled JSX per selected page (composition, copy, imagery slots)

Lane B (stateful enricher)
   ├─ Input: Lane A output + templateLayoutContract + experienceContract
   │         + industryIntentProfile + catalogSurfaceSummary
   └─ Output: same JSX with data-ut-intent bindings, catalog surface wiring,
              contract-aligned CTAs, image slot resolution

Stage 4b (theme + identity stamp)
   ├─ Input: Lane B output + resolved themePresetId + templateId
   └─ Output: /src/index.css written from preset, stampTemplateLayoutIdentity
              applied, PageRenderer theme bridge active
```

**Enforcement rules:**
- `SystemLauncher.tsx` orchestrator: hard-sequence the three stages per page; no page returns until 4b stamps it.
- Home page uses the same sequence as every other page — the "Home authority (snapshot-first)" path in `snapshotProjector.ts` still owns snapshot projection, but its output is then fed through Lane B + 4b like any other page.
- `recompileFromPlayground` in `canonicalPipeline.ts`: on any post-edit recompile, re-apply Stage 4b (theme CSS + template identity stamp) so edits don't strip theme tokens.
- Threading: `experienceContract`, `templateLayoutContract`, `themePresetId`, `industry` are passed through as a single `WizardMergeContext` object to every stage and every recompile — no scattered lookups.

---

## Pass 3 — Lane-B-only recovery (no scaffold backfill)

**Remove/replace:**
- Canonical-scaffold backfill in `SystemLauncher.tsx` (`backfillFromCanonicalScaffold` or equivalent) — delete.
- Minimal-scaffold fallback synthesis in `wizardPlaygroundMaterializer.ts` and `siteTopologyPlanner.ts` — already blocked, verify assertion remains.
- `autoRepairMissingIntents` synthetic-page path — allow it to repair intents on Lane B output only, not to invent whole pages.

**New behavior:**
- If Lane B returns fewer than the selected page count → run Targeted Lane B Retry (existing) up to 2 attempts.
- If retries still miss → surface a hard, actionable error in the wizard's top-right stepper: *"Lane B could not generate: [PageName]. Retry generation or deselect this page."* Do **not** render a scaffold placeholder.
- `assertNoMinimalFallbackPreview` in `webBuilderArtifacts.ts` — keep, extend to also refuse canonical-scaffold-only pages.

---

## Pass 4 — Verify wiring end-to-end

- `themePresetId` resolution chain in `playgroundCompiler.ts` and `previewSession.ts` — verify still 5-source (seed → snapshot → manifest → launch state → recompile context).
- `PageRenderer.tsx` theme bridge — verify still rebinding `THEME.colors` → CSS vars on mount.
- `stampTemplateLayoutIdentity` — verify called on every Lane B page, not just Home.
- Run existing suite: `templateLayoutContract`, `wizardExperienceContract`, industry-hardening tests.

---

## Technical files touched

Removals: `wizardInteractionEnrichment.ts`, its test, `UnisonInteractionRuntime.tsx` synthesis.
Edits: `SystemLauncher.tsx`, `canonicalLaunchVfs.ts`, `wizardPlaygroundMaterializer.ts`, `siteTopologyPlanner.ts`, `canonicalPipeline.ts` (`recompileFromPlayground`), `playgroundCompiler.ts`, `previewSession.ts`, `webBuilderArtifacts.ts`, `supabase/functions/ai-code-assistant/contextBuilders.ts` + orchestrator.
New: `src/services/wizardMergeContext.ts` (typed carrier for the 3-stage context).

## Out of scope

- Catalog registry, business profile, VFSCommitService, export/import, freeze fixes, floating toolbar — untouched.
- No new UI. Wizard stepper copy updates only where recovery error surfaces.
- No schema/DB changes.

## Risk

Removing scaffold backfill means Lane B failures become user-visible. That's the intended trade — it's what forces the pipeline to produce real, free-styled pages instead of silently substituting flatter fallbacks.
