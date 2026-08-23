# AI Builder surgical edits: keep canonical, stop regenerating

## Short answer to your question

No — don't drop the canonical dependency and let AI edits float on raw VFS files. That would give you fast edits and a slow-motion drift disaster: the SiteBundleSnapshot, seal, theme tokens, page registry and runtime manifest would stop describing what Sandpack renders, and the wizard→builder handoff (which already validates snapshot page coverage) would start failing again on every AI-edited draft.

The real problem is narrower: **AI file edits are being routed through the wrong canonical mode.** Today every non-wizard commit calls `runRecompile` → `recompileFromPlayground`, which is a *regeneration* stage (Stage 4b re-run). It demands wizard-grade inputs — `themePresetId`, original `themeTokens`, a healthy `PlaygroundState`, matching design-intervention mirrors — and throws when any of them drifted on a Lane A/Lane B generated draft. `vfsCommitService` catches that throw and reports "Canonical pipeline failed; nothing safe to publish", which is what the AI Builder shows as "AI edit was not applied".

A surgical edit to `/src/pages/Booking.tsx` does not need regeneration at all. It needs: apply the file op, validate, re-stamp the snapshot, persist a revision.

## What to build: a projection (non-regenerating) commit mode

Add a third canonical mode alongside `runWizardLaunch` and `runRecompile`:

```text
wizard-launch  → Lane A + Lane B + Stage 4b   (generate)
playground-edit→ recompileFromPlayground      (regenerate structure)
surgical-edit  → project existing snapshot    (NO regeneration)   ← new
```

`surgical-edit` takes the existing SiteBundleSnapshot + current VFS as truth, applies the patch's file ops, and re-derives only the derived artifacts (page registry entries, runtime manifest, snapshot `vfsFiles` mirror, seal re-stamp). It never re-runs Stage 4b, never needs `themeTokens`, and never rewrites files the AI didn't touch.

### Routing rule (classification, not a bypass)

The AI patch decides the mode:

- File ops only, all paths already registered in the snapshot → `surgical-edit`.
- Patch adds/removes/renames a page, changes topology, variants, theme, or carries `presentationOps` → `playground-edit` (existing recompile path, unchanged).
- Wizard launch → unchanged.

This keeps Lane A/Lane B/Stage 4b output recognized: the AI edits the *sealed* artifact in place instead of asking the pipeline to rebuild it.

### Validation stays on

`surgical-edit` still runs the full existing gate stack — `runFullPreflight`, the compile-safe acceptance boundary, Lucide/module repair, preview blockers — and still writes a `site_revisions` row through `commitMutation`. Nothing about durability or undo changes. Only regeneration is skipped.

### AI must see the generated runtime

So in-builder AI edits stay snapshot-aware, the AI context sent with each request includes: the resolved snapshot meta (industry, `themePresetId`, sealed `artDirectionPackId`, wizard seed), the registered page paths with their real VFS contents, and the geometry/`--ut-*` token contract — so surgical edits inherit the wizard's art direction instead of inventing new CSS.

## Technical changes

1. `src/platform/core/commitToPipeline.ts` — add `'surgical-edit'` to `CommitSource` and a `runSurgicalProjection(input)` branch that requires `siteBundleSnapshot` + `existingVfsFiles` (not `playground`, not `themeTokens`), returns the same `CanonicalPipelineResult` shape with the snapshot re-stamped from the patched files.
2. `src/services/vfsCommitService.ts` — classify before commit: choose `surgical-edit` vs `playground-edit` from the patch shape; on a canonical throw in surgical mode, report the *actual* diagnostic instead of the blanket "nothing safe to publish".
3. `src/services/aiApplyGate.ts` — pass the resolved snapshot as required input; `playground` becomes optional for surgical patches.
4. `src/components/creatives/WebBuilder.tsx` — keep `aiCommitPlayground` for structural edits; supply `snapshotForPreflight` from the same handoff revision for surgical edits.
5. AI context (`aiVFSOrchestrator` / builder request envelope) — include snapshot meta + registered page contents + token contract.
6. Tests — surgical edit to an existing page succeeds with no `themeTokens` present; a page-adding patch still routes to recompile; snapshot page coverage holds after a surgical commit.

## Live, viewable AI-edited files in the AI Builder chrome

Today the chat only lists paths behind a "View N files changed" button that hands off elsewhere. Make the edited files inspectable inline, as they are written:

- **Inline file cards** in `AIConversationMessage.tsx`: each edited path expands in place to a read-only, syntax-highlighted view of the file's new contents, with a diff toggle (before/after) sourced from the pre-patch VFS copy.
- **Streaming state**: while the AI is still writing a file, the card shows a live "writing…" state with the partial contents already received, so nothing is hidden until the run finishes.
- **Status per file**: each card shows whether that file was applied, pending review, or rejected by the commit gate — with the gate's actual reason attached to the rejected file, not just a global toast.
- **Jump-to actions**: "Open in Code" (focus the path in the editor) and "Open in Preview" (navigate the Sandpack route that renders it).
- **Rejected runs stay inspectable**: when the commit gate blocks a patch, the proposed files remain viewable in the chat so you can read what the AI produced instead of losing it.

This is presentation only — it reads the patch/VFS data the apply path already carries and does not change commit behavior.

## Out of scope

No change to the wizard pipeline, Lane B authoring, the chrome authority rules, or the Sandpack compile path.

