# Unison Canonical Contracts — Verified Reference

Living reference for the entity hierarchy and canonical contracts the
Unison Roadmap Architect must treat as sources of truth. Every entry below
is grounded in a specific file this agent has actually read — update an
entry only after re-reading the current source, not from memory of a prior
session. Entries marked **Unverified** are carried over from the source
playbook and still need a direct repository check before being trusted.

## Canonical identity hierarchy

```text
workspaceId -> businessId -> projectId -> draftId -> snapshotVersion -> publishedRevision
```

Route state, component props, query params, and local storage may carry
navigation hints or support crash recovery. None of them may be the
authoritative source for this tuple.

## Canonical revision/commit boundary (Stage 0) — Verified

- Only `commitMutation` in [src/services/vfsCommitService.ts](../../../../src/services/vfsCommitService.ts)
  may write `builder_drafts.vfs_files` or the metadata keys
  `siteBundleSnapshot` / `runtimeManifest` / `activePagePath`.
- Migration `20260813041305_commit_canonical_site_revision.sql` installs a
  trigger (`assert_canonical_draft_projection`) that rejects any direct
  write where those fields diverge from the draft's last committed
  `site_revisions` row.
- Pre-commit drafts (`last_revision_id IS NULL`) must have empty
  `vfs_files` and must not set those metadata keys at all.
- `WebBuilder.tsx` resolves its initial state by priority:
  `persistedResumeState` (fetched from `site_revisions` via
  `loadProjectedRevisionForDraft` / `loadLatestRevisionForProject`) >
  `pendingLauncherHandoff` (session storage) > `launchRouteState`
  (in-memory launch context). The `?id=` query param on `/web-builder`
  triggers `isExplicitProjectResume`, which forces the DB-backed load path
  on refresh/reopen.
- Every `site_revisions` row is a complete snapshot of
  `{vfsFiles, siteBundleSnapshot, runtimeManifest, activePagePath}`.

## `ArtifactDef` (Stage 1) — Verified

Defined in [src/platform/core/artifactRegistry.ts](../../../../src/platform/core/artifactRegistry.ts).
Derives from, and does not restate, four other registries: `src/sections/registry.ts`
(renderer/label/category), `catalogSurfaceRegistry.ts` (tables/fields/hydration),
`capabilityRegistry.ts`/`capabilityPacks.ts` (backend contracts), and
`intentSurfaceRegistry.ts` (intent vocabulary).

```ts
interface ArtifactDef {
  artifactId: string;
  name: string;
  description: string;
  sectionType: SectionType;       // drives PageRenderer (legacy composition system only — see note below)
  componentType: string;          // drives the VFS file
  aliases: readonly string[];
  category: 'navigation' | 'hero' | 'content' | 'catalog' | 'social-proof' | 'conversion' | 'footer';
  dataSource: {
    kind: 'catalog' | 'business-profile' | 'authored' | 'behavioral';
    surfaceId?: string;                       // resolves through catalogSurfaceRegistry
    profileFields?: readonly (keyof BusinessProfileDTO)[];
    minRows: number;
    fallbackMode: CatalogFallbackMode;
  };
  capabilities: readonly CapabilityId[];
  supportedSlots: readonly string[];          // data-ut-slot values
  intentBindings: readonly string[];          // canonical intents (data-ut-intent)
  toolbarActions: readonly ArtifactToolbarAction[];
  aiEditScope: 'content' | 'layout' | 'full' | 'locked';
  editorRoute?: string;
}
```

Key functions: `getArtifact(anySpelling)`, `resolveArtifact(anySpelling)`
(hydrates catalog/intent/capability facts), `canAIEdit(artifact, change)`,
`artifactRequiredTables(...)`, `artifactRequiredCapabilities(...)`.

**Confirmed real consumers** (as of 2026-08-13):
- `src/services/artifactHydrationPlan.ts` -> `autoEmitSectionBindings.ts` ->
  `catalogReadinessGate.ts` (readiness minRows/fallback derive from the same
  `ArtifactDef`). Called from `WebBuilder.tsx` (commit-time
  `autoEmitSectionBindings`) and `SystemLauncher.tsx`
  (`planSectionDataBindings`).
- `src/services/editScopeResolver.ts` (added 2026-08-13) — resolves the
  clicked section/component through `resolveArtifact()` and enforces
  `aiEditScope` (caps scope to `block` for `content`-only artifacts, blocks
  submission entirely for `locked`, unions `knownIntents` into
  `lockedBindings`). Wired into
  `ElementFloatingToolbar.tsx`.

