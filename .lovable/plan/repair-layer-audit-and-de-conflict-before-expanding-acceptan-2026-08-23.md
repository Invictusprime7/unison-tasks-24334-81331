# Repair-layer audit and de-conflict (before expanding acceptance)

Agreed — expanding acceptance on top of the current stack would add a sixth opinion to a defect that already has five. The audit below is from reading the actual call sites; the conflicts are real, not hypothetical.

## What the audit found

### 1. Two orchestrators that are supposed to be the same, and aren't

`src/services/runFullPreflight.ts` runs 7 ordered stages (token guard, icon authority, early syntax repair, nav wiring, forbidden-intent strip, required-intent closure, final repair, module closure, compile-safe, bundle topology). Its header comment says the order "must match canonicalLaunchVfs".

It does not match. The launch path in `src/services/canonicalLaunchVfs.ts` (around lines 920-960) runs only two of those stages inline — module-closure repair, then compile-safe acceptance — and never calls `runFullPreflight`. So a wizard launch and a builder commit apply different repair sets to the same kind of file.

### 2. The same repair runs 2-3 times in different places

- Canonical token stripping: `runFullPreflight` stage 0 and again inside `sandpackFilePrep` (~line 5270).
- Lucide icon repair: `runFullPreflight` stage 0b and again in `sandpackFilePrep` (~lines 5497 and 6645).
- Module-closure repair: `runFullPreflight` stage 5b, `canonicalLaunchVfs` line 929, the AI wrapper `repairModuleClosureWithAI`, plus separate calls in `SystemLauncher.tsx` (4122) and `useTemplateFiles.ts` (269).
- Compile-safe acceptance: `runFullPreflight` stage 6, `canonicalLaunchVfs` line 943, and the internal retry loop in `acceptGeneratedBundle`.

Repeating an idempotent pass is only wasteful; repeating a *lossy* pass (drop, strip, prune) compounds.

### 3. Five different policies for one defect: "module X does not resolve"

| Layer | What it does |
|---|---|
| `moduleClosureRepair` step 1 | Rewrites the specifier to a path-variant match |
| `moduleClosureRepair` step 2 | Deletes the import if the binding looks unused |
| `moduleClosureRepair` AI stage | Asks the AI to inline the component |
| `aiSitePreflightRepair` | Replaces the file with a quarantine component |
| `canonicalLaunchVfs` (added last turn) | Prunes the page from the registry and router |
| `sandpackFilePrep` | Synthesizes a placeholder for builder drafts, throws for wizard drafts |

Whichever runs first wins, and they disagree. A page can be dropped by one layer, then pruned by another, then still throw in prep because a third layer re-added the import.

### 4. Failures are swallowed, so a skipped repair looks like a clean one

Nearly every stage in `runFullPreflight` and `canonicalLaunchVfs` is wrapped in `try/catch` that logs a warning and continues with the previous file set. A stage that throws is indistinguishable downstream from a stage that had nothing to do. `canonicalLaunchVfs` also merges results with `Object.assign`, so a partially-applied repair silently overwrites a good file.

### 5. The compiled bundle is not the bundle that was validated

`sandpackFilePrep` keeps mutating after every gate has passed: it strips nested routers, rewrites self-referencing imports, auto-injects JSX imports, synthesizes missing exports, and adds default exports. Those mutations can reintroduce exactly the class of defect the gates just cleared, and nothing re-validates afterward.

## The plan

### Step 1 — Single repair pipeline, one owner

Make `runFullPreflight` the only orchestrator. `canonicalLaunchVfs` calls it instead of hand-rolling closure + compile-safe; `SystemLauncher` and `useTemplateFiles` stop invoking module-closure repair directly and consume the pipeline result. Every stage becomes idempotent and re-runnable, and the pipeline returns a structured report of what each stage did.

### Step 2 — One policy table for unresolved modules

Replace the five competing behaviors with one ordered ladder, applied in exactly one place:

```text
1. resolve   — specifier drift / casing / directory  (existing, keep)
2. recover   — canonical Stage 4b body or composition JSON for the page
3. synthesize— usage-derived module (only where a body is impossible)
4. drop      — import is provably dead
5. prune     — non-home route with no possible module
6. halt      — nothing above applied
```

Later steps may only run when every earlier step declined. Quarantine stays for parse failures only, not for missing modules.

### Step 3 — Stages report instead of swallowing

Each stage returns `applied | declined | failed` with the paths it touched. `failed` is surfaced in the launch journey and can block commit; it can no longer masquerade as `nothing to do`.

### Step 4 — `sandpackFilePrep` becomes projection-only

Move its repair behaviors (router stripping, self-import rewrite, JSX import injection, export synthesis, icon rewriting) into the single pipeline so they run before validation. What remains in prep is the `/src` → root overlay flattening plus the final assertions.

### Step 5 — Only then, expand acceptance

With one ladder in place, add deterministic usage-derived synthesis (step 3 above): read the importing file's JSX usage and emit a real typed module that renders its children and known props, stamped `// @unison-synthesized` and reported as a completion gap — instead of an empty component or a hard stop.

## Technical notes

- Edited: `src/services/runFullPreflight.ts` (owner + stage reports), `src/services/canonicalLaunchVfs.ts` (delegate, drop inline stages, keep pruning as ladder step 5), `src/services/moduleClosureRepair.ts` (implement the ladder), `src/utils/sandpackFilePrep.ts` (strip repairs, keep projection + assertions), `src/components/onboarding/SystemLauncher.tsx` and `src/hooks/useTemplateFiles.ts` (consume the pipeline).
- New: `src/services/companionModuleSynthesis.ts` for step 5.
- Tests: pipeline idempotence (running twice changes nothing), each ladder rung in isolation, ladder ordering (a recoverable page is never dropped or pruned), stage-failure propagation, and the existing wizard VFS / preview smoke suites unchanged.
- Invariants kept: SiteBundleSnapshot stays canonical truth; no minimal/fallback preset bodies; Lane A → Lane B → Stage 4b authority unchanged.
