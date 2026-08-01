---
name: Artifact Registry (Phase 3)
description: ArtifactDef in src/platform/core/artifactRegistry.ts is the canonical artifact ↔ data source ↔ intent ↔ capability ↔ toolbar ↔ AI-scope map; derives from existing registries, never restates them.
type: feature
---

`src/platform/core/artifactRegistry.ts` is the single canonical description of every visual artifact Unison can place on a generated site. Exported through `@/platform/core`.

**It derives, never duplicates.** Catalog facts (tables, editable fields, min rows, fallback mode) come from `catalogSurfaceRegistry`; intent validity from `intentSurfaceRegistry`; capability labels from `capabilityRegistry`. Adding a table map, field list, or intent list outside this chain is a violation.

`ArtifactDef` fields: `artifactId`, `name`/`description`, `sectionType` (PageRenderer key), `componentType` (VFS file), `aliases`, `category`, `dataSource`, `capabilities`, `supportedSlots`, `intentBindings`, `toolbarActions`, `aiEditScope`, `editorRoute`.

`dataSource.kind` is one of:
- `catalog` — rows in a catalog table, carries `surfaceId`
- `business-profile` — fields on `public.businesses`, carries `profileFields`
- `authored` — copy owned by the SiteBundleSnapshot
- `behavioral` — no content, behaviour only (CTA)

`aiEditScope` gates the AI patch pipeline via `canAIEdit(artifact, 'content' | 'layout' | 'bindings')`:
`content` < `layout` < `full`, plus `locked` (AI must never author). Catalog artifacts are `layout` — AI may rearrange but never rebind data. Navbar/footer are `content`.

API: `getArtifact` (resolves artifactId/componentType/sectionType/alias, case- and separator-insensitive), `resolveArtifact` (hydrated view with `catalogSurface`, `requiredTables`, `editableFields`, `knownIntents`, `capabilityLabels`), `listArtifacts`, `listArtifactsByDataSource`, `listArtifactsForCapability`, `artifactRequiredTables`, `artifactRequiredCapabilities`, `canAIEdit`, `artifactSupportsAction`, `describeArtifactForAI` (token-budgeted prompt line).

Phase 3 landed additive: no existing registry or code path was modified, callers opt in. Unknown artifacts return `null` so legacy paths stay authoritative. Tests: `src/test/artifactRegistry.test.ts`.

Sequence agreed with the user: Phase 3 (registry) → Phase 2 (backend→UI wiring) → Phase 4 (Business Profile nucleus) → Phase 6 (AI context engine). Phase 1 (canonical business object) folds into Phase 4.