**Known non-consumer — do not assume otherwise**: `src/sections/PageRenderer.tsx`
+ `src/sections/registry.ts` (`TemplateComposition`/`SectionEntry`,
`compositionToReactCode`) is a **separate legacy template-gallery/codegen
system**, not the rendering path for real Wizard-AI-generated sites. Wizard
pages are bespoke, already-compiled TSX files (see
`wizardPageCompletionRecovery.ts`), not entries in a generic `sections[]`
array dispatched through `getSectionComponent()`. There are at least 3
files literally named `PageRenderer.tsx` in this repo
(`src/sections/`, `src/components/creatives/`,
`src/components/web-builder/`) — verify which one by checking for
`data-ut-*` attribute emission and actual call sites, never by filename
alone.

## Intent contract — Verified

`src/platform/core/intentSurfaceRegistry.ts` is the single canonical
intent vocabulary. `IntentDef.handler` declares the intended transport per
intent: `'client' | 'auth-overlay' | 'stripe-checkout' | 'workflow-trigger'
| 'intent-exec' | 'site-runtime'`. `src/platform/core/coreIntents.ts` is
explicitly "DERIVED from ./intentSurfaceRegistry" (not a second parallel
registry). `getIntentDef('booking.create').handler === 'site-runtime'` —
this is the *only* intent with that handler as of 2026-08-13.

`src/runtime/intentRouter.ts`'s `handleIntent`/`invokeCanonicalIntent` is
the client dispatcher used by the builder's internal preview overlay
(`PreviewOverlayManager.tsx`) and inspector test-fire
(`ElementIntentInspector.tsx`). As of the 2026-08-13 fix (commit
`79cf0c06`), it consults `getIntentDef(intent).handler` before choosing a
transport: `'site-runtime'`-handled intents short-circuit with an honest
"Booking writes require the generated site-runtime adapter" message
instead of forwarding to `intent-exec` (which deliberately 409s all
`booking.*` intents — this is intentional hardening, confirmed by the
`src/test/launchBusinessRuntimePersistence.test.ts` suite "shuts down every
legacy Booking execution path").

## Generated-site runtime manifest — Verified

- `src/services/generatedSiteRuntimeManifest.ts` compiles
  `GeneratedSiteRuntimeManifest` at commit time
  (`compileGeneratedSiteRuntimeManifest`, called from
  `vfsCommitService.ts`). Persisted into the VFS at
  `/.unison/generated-site-runtime.json` and as an importable module at
  `/src/unison/generatedSiteRuntimeManifest.ts`.
- `src/sections/publishedActionRuntimeModule.ts` is the **real,
  production** client adapter embedded into every generated site's own VFS
  (`/src/components/publishedActionRuntime.ts`). It calls the `site-runtime`
  edge function directly via `fetch` — `submitBooking()` /
  `bookingRequestBody()` build `{operation:'action', runtimeVersion, siteId,
  action:{intent, componentId, slot, idempotencyKey, sessionId, payload}}`
  matching `supabase/functions/site-runtime/index.ts`'s
  `parseBookingAction()` contract exactly. `hydrateBookingForm()` does a
  real `'read'` operation for services/slots.
- `supabase/functions/site-runtime/index.ts`'s booking action ultimately
  calls `createCanonicalBooking` (`supabase/functions/_shared/canonicalBooking.ts`)
  -> `private.create_atomic_booking` (migration
  `20260808025525_create_private_atomic_booking.sql`), which uses
  `pg_advisory_xact_lock` + a `FOR UPDATE`/`is_booked` check for
  conflict-safe, atomic booking creation.
- `IntentBookingForm.tsx` (`src/components/creatives/web-builder/functional-blocks/`)
  is **not** referenced by any codegen/VFS-scaffolding path (verified via
  workspace-wide grep) — it is an unused/legacy component, not the real
  generated booking form.

## Business Profile / Stage 3 — Unverified

Not yet independently assessed this cycle. Doc reference: hours, staff,
locations, contact, payments, domains, SEO, and AI memory inherited by
project/runtime surfaces. `catalogReadinessGate.ts` and `site-runtime`'s
`loadBookingState` read `services`/`availability_slots`/`bookings` tables
directly by `business_id` — but no `staff` or `business_hours` table was
found in a migration grep as of 2026-08-13 (subagent-reported, not yet
independently re-verified). Treat as **Unknown** until re-checked.
