# Unison Tasks Consolidation and Safe Augmentation Plan

## Position

Yes, this is handleable with confidence, but only if the work is treated as a staged consolidation program rather than a sequence of isolated UI improvements. The repo already contains many of the right canonical primitives:

- `src/services/canonicalPipeline.ts` declares SiteBundle/SiteBundleSnapshot as the single source of truth.
- `src/services/unifiedPreviewPipeline.ts` is intended to be the single facade for page, route, VFS, and preview operations.
- `src/types/playground.ts` defines the structured Creator Playground model, including page registry, bindings, funnels, readiness, and setup state.
- `src/components/VFSPreview.tsx`, `src/utils/sandpackFilePrep.ts`, `src/utils/topologyRouterGenerator.ts`, and the VFS hooks form the live preview runtime.
- `src/components/onboarding/*`, `src/components/business-os/*`, `src/components/cloud/*`, `src/components/crm/*`, and `src/components/creatives/*` represent real product surfaces, but their sequence and UI ownership are not yet strict enough.

The consolidation goal is not to remove features. The goal is to make every feature enter through a canonical product sequence, render inside a consistent shell, use one derived data model, and expose readiness/blockers in the same UX language.

## Current Diagnosis

### Structural Fragmentation

The application has a broad surface area:

- `src/components`: 274 files
- `src/services`: 67 files
- `src/hooks`: 57 files
- `src/sections`: 63 files
- `src/pages`: 24 route components

This is expected for the product ambition, but it creates risk when features are added faster than orchestration and UI architecture.

Primary fragmentation vectors:

- Multiple top-level routes feel like independent products: dashboard, cloud, onboarding, creatives, design studio, CRM, web builder, project setup, team, settings.
- `src/App.tsx` directly owns route composition but not route metadata, guard policy, shell selection, or IA grouping.
- `src/components/creatives/WebBuilder.tsx` is still an overloaded orchestrator containing launch import, preview state, AI flows, page topology, route changes, VFS mutation, canvas/editor modes, and UI layout.
- There are still old and new preview/generation concepts coexisting: HTML-era helpers, React VFS generation, Sandpack prep, topology scaffolding, Fabric/canvas tooling, launch state, SiteBundle snapshots.
- UI panels expose many capable systems but often lack a single "what is ready, what is blocked, what happens next" control plane.

### UX/UI Fragmentation

The stale feeling is mostly caused by product sequence fragmentation, not just visual styling.

Symptoms to fix strictly:

- Screens use different navigation models, density, status patterns, and terminology.
- Business, project, workspace, cloud, builder, playground, and system terms are not consistently scoped.
- Setup/readiness state exists in code but is not the first-class navigation object everywhere.
- Builder panels compete for attention instead of following a primary workflow.
- AI, VFS, preview, route, intent, and publish actions appear as tools, but not as a guided operational sequence.
- Old routes are reachable as standalone surfaces even when they should be nested under a workspace/project context.

## Non-Negotiable Product Contract

Every new or refactored surface should honor this canonical sequence:

1. Identity/auth
2. Onboarding or existing workspace selection
3. Business/workspace context
4. Project/system selection
5. Builder/playground workbench
6. Readiness and setup resolution
7. Preview validation
8. Publish/deploy
9. Operate: CRM, automations, analytics, team, assets, settings

All feature entry points must answer:

- What workspace/business am I in?
- What project/system am I editing or operating?
- What is the canonical source of truth for this state?
- What is preview-ready?
- What is publish-blocked?
- What is the next recommended action?

## Architectural North Star

### Canonical State

Use this hierarchy:

1. `SiteBundleSnapshot` or full `SiteBundle`: durable product truth.
2. `PlaygroundState`: editable authoring model.
3. `PageRegistry`, `RuntimeManifest`, `PreviewManifest`: derived views.
4. `VFS files`: code artifact representation, not the business source of truth.
5. `Sandpack files`: preview artifact only.

No component should independently construct routes, bindings, or readiness if a service already derives them.

### Canonical Services

Route all work through these service boundaries:

- Generation: `canonicalPipeline.ts`
- Page/topology changes: `unifiedPreviewPipeline.ts`
- Readiness: `intentReadinessService.ts` and `playgroundControlPlaneResolver.ts`
- Preview compile: `sandpackFilePrep.ts` behind a preview facade
- VFS mutation: VFS context/hooks and `aiVFSOrchestrator.ts`
- Launch handoff: `canonicalLaunchVfs.ts`, `launcherPayload.ts`, `launchToSandpack.ts`

