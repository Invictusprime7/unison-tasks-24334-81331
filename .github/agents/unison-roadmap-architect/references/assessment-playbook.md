# Unison Assessment Playbook — 20 Domain Modules

Source: `Unison_Coherence_Roadmap_Copilot_Skill_Source.docx` (playbook dated
2026-08-12, assessment basis snapshot 2026-08-04). This file is the detailed
reference for `unison-roadmap-architect.agent.md` — load it when a request
needs domain-specific inspection questions, required outputs, or an
acceptance gate beyond the condensed "Assessment Domains" list in the main
agent file.

Each module: **Purpose**, **Inspect**, **Decide**, **Required output**,
**Acceptance gate**.

## Engineering modules (1–10)

### 1. Canonical architecture and source-of-truth audit
Purpose: determine which contract owns every phase of website generation and project lifecycle.
Inspect: Wizard selections and launcher handoff; `SiteBundleSnapshot` creation and projection; `ProjectRuntimeEnvelope` or equivalent identity/state envelope; preview, readiness, publish, and deployment inputs; legacy registries, stores, and direct service calls.
Decide: Where can a project be created without a canonical snapshot? Which system wins when route, local, and remote state disagree? Can any surface publish from caller-supplied identity or readiness data?
Required output: authority map; competing-path register; canonical contract proposal; artifact-by-artifact migration sequence.
Acceptance gate: one versioned authority can reproduce the same project after refresh, reopen, and cross-device access.

### 2. Supabase backend, tenancy, and RLS audit
Purpose: verify the backend is structurally safe for agencies, sub-accounts, and public generated sites.
Inspect: `businesses`, memberships, projects, `builder_drafts`; catalog, booking, CRM, and site runtime tables; RLS policies, grants, and `SECURITY DEFINER` functions; edge functions and service-role boundaries; foreign keys, indexes, uniqueness, migration order.
Decide: Can one authenticated business read or mutate another tenant? Which admin operations bypass RLS and why? Do public actions derive trusted tenant identity server-side? Are draft and published-site ownership relationships explicit?
Required output: tenant ownership diagram; RLS coverage matrix; migration risk register; priority policy/index changes.
Acceptance gate: cross-tenant negative tests pass for every booking-first table and public write surface.

### 3. Booking vertical production readiness
Purpose: prove the first fully operational vertical before expanding backend enforcement.
Inspect: services, staff, locations, business hours; availability rules and time zones; conflict prevention and idempotency; booking create/reschedule/cancel; CRM contact/activity creation; confirmation and reminder delivery; published-site runtime and RLS isolation.
Decide: Is availability computed from real rows rather than fixtures? Can simultaneous requests double-book a resource? Does every booking resolve the correct business and project? What distinguishes demo success from committed booking success?
Required output: booking golden-journey trace; failure-mode matrix; schema/policy gaps; sequenced closure roadmap.
Acceptance gate: a visitor books on a published generated site; the booking, customer, and activity appear only in the correct sub-account, and conflicts are rejected.

### 4. AI Builder reliability and commit integrity
Purpose: make AI editing predictable for long prompts, scoped changes, and multi-file projects.
Inspect: prompt interpretation and intent classification; element/block/section scope resolution; multi-file plan and patch generation; VFS commit, validation, and rollback; cloud synchronization and revision ledger; preflight repair and quarantine behavior.
Decide: Can the AI distinguish request, plan, and implementation intent? Can an AI write bypass snapshot or readiness contracts? What happens when remote persistence fails after local success? Are long prompts decomposed without losing constraints?
Required output: failure taxonomy; canonical AI transaction contract; prompt-routing improvements; regression/rollback test plan.
Acceptance gate: every accepted AI change produces one validated revision, survives reopen, and can be deterministically reverted.

### 5. Artifact and component registry unification
Purpose: replace parallel component, section, catalog, and intent definitions with one canonical `ArtifactDef` contract.
Inspect: `unisonCanonicalRegistry`; `canonicalComponentRegistry`; `componentIntelligenceRegistry`; `siteElementsLibrary` registry; catalog and section data contracts; capability, binding, and intent registries.
Decide: Which registry controls generation, rendering, editing, and AI scope? Where do names, fields, or table mappings conflict? Can one artifact describe topology, data, intents, editable fields, and readiness?
Required output: registry overlap matrix; `ArtifactDef` schema; compatibility adapter plan; CI bypass-prevention rules.
Acceptance gate: a migrated artifact resolves generation, preview, data binding, AI editing, and readiness from one versioned definition.

