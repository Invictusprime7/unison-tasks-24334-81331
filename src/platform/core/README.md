# `@/platform/core` — The Unison Brainstem

Single canonical surface for every contract that drives the platform. Wizard,
AI Builder, Playground, Preview, Publish, and Runtime all consume from this
module — nothing else is allowed to construct these types independently.

Execution hierarchy this surface enforces:

```text
Contracts (this module)
  → Schemas (blueprintSchema, routePolicy, slotBindingPolicy)
    → SiteBundleSnapshot (commitToPipeline output)
      → Runtime (runtimeManifest, intent executor)
        → UI (Web Builder, Preview, Publish)
```

## Module map

| File | Role | Primary consumers |
| ---- | ---- | ----------------- |
| `coreIntents.ts` | Canonical `CoreIntent` enum + classification helpers | Runtime, AutoBinder, slot resolver, intent classifier |
| `intentSurfaceRegistry.ts` | Single source of truth for intent **handler + surface taxonomy** (`INTENT_REGISTRY`, `getIntentDef`, `intentSurfaceRegistry`) | Slot resolver, AI prompt builders, Intent Inspector |
| `intentNormalizer.ts` | Normalizes loose / legacy intent strings to canonical `CoreIntent` | Wizard ingestion, AI patch normalization |
| `blueprintSchema.ts` | `BusinessBlueprint` Zod schema + types | Wizard Launcher, AI generator, validators |
| `capabilityRegistry.ts` | `CAPABILITY_REGISTRY`, `CapabilityId`, capability definitions | Provisioning validator, PublishGate, capability panel |
| `routePolicy.ts` | `RoutePolicy` model — path/pageId/ownership | Topology planner, router generator |
| `slotBindingPolicy.ts` | Slot ↔ binding resolution policy (resolved/unresolved sets) | AutoBinder, contract compiler, GateVerdictStrip |
| `industryMatrix.ts` | Industry → layout/color/intent defaults | Wizard, AI prompts |
| `iconIntentRegistry.ts` | Interactive-icon intent registry (`InteractiveIcon`) | Runtime icon component, AutoBinder |
| `provisioningValidator.ts` | `validateProvisioning` → `ProvisioningReport` (handler/overlay/route/workflow checks) | Contract compiler, capability panel |
| `siteTopologyPlanner.ts` | `planSiteTopology` — graph-first site plan | Wizard Launcher, Playground hydration |
| `playground.ts` | `PlaygroundState` model — pages, funnels, intents, bindings | Creator Playground, commitToPipeline |
| `integrityReport.ts` | `IntegrityReport` aggregator for structural + AI diagnostics | Debug Agent, Builder integrity panel |
| `runtimeManifest.ts` | `RuntimeManifest` — what the preview/runtime actually loads | Preview compiler, runtime intent executor |
| `canonicalPipeline.ts` | End-to-end pipeline orchestration types | `commitToPipeline`, AI orchestrator |
| `commitToPipeline.ts` | **Only legal mutation entry** (Wizard / AI Builder / Playground / Republish) | Wizard Launcher, Builder save, AI patch commit |
| `contractCompiler.ts` | Compiles `SiteBundleSnapshot` → `CompiledContract`; defines `PreviewGate` / `PublishGate` predicates and `PublishBlocker` taxonomy | Gates, Deploy pipeline, GateVerdictStrip |
| `contractGuard.ts` | Silent-retry-then-surface enforcement for AI patches | AI patch executor |
| `pipelineGuard.ts` | Pipeline-level invariant checks | commitToPipeline, CI |
| `gates.ts` | First-class `PreviewGate` / `PublishGate` `Gate<T>` objects, `evaluateAllGates`, `GateFailedError` | GateVerdictStrip, DeployButton, publish edge function |
| `index.ts` | The canonical barrel — **always import from `@/platform/core`** | Everything |

## Gate ladder

Gates are strictly tighter the further right you go:

```text
PreviewGate ⊂ PublishGate
```

- `PreviewGate` — validation OK + provisioning preview-ready + `/` route exists + at least one primary-cta binding.
- `PublishGate` — everything `PreviewGate` requires, **plus** no unresolved slots, no blocked bindings, and no business-critical capability (`commerce`, `auth`, `booking`, `lead-capture`, `quoting`, `donation`) is stubbed or has an unprovisioned workflow.

Use the `Gate<T>` objects (`evaluate`, `assert`) in new code; the legacy
`isPreviewReady` / `isPublishReady` / `getPublishBlockers` helpers remain as
thin back-compat exports.

## Layer consumption matrix

| Layer | Reads | Writes |
| ----- | ----- | ------ |
| **Wizard Launcher** | blueprintSchema, industryMatrix, siteTopologyPlanner, capabilityRegistry | `commitToPipeline` only |
| **AI Builder (Lane A & B)** | intentSurfaceRegistry, coreIntents, contractGuard, integrityReport | `commitToPipeline` only |
| **Creator Playground** | playground, routePolicy, slotBindingPolicy, capabilityRegistry, gates | `commitToPipeline` only |
| **Preview compiler** | runtimeManifest, routePolicy, iconIntentRegistry | — (read-only) |
| **Runtime** | coreIntents, intentSurfaceRegistry, iconIntentRegistry, runtimeManifest | — (read-only) |
| **Publish / DeployButton** | gates, contractCompiler (`PublishBlocker`) | — (read-only) |
| **CI / pipelineGuard** | pipelineGuard, integrityReport, gates | — (assertions only) |

## Hard rules

1. **No parallel sources of truth.** If a layer needs a contract type, it imports from `@/platform/core`. Period.
2. **`commitToPipeline` is the only mutation entry.** Wizard, AI patches, Playground edits, and Republish all funnel through it.
3. **Gates compose; they do not duplicate.** New gates land in `gates.ts` and register in the `GATES` map so `evaluateAllGates` discovers them.
4. **No YAML migrations.** YAML is optional sugar around these contracts — never an alternative source of truth.
5. **Schemas before runtime.** Anything the runtime executes must first be representable in `SiteBundleSnapshot` / `RuntimeManifest`.
