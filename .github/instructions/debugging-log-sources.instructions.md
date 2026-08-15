---
description: "Use when debugging a runtime error, freeze, or bug and you need to know where a Unison subsystem actually logs — console prefixes, terminal output, or Supabase logs — instead of guessing which file to grep."
applyTo: "src/**"
---

# Where each Unison subsystem logs

Console messages are prefixed with the emitting module in brackets. Grep the
exact prefix instead of a generic keyword — it goes straight to the source file.

## Wizard / System Launcher (client-side generation pipeline)

Browser DevTools console, during `handleLaunch`:

- `[SystemLauncher]` — src/components/onboarding/SystemLauncher.tsx (the whole launch transaction: plan/seed/enrich/preflight/commit/handoff stages)
- `[WizardStage4b]` — src/services/wizardStage4bRuntime.ts (worker-offloaded `commitToPipeline`; `worker unavailable` warning means it fell back to the main thread)
- `[canonicalLaunchVfs]` — src/services/canonicalLaunchVfs.ts (final artifact build: preflight repair, snapshot merge, strict import-contract check)
- `[sandpackFilePrep]` / `[Preview]` — src/utils/sandpackFilePrep.ts (VFS→Sandpack prep, import rewriting, JSON-wrapper unwrapping)
- `[launchRun]` — src/services/launch/launchRun.ts (`degraded <stage>/<code>` lines are non-fatal degradations recorded for `publishLaunchDegradations`, not failures)
- `[runFullPreflight]`, `[preflightNavWiring]` — src/services/runFullPreflight.ts, src/services/preflightNavWiring.ts
- Thrown `PreviewPipelineError` (src/services/previewPipelineError.ts) — the authoritative "refusing to persist" failures; check `.summary`/`.details.blockedFiles`.

## Preview / Sandpack rendering

- `[VFSPreview]` — src/components/VFSPreview.tsx (compile scheduling, `launchSignature`/`compiledKeyRef` skip decisions, Sandpack crash boundary)
- The Sandpack iframe has its **own separate console** — open its DevTools directly (right-click inside the preview iframe → Inspect) for errors inside the generated app itself, not the host app's console.
- `[LaunchToSandpack]` — src/utils/launchToSandpack.ts (LaunchState → Sandpack file conversion)

## Web Builder

- `[WebBuilder]` — src/components/creatives/web-builder/WebBuilder.tsx (override application, floating-toolbar edits, iframe DOM patching)
- `[AIBuilderPanel]`, `[AIAssistantPanel]` — src/components/creatives/web-builder/ (in-builder AI edit flow)
- `[RevisionLedgerStatus]` — src/components/web-builder/RevisionLedgerStatus.tsx (commit/revision resync failures)
- `[recordManualPageEdit]`, `[recordManualVFSEdit]`, `[applyMutatorAcrossVFS]` — snapshot-before-mutation failures in WebBuilder.tsx

## Business Center

- `[CloudProvider]` — src/contexts/CloudContext.tsx (organization/business resolution)
- `[CloudProjects]`, `[CloudSecurity]`, `[CloudTeams]`, `[CloudAutomations]`, `[CloudProfile]` — src/components/cloud/ (per-tab data loading)
- `[BusinessCatalogEditor]`, `[catalogRowService]`, `[catalogRuntime]`, `[catalogCollectionService]` — catalog/product data
- `[IntentBindingService]`, `[ExecutionLogger]` — src/services/ (intent → controller dispatch and its audit trail)

## Generated-site runtime (published sites)

- The published site's own browser console is **unprefixed** — it's the end user's app, not Unison platform code.
- Server-side reconciliation failures surface via the `reconcile-generated-runtime` Edge Function (see below), not the client console.

## Supabase Edge Functions

Prefix matches the function's folder name, e.g. `[agent-runner]`, `[orchestrator]` (ai-code-assistant), `[automation-runtime]`, `[ghl-webhook]`, `[plugin-event-ingest]`, `[reconcile-generated-runtime]`.

View them via:
- `supabase functions logs <function-name>` (CLI), or
- the `query_logs` / `get_advisors` MCP tools — **read these before touching remote state**, never guess at a backend failure from the client side alone.
- `list_tables` / `list_migrations` before any schema-related fix.

## Build / test / dev server

- Vite dev server terminal — compile errors, HMR failures.
- `npx vitest run <file>` — the narrowest reproduction for a reported test failure; widen to the full suite only after the specific file passes.
- `npm run type-check` (`tsc --build --noEmit`) — whole-workspace type errors; the Unison Runtime Debugger agent runs this automatically after edits (see its `PostToolUse` hook).
- `npm run lint:pipeline-bypass`, `npm run lint:single-source-of-truth` — this repo's own architectural guards, not generic ESLint.

## Repo memory (check before re-diagnosing)

`/memories/repo/testing-gotchas.md`, `canonical-commit-boundary.md`, `builder-controller-wiring.md`, `repo-hygiene-cleanup.md` — known gotchas and verified practices from prior debugging passes in this exact workspace.
