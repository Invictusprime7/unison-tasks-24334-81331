
# Launcher-Native Intent Wiring (Milestone 1, revised)

## Premise

Drop the "install pack seeds bindings post-hoc" approach. Instead, the **System Launcher's AI generation path** itself emits fully-wired intents — deterministically — at the moment it produces each page. By the time the wizard hands off to Builder, every CTA, form, and nav link is already bound. No second pass, no pack-based seeding, no AI binding tool call.

## Current state (verified)

- `install-system` declares per-system intent bindings including `cart.add`, `checkout.start`, `reservation.submit` — **none exist in `CORE_INTENTS`**. `isCoreIntent()` rejects them silently.
- `jsxTemplates.ts` `renderButtons()` emits raw `<a href="...">` with **no `data-ut-slot` and no `data-ut-intent`**. Wizard-generated sites have nothing for the runtime to bind to.
- Forms in section templates emit `data-intent="contact.submit"` / `newsletter.subscribe`, but adjacent buttons carry nothing.
- 5 guards (`isCoreIntent`, `TemplateIntentButton`, `deterministicIntentUi`, `applyButtonBinding`, publish gate) all read different slices of truth.
- `defaultIntentBindingsForSystem` in `install-system` would be written *after* the page TSX is already serialized — too late and structurally disconnected from the actual buttons it claims to bind.

## Goal

The **AI generation path** is the single moment intents get wired. Every interactive element the wizard emits is stamped with `data-ut-slot` + `data-ut-intent` in the generated TSX, and a matching row is written to `site_intent_bindings` as part of the same transaction. Runtime executes them via the existing `TemplateRuntimeProvider` → `intentRouter` chain on first boot. No post-install pack, no AI binding pass.

## Approach (4 phases)

### Phase 1 — Honest, launcher-derived intent registry
Build `src/intents/registry.ts` from the **union** of intents the launcher's AI generation path actually emits across the 6 system types:

```
booking    → booking.create, contact.submit, newsletter.subscribe
store      → cart.add, cart.view, checkout.start, product.view, contact.submit, newsletter.subscribe
content    → newsletter.subscribe, contact.submit
agency     → lead.capture, contact.submit, newsletter.subscribe
portfolio  → contact.submit, lead.capture
saas       → auth.login, auth.register, lead.capture, contact.submit, newsletter.subscribe
all        → nav.goto, nav.external, nav.anchor
```

~14 intents, every one grounded in shipped section templates. Each entry carries: name, namespace, payload schema (zod), surface (`inline | overlay | redirect | client`), handler ref, aliases (legacy `auth.signin` → `auth.login`, `pay.checkout` → `checkout.start`), status (`stable | preview`).

`CORE_INTENTS` becomes a derived view. All 5 guards read from the registry — single source of truth. Migration shim keeps existing intents working.

### Phase 2 — Slot stamping in the AI generation path
The Wizard already runs through `generate-page` / `generate-fullstack-app` edge functions which assemble TSX from `jsxTemplates.ts` + AI-authored sections. Insert a deterministic **stamp pass** at the end of generation, before serialization:

- `jsxTemplates.ts::renderButtons()` is patched to receive `(buttons, sectionVariant, systemType, pageContext)` and emit:
  - `data-ut-slot="{sectionVariant}.cta.{index}.{primary|secondary}"`
  - `data-ut-intent` resolved by `resolveIntentForSlot(systemType, sectionVariant, button.label, pageContext)` — a pure deterministic function
  - `data-ut-target-page-id` when intent is `nav.goto`
- Same treatment for FAQ accordions, Gallery thumbnails, Pricing tier CTAs, Navbar links, Footer links.
- React-based sections (`src/sections/components/*`) get the same stamper applied at render time via a shared helper.

The resolver is a small ruleset, not an AI call:
- `systemType === 'store'` + label matches `/buy|add to cart|shop/i` → `cart.add`
- `systemType === 'booking'` + hero CTA → `booking.create`
- `systemType === 'saas'` + nav-bar CTA → `auth.register`
- Footer "Subscribe" / newsletter input → `newsletter.subscribe`
- Pricing tier CTA → `checkout.start` (store) or `contact.submit` (agency)
- Fallback for unknown → `contact.submit` (always safe)

Deterministic, idempotent, no LLM. Output is identical for identical inputs.

### Phase 3 — Inline binding persistence during generation
The wizard generation flow already writes `builder_drafts` + scaffolds VFS. Add one step in the same transaction:

