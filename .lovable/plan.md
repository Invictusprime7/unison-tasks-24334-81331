# Milestones 3-5 — Catalog Wiring, Friendly Gates, Real Outcomes

Three tightly-coupled milestones executed as one continuous pass so the Business OS stops feeling like a launcher and starts feeling like an operating system. Each milestone builds on the previous — do not split them across sessions.

---

## Milestone 3 — Section ↔ Catalog Backend Wiring

### Goal
Every generated section declares what data it needs, where it comes from, and how the owner edits it. Preview + published site both hydrate from Supabase.

### Data model (already partially exists)
Reuse existing tables where possible:
- `services`, `products`, `menu_items`, `pricing_plans`, `availability_slots`, `catalog_collections`, `site_intent_bindings`
- Add missing: `featured_offers`, `testimonials`, `portfolio_projects`
- All new tables: business_id FK, RLS via `is_business_member`, GRANT to authenticated + service_role, updated_at trigger

### Section contract (`SectionDataContract`)
New file `src/services/catalog/sectionDataContracts.ts` — one record per section type:
```ts
{
  sectionType: 'ServicesGrid',
  requiredDataType: 'service',
  sourceTable: 'services',
  minRows: 3,
  emptyState: 'placeholder-cards',
  editPath: '/business/services',
  bindingIdPrefix: 'services',
}
```

### Runtime wiring
- Extend `catalogHydrationModule.ts` to read section binding IDs from VFS metadata and fetch from the declared `sourceTable` scoped by `businessId`.
- `autoEmitSectionBindings.ts` writes `sectionBindingId` + `sourceTable` + `businessId` into each rendered section's `data-*` attributes so runtime can rehydrate deterministically.
- Empty state renders a "Add your first X" CTA linking to `editPath` (owner view only; anonymous visitors see graceful placeholder copy).

### Business Center CRUD
- `src/pages/business/` routes for services / products / menu / pricing / offers / testimonials / portfolio / availability.
- Reuse existing `CatalogInspectorPanel` pattern; one page per catalog table with list + drawer editor.
- All routes gated by `useBusinessProfile()` + `has_role` where relevant.

---

## Milestone 4 — Friendly Readiness Gates

### Goal
Convert `businessProfileReadinessGate` + publish gate errors into actionable, human-readable checklists with one-click repair paths.

### Repair registry
New `src/services/readiness/repairActions.ts`:
```ts
{
  id: 'add-business-phone',
  label: 'Add business phone',
  reason: 'Contact section needs a phone number visitors can call.',
  fix: { type: 'route', path: '/business/profile#phone' },
}
```
Actions cover: phone, email, address, service (min 3), product image, booking connect, payment connect (Stripe/Paddle), notification email domain, publish destination verify.

### UI component
`src/components/business/ReadinessChecklist.tsx` mounted in:
- Web Builder topbar popover (replaces raw "catalog rows missing" toast)
- Business OS shell dashboard
- Publish modal (blocks publish until green or explicitly overridden)

Each row: status dot, plain-language sentence, single primary action button. On click → navigate to repair path, open relevant drawer, or launch connector flow.

### Backend
Extend `businessProfileReadinessGate.ts` to return `{ blockers: RepairAction[], warnings: RepairAction[] }` instead of raw error strings. Preview readiness stays permissive; publish readiness stays strict.

---

## Milestone 5 — Real Outcome Workflows

### Goal
Wire the canonical intents that today only log to actually persist + notify + follow up.

### Intent → outcome map
| Intent | Persist | Notify Owner | Notify Visitor | CRM effect |
|---|---|---|---|---|
| `lead.capture` | `crm_leads` | email + optional SMS | confirmation email | new lead row + activity |
| `booking.create` | `bookings` | email + SMS | confirmation email | lead + deal + follow-up task |
| `quote.request` | `crm_leads` (type=quote) | email | confirmation email | deal in "quote" stage + task |
| `contact.submit` | `crm_form_submissions` | email | confirmation email | activity log |
| `newsletter.subscribe` | `crm_leads` (source=newsletter) | — | welcome email | tag only |
| `cart.checkout` | `orders` | email | receipt | deal in "won" on success |
| `donation.start` | `orders` (type=donation) | email | receipt | activity |

### Backend edge functions
Audit + finish (many already exist as stubs):
- `create-booking` ✅ (already sends both emails per prior audit)
- `create-lead` — extend to also insert `crm_activities` row + optional follow-up `tasks` row
- `submit-contact-form` — verify template + owner notification
- `request-quote` — new function, mirrors create-lead with deal insert
- `notify-owner` shared helper — pulls owner email from `businesses.notification_email` with fallback to profile email

### Templates
Ensure app email templates exist in `supabase/functions/_shared/transactional-email-templates/`:
- `lead-received-owner`, `lead-confirmation-visitor`
- `quote-request-owner`, `quote-confirmation-visitor`
- `contact-received-owner`, `contact-confirmation-visitor`
Register in `registry.ts`, redeploy affected functions.

### Frontend intent router
`src/services/intentRouter.ts` — replace "log-only" default handlers with dispatchers that call the correct edge function via `supabase.functions.invoke`, then emit a UI toast confirming to visitor and dispatch `lovable:outcome-recorded` for the OS shell activity feed.

### CRM surface
`CRMDashboard` gains a live activity feed reading `crm_activities` (already exists) plus a "Follow-ups due" panel reading `tasks` filtered by `type=follow_up`.

---

## Execution Order
1. Schema migration for `featured_offers`, `testimonials`, `portfolio_projects` (+ any missing columns on `businesses` for `notification_email`, `notification_phone`).
2. `sectionDataContracts.ts` + runtime hydration wiring.
3. Business Center CRUD routes (one page per table).
4. `repairActions.ts` + `ReadinessChecklist` + gate refactor.
5. Edge functions + email templates for outcomes.
6. Frontend intent router dispatch.
7. CRM activity feed + follow-up panel.
8. Smoke test: launch new site → checklist walks owner through fixes → submit lead form → confirm owner + visitor emails logged + CRM row appears.

## Notes
- No new theme preset fallbacks — respects existing "kill the fallback" rule.
- All new tables get GRANT + RLS via `is_business_member` in the same migration.
- No standalone custom hook files — inline `useState`/`useEffect` only per project memory.
- Reuse existing `catalogHydrationModule` rather than a parallel pipeline.

Approve to begin with the migration + section contracts, or tell me to reorder/trim scope.