### 6. Generated-site quality and runtime binding
Purpose: evaluate whether generated output is visually credible, context-aware, and operational.
Inspect: page topology and shared chrome; responsive layout and navigation; business-specific content; catalog and profile bindings; action and form wiring; SEO and accessibility; generated code preflight.
Decide: Does live business data replace seed content at runtime? Can a page exist in topology but not in VFS or navigation? Do generated calls-to-action map to declared intents? Are empty states intentional and vertical-aware?
Required output: quality scorecard; broken-binding inventory; representative vertical fixtures; generation acceptance suite.
Acceptance gate: a generated booking site launches with correct pages, live business data, working actions, responsive behavior, and no fallback takeover.

### 7. Preview and publishing parity
Purpose: ensure every preview adapter and published deployment represents the same revision and runtime contract.
Inspect: `unifiedPreviewPipeline`; Sandpack/VFS preview; secure iframe and external preview; Docker preview service; deployment service and runtime manifest; published readiness attestation.
Decide: Which preview path is authoritative? Can adapters compile different routers or fallbacks? Are business identity, intents, and bindings identical across modes? Can publish deploy a revision other than the visibly approved preview?
Required output: adapter contract; parity matrix; revision identity rules; end-to-end publish tests.
Acceptance gate: the approved revision produces materially identical navigation, data, and actions in editor preview, external preview, and production.

### 8. Project persistence, synchronization, and recovery
Purpose: make users trust that work is permanently saved and recoverable.
Inspect: `builder_drafts` writes and reads; legacy `design_templates` fallback; local recovery journal; launcher handoff persistence; revision history and undo/redo; cloud-sync pending and conflict states.
Decide: What is the conflict policy between local and remote revisions? Can `projectId`, `templateId`, and `draftId` still alias? Can recovery overwrite a newer remote draft? How is save status communicated to users?
Required output: persistence state machine; conflict-resolution policy; legacy retirement gate; crash/reopen recovery suite.
Acceptance gate: refresh, crash recovery, and reopening from another device restore the latest committed revision without silent overwrite.

### 9. Maintainability and repository hygiene
Purpose: reduce change blast radius and prevent architectural drift.
Inspect: `WebBuilder`/`ProjectSetup` responsibilities; controller extraction status; duplicated services/hooks; dead, experimental, and embedded repositories; package/build weight; architecture documentation versus code.
Decide: Which modules have multiple reasons to change? Which experimental systems are reachable in production? Which abstractions merely wrap duplication? What can be quarantined without breaking users?
Required output: hotspot map; extraction sequence; quarantine/remove list; ownership boundaries.
Acceptance gate: core builder changes can be made through bounded controllers and services without editing a monolithic cross-domain component.

### 10. Testing, CI, and golden-journey maturity
Purpose: convert architectural intent into enforceable release gates.
Inspect: unit and contract tests; integration and RLS tests; generated-site fixtures; preview/publish parity checks; pipeline-bypass lints; CI workflow coverage.
Decide: Which critical paths have only lint or unit coverage? Can a direct Supabase query bypass domain services? Does CI validate generated output? Which golden journey blocks release?
Required output: coverage map; missing-gate backlog; fixture strategy; release-blocking CI sequence.
Acceptance gate: CI fails when a canonical path is bypassed or the booking golden journey, tenant isolation, or preview/publish parity regresses.

## Product and UX modules (11–15)

### 11. End-to-end user journey
Purpose: find where a user loses project context, repeats setup, or receives misleading success.
Inspect: sign-up and business creation; project creation and Wizard; generation and first preview; editing and backend setup; readiness, publish, and post-publish management.
Decide: Does each step have one primary next action? When does the user understand a real business runtime exists? Where are users sent to separate modules to finish the website? Are blockers actionable from the current context?
Required output: journey map; dead-end/context-loss register; primary-action model; consolidation recommendations.
Acceptance gate: a new agency user can create, configure, publish, and operate a booking site without leaving the project context or repeating identity setup.

### 12. Project workspace product design
Purpose: define one understandable home for the website and its operating data.
Inspect: Dashboard and project pages; Tasks, Creatives, and Files; Builder and Design Studio; Business Center, Cloud, and CRM; Settings and setup routes.
Decide: Which surfaces are global versus business versus project scoped? Should a module be a route, workspace tab, or capability panel? Does every page visibly show active business and project identity?
Required output: workspace information architecture; module placement rules; project header contract; migration plan for legacy shells.
Acceptance gate: every project-scoped surface inherits the same project/business context and returns users to one canonical workspace.

### 13. Terminology and navigation architecture
Purpose: remove conceptual ambiguity between businesses, projects, drafts, templates, and sites.
Inspect: route inventory and shell metadata; navigation labels; database entity names; Wizard and builder labels; status and error language.
Decide: Can a user explain the entity hierarchy after onboarding? Are template and project still used interchangeably? Do routes preserve project context? Does legacy chrome expose competing navigation models?
Required output: canonical glossary; navigation hierarchy; route deprecation map; status-language guide.
Acceptance gate: a user can identify the active business, project, draft state, and published state from every operational screen.