Components should call facades, not low-level utilities.

### Canonical UI Shell

Introduce one app shell model:

- Global shell: auth, account, workspace switcher, major product sections.
- Workspace shell: dashboard, projects, CRM, automations, assets, team, settings.
- Builder shell: preview, pages/routes, AI, files/code, setup/readiness, publish.
- Focus shell: modals/full-screen tools for canvas/editor/preview inspection.

Each shell should own:

- Left navigation or compact rail
- Header context
- Breadcrumb/context trail
- Primary CTA
- Status/readiness summary
- Empty/loading/error states

## Staged Execution Plan

### Stage 0: Baseline and Guardrails

Objective: freeze the current shape before changing it.

Actions:

- Capture route inventory from `src/App.tsx`.
- Capture feature inventory from `src/pages`, `src/components`, `src/services`, `src/hooks`, and Supabase functions.
- Run `npm run type-check`, `npm run lint`, and `npm run build`.
- Add baseline screenshots for core routes: `/`, `/onboarding`, `/dashboard`, `/cloud`, `/web-builder`, `/crm`, `/project/:id/setup`, `/settings`.
- Create a UI fragmentation register with each route's shell, context source, primary action, blockers, and stale UI risks.

Exit gates:

- Build and type-check status recorded.
- Critical user journeys documented.
- Known broken flows separated from consolidation work.

### Stage 1: Product IA and Route Contract

Objective: stop routes from behaving like unrelated applications.

Actions:

- Replace ad hoc route declarations in `src/App.tsx` with a route config object.
- Add route metadata: section, shell, auth requirement, workspace requirement, project requirement, title, description, primary action.
- Define canonical route groups:
  - Public: landing, pricing, auth, reset/callback.
  - Onboarding: onboarding, launcher.
  - Workspace: dashboard/cloud, businesses, projects, assets, team, settings.
  - Project: project overview, setup, builder, CRM, automations, files.
  - Builder: web builder, design studio, AI generation if still needed.
- Decide which standalone routes are deprecated aliases and redirect them to canonical homes.
- Add a route guard layer that can route unauthenticated users to `/auth`, incomplete users to `/onboarding`, and context-less users to workspace selection.

Exit gates:

- One route config drives navigation and route rendering.
- Every authenticated surface has a shell assignment.
- Deprecated routes are redirected or clearly marked.

### Stage 2: Unified Shell and Navigation System

Objective: make the application feel like one product.

Actions:

- Create shared shell components:
  - `AppShell`
  - `WorkspaceShell`
  - `ProjectShell`
  - `BuilderShell`
  - `ShellHeader`
  - `ShellNav`
  - `ContextBreadcrumb`
  - `ReadinessSummary`
- Move repeated dashboard/cloud/settings navigation into shell config.
- Standardize loading, empty, blocked, and error states.
- Use consistent labels:
  - Workspace = business container.
  - Project/System = buildable operational site/app.
  - Playground = structured authoring model.
  - Preview = runtime rendering.
  - Publish = deployable output.
- Put "next action" in a consistent header slot across workspace/project/builder surfaces.

Exit gates:

- Dashboard, cloud, CRM, setup, and builder share navigation grammar.
- No route invents its own unrelated product framing.
- Mobile navigation is usable and does not hide critical readiness state.

### Stage 3: Builder Workbench Consolidation

Objective: make `WebBuilder` a workbench composed of focused systems instead of a monolith.

Actions:

- Extract `WebBuilderWorkbench` as the high-level orchestrator.
- Extract panels with clear ownership:
  - `BuilderPreviewPane`: VFSPreview, active route, device mode, errors.
  - `BuilderPagesPane`: PageRouteBar, topology changes, route conflicts.
  - `BuilderAIPane`: AIBuilderPanel and task plan UI.
  - `BuilderFilesPane`: VFS explorer/editor controls.
  - `BuilderReadinessPane`: intents, setup blockers, publish blockers.
  - `BuilderPublishPane`: deployment/domain/status.
  - `CanvasEditorPane`: Fabric-only editing surface.
- Keep state mutation behind hooks/services; panels receive derived models and dispatch intentful actions.
- Remove duplicate route/page mutation logic from UI components and enforce `unifiedPreviewPipeline.ts`.

Exit gates:

- `WebBuilder.tsx` no longer owns every concern directly.
- Page creation/removal/rename always updates registry, router, VFS, and preview together.
- Preview route state and active page state cannot drift silently.

### Stage 4: Canonical Data Flow Enforcement

