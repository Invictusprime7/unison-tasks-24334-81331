## Where Unison already matches your architecture

A lot of the model you described is already in the codebase — it just isn't finished or surfaced:

- `src/platform/core/capabilityRegistry.ts` already defines the exact `BusinessCapability` union you listed, plus `CapabilityDefinition` with `database`, `requiredTables`, intents, and dependencies.
- `src/services/businessCapabilityPlanner.ts` already produces a `CapabilityPlan` → `CapabilityProposal` with `requiresApproval: true`, `dataAffected`, `intentBindings`, `readinessAssertions`, and a `BuilderScope = 'website' | 'business-system' | 'developer'`.
- `src/types/builderRequestEnvelope.ts` + `builder-request-interpreter` already give multi-label classification, domains, capabilities, and confidence (Phase 1 intelligence foundation).
- `src/services/backendOpExecutor.ts` + `vfsCommitService.ts` + `site_revisions` already give a transactional commit path with rollback.
- `ai_builder_proposals` table + `ai-builder-propose` already draft reviewable backend changes.

So this is not a rewrite. It is closing five specific gaps.

## The five gaps

1. **The planner is regex-driven, not interpreter-driven.** `businessCapabilityPlanner` matches `/\b(book|booking|appointment)\b/i` instead of reading the envelope. Abstract prompts ("make this operate like a real salon") fall through.
2. **No approval gate surface.** `MigrationProposalPanel.tsx` exists but is mounted nowhere.
3. **No executor for schema.** `ai-builder-apply` flips status to `approved` and hands SQL back. Nothing runs it. No GRANT/RLS lint enforcement.
4. **No unified `BusinessSystemSnapshot`.** Site truth lives in `SiteBundleSnapshot`; capability truth lives in `BusinessSystemState`; data truth lives in catalog tables. Three readers, three shapes.
5. **Verification is frontend-only.** `envelopeVerifier` checks files and intents, never asserts a table/policy actually landed.

## Plan

### Step 1 — Interpreter → capability planner (replace regex)

Rewrite `businessCapabilityPlanner` to consume the `BuilderRequestEnvelope` instead of raw prompt text. Map `envelope.domains` + `envelope.requestedCapabilities` + `envelope.goals` onto `BusinessCapability[]` via a declarative table, and expand through `CapabilityDefinition.dependencies` so `booking.appointments` automatically pulls `catalog.services`, `crm.contacts`, `notifications.email`. Keep the regexes only as hints when the interpreter is unavailable.

Add `resolveBuilderScope(envelope)` so one assistant routes internally to website / business-system / developer scope, and surface that scope as a chip in the AI panel (read-only badge — the user still types one prompt).

### Step 2 — Complete the CapabilityDefinition contract

Extend the existing definitions to carry the full contract from your spec: `backend.functions/events/permissions`, `frontend.components/dataSources/supportedSlots`, `settings.accountFields/projectFields`, `readiness.assertions/fixtures`. Populate the Phase-2 four first: `business_profile`, `catalog.services`, `crm.leads`, `booking.appointments`.

### Step 3 — Approval gate (mount the proposal surface)

Mount `MigrationProposalPanel` in the WebBuilder right rail as a "Backend changes" tab, and emit a compact inline approval card in `AIBuilderPanel` when a `CapabilityProposal` is produced — showing the plain-English summary, the affected data, and the intent bindings, exactly as in your example. Approving triggers the transaction; rejecting logs and stops.

### Step 4 — Gated executor with mandatory SQL linting

- New `src/services/migrationSqlLint.ts` + a Deno twin under `supabase/functions/_shared/`: every `CREATE TABLE public.*` must be followed by GRANT, `ENABLE ROW LEVEL SECURITY`, and at least one policy. Missing any of those is a **blocker**, not a warning (today it's a warning). Deny-list stays for managed schemas, roles, and `ALTER DATABASE`.
- New database function `public.apply_capability_migration(...)` (SECURITY DEFINER, authorization-checked, logged) that executes approved SQL inside a transaction, plus a `capability_migration_runs` audit table.
- `ai-builder-apply` calls it only when: proposal is `approved`, lint is clean, and the caller is an owner/business admin. Any failure rolls back and marks the proposal `failed`.

Note: edge-function authoring stays proposal-only. Unison cannot deploy new Deno functions into its own hosted runtime from inside the app — proposals will write the source into the project VFS under `/supabase/functions/<name>/index.ts` for export, and say so honestly instead of pretending to deploy.

### Step 5 — Transaction orchestrator

New `src/services/capabilityProvisioner.ts` running your exact sequence, each step reversible:

```text
approve → apply migrations → verify RLS/GRANT → install functions
  → register intents → update snapshot → generate UI bindings
  → seed preview fixtures → compile → readiness checks → commit | rollback
```

It reuses `backendOpExecutor` for install/seed and `vfsCommitService` for the VFS half, so one approval commits both halves or neither.

### Step 6 — BusinessSystemSnapshot

New `src/platform/core/businessSystemSnapshot.ts` defining the contract you specified, built as a **projection** over existing sources (`SiteBundleSnapshot` → `site`, `BusinessSystemState` → `capabilities`, catalog registry → `data`, readiness evaluator → `readiness`). Nothing is duplicated; readers migrate to the projection one at a time (AI Builder first, then dashboard, then deployment).

### Step 7 — Backend-aware verification

Extend `envelopeVerifier` with schema assertions: after a capability provision, query `information_schema` / `pg_policies` through a read-only RPC and assert the declared `requiredTables`, `requiredColumns`, and `rlsPolicies` exist. A failed assertion feeds the same single targeted-repair turn already used for file misses.

### Step 8 — Component capability declarations (Phase 3)

Extend the component intelligence registry so each generated section declares `requiredData`, `requiredCapabilities`, `supportedIntents`, `emptyState`, `loadingState`. `ServiceGrid → catalog.services`, `BookingButton → booking.create`, `ContactForm → crm.leads`, etc. This is what lets "turn these static cards into real services" resolve deterministically.

## Technical details

- Migrations needed: `capability_migration_runs` (audit log), `public.apply_capability_migration(sql text, proposal_id uuid)`, and a read-only `public.describe_public_objects(names text[])` for verification.
- The SQL executor is the only genuinely risky addition. Mitigations: lint-as-blocker, owner/admin-only authorization inside the SECURITY DEFINER function, statement deny-list re-checked server-side, full audit row per run, and no execution path that isn't preceded by an explicit user approval on a persisted proposal.
- No changes to the wizard Lane A → Lane B → Stage 4b sequence, `SiteBundleSnapshot` authority, or theme injection.

## Positioning

Agreed on repositioning away from "AI full-stack app builder." I'll update the in-product copy (wizard headers, builder empty states) toward "Build your site, CRM, catalog, bookings, and workflows as one connected business system" as part of Step 3, since that's when the business-system surface first becomes visible.

## Suggested order

Steps 1–2 first (no infrastructure mutation, matches your Phase 1 constraint), then 3–5 as one shippable unit, then 6–8.