- After `jsxTemplates` produces the page TSX, walk it (cheerio or a regex pass — TSX is already a known shape) collecting every `data-ut-slot` + `data-ut-intent` pair.
- Insert rows into `site_intent_bindings` keyed by `(site_id, page_id, slot)`.
- Each row resolves `handler` from `registry[intent].handler` (intent-exec edge fn / Stripe checkout / client-only / etc.).
- Slots needing configuration (e.g. `checkout.start` without a Stripe price) emit a Setup Autopilot task instead of failing — same pattern Builder already uses.

Crucially, this happens **inside** `generate-page` / `generate-fullstack-app`, not in `install-system`. `install-system` continues to provision the business entity and register packs, but **no longer touches `defaultIntentBindingsForSystem`** — that whole function is deleted.

By the time the user sees their first preview, every visible CTA fires its intent via existing runtime infra. Zero post-generation steps.

### Phase 4 — Per-section-variant rule expansion
Adding a new section variant (e.g. a new pricing layout, a video hero) only requires:
1. Add the variant to `jsxTemplates.ts`
2. Add a rule to `slotIntentResolver` covering its slots
3. (If needed) add a new intent entry to `registry.ts`

No edits to `install-system`, no pack file, no 5-way guard updates. The launcher remains the single authoring point.

## Why this beats the pack-seeding model

| Concern | Pack-seeding (rejected) | Launcher-native (this) |
|---|---|---|
| When bindings written | After page TSX exists | During TSX generation |
| Slot ↔ binding consistency | Risk of drift (DOM walk separate from TSX author) | Same pass writes both |
| Adding a new section | Edit pack + edit templates | Edit templates + one resolver rule |
| Failure mode | Bindings without slots → silent runtime miss | Stamping + persistence colocated — impossible to drift |
| User mental model | "Wizard creates site, then magically wires it" | "Wizard creates a wired site" |
| Debug surface | Two systems to inspect (generation + install) | One |

## Technical changes

### New files
- `src/intents/registry.ts` — single registry of truth
- `src/intents/slotIntentResolver.ts` — deterministic `(systemType, variant, label, ctx) → intent`
- `src/intents/stampSectionTSX.ts` — pure function to stamp slot/intent attributes on generated TSX
- `src/services/persistGeneratedBindings.ts` — collects stamps from generated TSX, inserts into `site_intent_bindings`
- `src/test/slotIntentResolver.test.ts`, `src/test/stampSectionTSX.test.ts`, `src/test/intentRegistry.test.ts`

### Edited
- `src/coreIntents.ts` — becomes derived view of registry; existing exports preserved for back-compat
- `src/runtime/deterministicIntentUi.ts` — surface/overlayId looked up from registry, not hardcoded switch
- `src/components/.../TemplateIntentButton.tsx` — reject only when intent not in registry
- `src/services/aiBindingTool.ts` — validate against registry; same code-path usable for ad-hoc AI binding edits later
- `src/sections/variants/jsxTemplates.ts` — `renderButtons()` stamps slot + intent; same for nav/footer link renderers
- `src/sections/components/*` (Hero, CTA, Contact, Footer, FAQ, Gallery, Pricing) — interactive elements stamped via shared helper
- `src/sections/variants/contentExtractor.ts` — pipe `systemType` + `pageContext` through to stamper
- `supabase/functions/generate-page/index.ts` and `generate-fullstack-app/index.ts` — call `persistGeneratedBindings` after TSX produced, before responding
- `supabase/functions/install-system/index.ts` — **delete** `defaultIntentBindingsForSystem` and the binding-insert loop. System install only handles business entity + pack registration.

### Database
No schema change. `site_intent_bindings` already supports everything. Add one index: `(site_id, page_id, slot)` if not present, for fast upserts during generation.

## Out of scope for this milestone
- Webhook editor UI
- Custom overlay components for content intents (gallery/lightbox/video)
- Cleanup of `zip_extract/` duplicates
- Full 60-intent taxonomy — grows organically per new section variant

## Definition of done
- Run System Launcher for each of the 6 system types from a clean slate.
- Inspect generated TSX: every CTA, form button, nav/footer link carries `data-ut-slot` + `data-ut-intent`.
- Inspect `site_intent_bindings`: one row per slot, populated as part of generation (verifiable by timestamp matching generation, not install).
- First preview boot: every interactive element fires its intent through `intentRouter` with zero AI prompts.
- `install-system` no longer writes to `site_intent_bindings`; removing the function deletes the dead code path entirely.
- New tests cover registry derivation, slot resolver per system type, and the stamp-then-persist pipeline.