Objective: make SiteBundle/Playground/VFS ownership strict.

Actions:

- Add a `ProjectRuntimeContext` or equivalent route-level context that exposes:
  - workspace/business id
  - project id
  - SiteBundleSnapshot
  - PlaygroundState
  - RuntimeManifest
  - readiness report
  - VFS file map
- Convert launcher handoff payloads into canonical snapshots as early as possible.
- Remove direct construction of `RuntimeManifest`, `PageRegistry`, and router files from components.
- Create adapter functions for legacy inputs:
  - HTML/old template payload to React VFS
  - launch state to SiteBundleSnapshot
  - route state to PlaygroundState
- Mark legacy adapters as temporary and cover them with tests.

Exit gates:

- Components read derived state from context/facades.
- VFS and Sandpack artifacts are never treated as the durable product truth.
- Legacy payloads still open but are normalized immediately.

### Stage 5: Preview and Generation Pipeline Cleanup

Objective: remove competing preview truths.

Actions:

- Complete the React/VFS-only direction from `.lovable/plan.md`.
- Make `VFSPreview` the only live preview path unless a specific static fallback is explicitly selected.
- Retire or isolate HTML-era helpers:
  - `htmlToJsx.ts`
  - HTML detection in generation/extraction
  - DOMParser-based edit paths
  - `data-ut-*` only flows where React-native intent components are available
- Enforce one router strategy inside generated previews, preferably HashRouter for Sandpack compatibility.
- Add preview diagnostics:
  - compile errors
  - missing dependencies
  - missing routes
  - blank render detection
  - nested router detection
  - missing intent targets

Exit gates:

- Fresh launch, manual edit, AI edit, add-page, and publish preview all use one preview compiler path.
- Preview failures produce actionable UI, not silent blank panes.

### Stage 6: Intent, Readiness, and Setup UX Unification

Objective: turn fragmented systems into an operational control plane.

Actions:

- Promote `PlaygroundControlPlaneModel` to the visible builder/workspace status model.
- Surface readiness consistently:
  - preview-ready
  - preview-partial
  - publish-ready
  - publish-blocked
- Make every blocked intent link to the exact resolver: business info, forms, calendars, products, domain, CRM destination, payment provider, notification email, pages/components.
- Ensure CRM, automations, forms, booking, checkout, and contact flows all use canonical intent labels.
- Replace label-bound binding UI with slot-bound binding UI wherever possible.

Exit gates:

- Builder and project setup show the same blocker counts.
- Every blocked item has a direct fix action.
- Preview-only behavior is explicitly labeled as preview-only.

### Stage 7: Design System Consolidation

Objective: modernize UI by enforcing a small number of reusable patterns.

Actions:

- Audit all primary surfaces for:
  - card nesting
  - competing button styles
  - inconsistent density
  - unclear headers
  - duplicate sidebars
  - hidden critical status
  - stale hero/marketing patterns in operational views
- Define product UI tokens:
  - page background
  - panel background
  - border
  - text hierarchy
  - semantic status colors
  - command button variants
  - icon button sizes
  - workspace/project badges
- Create composable UI primitives:
  - `StatusPill`
  - `ReadinessBadge`
  - `PrimaryActionBar`
  - `SectionHeader`
  - `InspectorPanel`
  - `EmptyState`
  - `BlockingState`
  - `RouteHealthIndicator`
  - `WorkspaceProjectSwitcher`
- Apply the design system first to builder/workspace/project setup, then CRM/settings/team.

Exit gates:

- Major authenticated screens share visual grammar.
- Builder panels feel like one tool, not a collection of demos.
- No core workflow depends on decorative cards or marketing layout.

### Stage 8: Safe Augmentation Layer

Objective: add missing connective tissue without destabilizing existing systems.

Actions:

- Add feature flags or config gates for new shells and migrated builder panels.
- Use adapters around legacy systems rather than deleting them first.
- Keep old route aliases during migration, but redirect to canonical routes after validation.
- Add telemetry/logging around:
  - route entry source
  - launch handoff type
  - preview compiler path
  - readiness blockers
  - publish attempts
  - failed intent execution
- Add migration warnings in development when components import forbidden low-level utilities directly.

Exit gates:

- Users can continue opening existing projects.
- New canonical paths are used by default.
- Old paths are observable and shrink over time.

### Stage 9: Verification and Regression Net

Objective: make consolidation safe to continue.

Actions:

- Add unit tests for:
  - route config and guard behavior
  - canonical pipeline derivation
  - topology changes
  - readiness summaries
  - legacy payload normalization
