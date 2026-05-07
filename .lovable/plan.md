Creator Playground V2 — Launch Control

Redesign the Creator Playground into a page/funnel-level **Launch Control** workspace. Each page exposes its CTAs, bindings, forms, products, popups, workflows, webhooks, and CRM routing in one structured setup interface, auto-populated from the Wizard Launcher output and editable by the user.

## Scope (MVP — first milestone)

Build the V2 shell + 4 priority tabs only. Defer Popups, Workflows, Webhooks, SEO, Products to a follow-up.

**Tabs in MVP:** Overview · CTA · Bindings · Forms · Readiness
**Modes in MVP:** Page Setup (default), Funnel Flow (read-only graph), Business Systems (placeholder)

## Architecture

Single config object drives the UI:

```ts
type CreatorPlaygroundConfig = {
  businessId: string;
  projectId: string;
  pages: PageConfig[];
  funnel: FunnelConfig;
  ctas: CTAConfig[];
  bindings: ComponentBindingConfig[];
  forms: FormConfig[];
  productsServices: ProductServiceConfig[];
  popups: PopupConfig[];
  workflows: WorkflowConfig[];
  crm: CRMConfig;
  webhooks: WebhookConfig[];
  readiness: ReadinessItem[];
};
```

Sourced from existing canonical state (SiteBundleSnapshot + PageRegistry + site_intent_bindings + builder_drafts.metadata). No new DB tables in MVP — read existing data, write back through existing services (PageRegistry, IntentBindings, slot binding policy).

## File structure

```text
src/components/creatives/web-builder/playground-v2/
├── CreatorPlaygroundV2.tsx            (shell: header + mode tabs + 3-pane layout)
├── PlaygroundHeader.tsx               (business / page context bar + readiness %)
├── PlaygroundModeTabs.tsx             (Page Setup | Funnel Flow | Systems)
├── PlaygroundCategoryRail.tsx         (left rail: Overview/CTA/Bindings/Forms/Readiness)
├── PlaygroundWorkspace.tsx            (center router by category)
├── PlaygroundAssistantRail.tsx        (right rail: contextual AI suggestions, stub)
├── tabs/
│   ├── OverviewSetupTab.tsx
│   ├── CTASetupTab.tsx
│   ├── BindingsSetupTab.tsx
│   ├── FormsSetupTab.tsx
│   └── ReadinessSetupTab.tsx
├── cards/
│   ├── SetupStatusCard.tsx
│   ├── CTACard.tsx
│   ├── BindingCard.tsx
│   └── FormConfigCard.tsx
└── hooks/
    ├── useCreatorPlaygroundConfig.ts  (assembles config from canonical sources)
    ├── usePlaygroundReadiness.ts      (derives readiness % per page)
    └── useDetectedButtonBindings.ts   (scans VFS pages for buttons + suggests intents)
```

## Data wiring

- **pages / funnel** ← Playground PageRegistry + topology persisted in `builder_drafts.metadata.siteTopology`
- **ctas / bindings** ← `site_intent_bindings` table + slotBindingPolicy.resolveSlotBindings on the active SiteBundleSnapshot
- **forms** ← scan VFS `/src/pages/**/*.tsx` for `<form data-ut-intent="...">` + form intent registry
- **readiness** ← derived: required intent slots filled, CRM target set, capability stubs from `isPublishReady`/`getPublishBlockers`
- **assistant suggestions** ← `getPublishBlockers(compiledContract)` mapped to one-line action items

## Mount point

Replace the current Creator Playground entry inside the Web Builder shell behind a feature flag `playground_v2` (default on for new sessions, fall-through to legacy if config fails to load). Existing `CreatorPlayground.tsx` is left untouched.

## Out of scope (next milestones)

- Popups, Workflows, Webhooks, Products/Services, SEO/Tracking tabs (stubs only)
- Funnel Flow node editing (read-only viz first)
- Business Systems global editors
- New DB tables for popups / workflow versions
- AI auto-fix execution (button shows "Coming soon" toast in MVP)

## Acceptance

1. Selecting a page shows its CTAs, detected buttons, forms, and a readiness score in one screen.
2. Each CTA / binding card shows label, intent, target, status, and is editable inline.
3. Readiness checklist mirrors `getPublishBlockers` output and links into the relevant tab.
4. No regression to existing Web Builder routes; legacy Playground still mountable via flag off.