### 14. Wizard and onboarding integrity
Purpose: preserve the four-step Wizard while making its output durable and operational.
Inspect: industry, template/style, theme, and summary steps; business profile gate; capability resolution and provisioning; snapshot compilation; builder handoff and recovery.
Decide: What must the Wizard ask versus infer? Does completion create durable business and project records before navigation? Can refresh resume the same launch? Are readiness requirements derived from selected capabilities?
Required output: `WizardSelections` contract; provisioning transaction; resume/recovery rules; vertical-specific acceptance fixtures.
Acceptance gate: completing the four-step Wizard atomically creates or updates the business, project, draft, and snapshot required by the builder.

### 15. Agency and sub-account readiness
Purpose: test Unison against its intended agencies, freelancers, and consultants managing client businesses.
Inspect: organization and membership model; business switching; client permissions; project ownership; billing and entitlements; white-label and export boundaries.
Decide: Can an agency manage several businesses without identity leakage? Can a client access only assigned business/project surfaces? Are admin privileges isolated from subscriber permissions? Do exports retain required runtime identity?
Required output: role matrix; sub-account journey; entitlement map; isolation and handoff tests.
Acceptance gate: agency owner, staff, and client roles see only the businesses, projects, and operations explicitly assigned to them.

## Business and operational modules (16–20)

### 16. Enterprise-readiness gap analysis
Purpose: separate production essentials from premature enterprise feature breadth.
Inspect: tenant isolation and audit logs; roles and approval boundaries; observability and incident response; backups, retention, recovery; rate limits and abuse controls; support and admin tooling.
Decide: Which controls are required for the first paid agencies? Can support diagnose a failed launch without direct database access? Are destructive operations auditable and recoverable?
Required output: readiness scorecard; minimum commercial controls; deferred enterprise backlog; operational runbook roadmap.
Acceptance gate: the first paid agency can be supported, audited, and recovered without unsafe manual intervention.

### 17. Infrastructure cost and sustainability
Purpose: determine the lowest-cost architecture that preserves reliable generated-site operation.
Inspect: Supabase database/storage/edge usage; Vercel functions, bandwidth, deployments; AI generation and repair calls; preview compute and Docker paths; background automation and email.
Decide: Which cost scales per business, project, visitor, or generation? Which compute path is redundant? Can dormant sites be served cheaply? What quotas must be enforced before public launch?
Required output: cost-driver model; usage guardrails; architecture simplifications; plan-level quotas.
Acceptance gate: expected cost per active business and published site is measurable, bounded, and compatible with planned pricing.

### 18. Competitive differentiation
Purpose: identify durable system advantages rather than feature-count comparisons.
Inspect: snapshot and contract architecture; business-runtime inheritance; artifact, intent, and automation closure; agency sub-account operation; export/runtime policy; booking-first proof.
Decide: What is difficult to imitate because it depends on integrated data and workflows? Which features are commodity AI-builder behavior? Does the architecture create switching costs through value rather than lock-in?
Required output: defensibility thesis; commodity-feature list; proof requirements; positioning language.
Acceptance gate: competitive claims are tied to demonstrated workflows, retained operational value, and measurable customer outcomes.

### 19. Commercial launch readiness
Purpose: determine what Unison can responsibly sell and support now.
Inspect: onboarding effort; booking reliability; publish success rate; support requirements; billing and entitlement enforcement; client handoff and reporting.
Decide: Which promise can be delivered repeatedly today? What still requires founder-assisted setup? Which failure would destroy agency trust? What evidence supports pricing?
Required output: sell-now offer; human-assisted scope; launch blockers; pilot success metrics.
Acceptance gate: a narrowly defined paid pilot can be delivered repeatedly with known onboarding time, support load, and booking outcomes.

### 20. Scope reduction and portfolio control
Purpose: stop disconnected capability growth from overwhelming the canonical product.
Inspect: reachable production features; disconnected services and experiments; duplicate editors and preview systems; non-core dependencies; vertical breadth versus booking proof.
Decide: Does this feature strengthen the canonical project lifecycle? Is it required for the first paying agency? Can it be quarantined without losing validated behavior? What maintenance cost does it introduce?
Required output: retain/merge/quarantine/remove matrix; feature-entry criteria; deferred backlog; repository cleanup plan.
Acceptance gate: every active production capability has a named user outcome, canonical owner, test evidence, and roadmap priority.

## Completion checklist (apply to every assessment)

- Names a concrete user outcome.
- Classifies current capability status with source evidence.
- Lists competing sources of truth and fallback paths.
- Defines the canonical owner and state transition.
- Preserves additive, no-regressions migration.
- Preserves booking-first priority and the four-step Wizard.
- States dependencies, non-scope, rollback, and legacy-removal gates.
- Covers functional behavior, persistence, isolation, parity, and recovery where relevant.
- Never calls a capability complete from a filename, plan, or UI success alone.
- Ends with one smallest high-leverage next action.