- Add integration tests for:
  - onboarding to builder
  - builder add page
  - AI edit to VFS
  - preview route navigation
  - readiness blocker fix
  - project setup to publish
- Add visual/browser checks for:
  - dashboard
  - cloud/workspace
  - project setup
  - web builder desktop/mobile
  - CRM
  - settings/team
- Add bundle checks because the app is already large and builder code is heavy.

Exit gates:

- Consolidation does not regress launch, preview, AI edit, route navigation, or CRM access.
- Main flows have visual screenshots before and after.

## Recommended Implementation Order

1. Baseline inventory and verification.
2. Route config and shell metadata.
3. Shared shell components.
4. Workspace/project context consolidation.
5. Builder panel extraction.
6. Unified preview and topology enforcement.
7. Readiness/control plane UX.
8. Design system polish on migrated surfaces.
9. Legacy cleanup and route deprecation.

## First Concrete Sprint

Scope: 3 to 5 working sessions.

Deliverables:

- `src/app/routes.tsx` or `src/routes/routeConfig.tsx`
- `src/components/shell/*`
- `src/contexts/ProjectRuntimeContext.tsx`
- A migrated `/dashboard`, `/cloud`, `/project/:id/setup`, and `/web-builder` shell wrapper
- A builder readiness header powered by existing control-plane/readiness services
- Build/type-check passing

Do not start by redesigning every screen. Start by forcing shared shell, route metadata, and context ownership. Once those are in place, UI modernization becomes mechanical and safer.

## Implementation Checkpoint

Completed foundation:

- `src/App.tsx` now delegates route rendering to route config instead of owning route declarations directly.
- `src/routes/routeConfig.tsx` defines route metadata, shell assignment, chrome mode, section grouping, context requirements, and deprecated aliases.
- `src/routes/AppRouteElement.tsx` centralizes route title/body metadata, error boundaries, route metadata context, runtime context, and gated shell wrapping.
- `src/routes/routeShellModel.ts`, `src/routes/routeNavigationModel.ts`, `src/routes/routeInventory.ts`, and `src/routes/routeContractValidation.ts` now provide the canonical route/shell/navigation/audit model.
- `src/routes/routeAccessPolicy.ts` defines pure route access decisions for auth, workspace, and project requirements.
- `src/routes/routeShellActivation.ts` gates shell rollout behind `VITE_ENABLE_ROUTE_SHELLS` and canonical route chrome.
- `src/components/shell/*` provides the reusable shell frame, header, nav, breadcrumb, and status primitives.
- `src/routes/routeRuntime.ts` and `src/routes/RouteRuntimeContext.tsx` provide a route-level runtime identity contract for project, workspace, and business identity.
- Focused tests now cover route config, route access policy, navigation, shell activation, shell rendering, and runtime identity derivation.

Current verification:

- `npm run type-check` passes.
- `npm run build` passes with existing circular chunk and large chunk warnings.
- Targeted Vitest route/shell tests are defined, but the latest run was blocked by sandbox `spawn EPERM` and escalation was unavailable because of the current usage limit.

Next implementation slice:

- Use `RouteRuntimeContext` inside the first migrated workspace/project surfaces instead of re-reading route params and navigation state locally.
- Add the real `ProjectRuntimeContext` on top of route runtime identity, backed by canonical SiteBundle/Playground/readiness/VFS facades.
- Promote at least one authenticated route to `chrome: "canonical"` behind the shell gate and verify the new shell in browser/mobile before expanding the rollout.
- Start builder workbench extraction at the preview/readiness boundary, where the consolidation payoff is highest and behavior can be tested narrowly.

## Strict Rules for Ongoing Feature Work

- No new top-level route without route config metadata and shell assignment.
- No new builder feature may mutate page routes outside `unifiedPreviewPipeline.ts`.
- No new preview path may bypass the canonical VFS/Sandpack compiler.
- No component may create independent readiness language.
- No operational screen should use marketing-style layout.
- No feature should be reachable without an obvious workspace/project context unless it is public/auth/onboarding.
- No AI-generated output should become durable state until normalized into canonical files and derived models.
- No cleanup should delete legacy compatibility until a migration adapter and tests exist.

## Confidence Assessment

I can handle this confidently in staged form because the repo already contains the core concepts needed for consolidation. The risk is not technical impossibility; the risk is changing too many product surfaces at once. The safe path is to enforce contracts first, migrate surfaces into those contracts, then modernize UI with a shared shell and control-plane model.
