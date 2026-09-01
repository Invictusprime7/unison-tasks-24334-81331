---
name: Milestones 3-5 (catalog wiring + friendly gates + real outcomes)
description: Section data contracts, repair-action registry, ReadinessChecklist UI, CRM activity feed, request-quote edge function, and activity/task business_id migration.
type: feature
---

# Milestones 3-5 — Backend-to-Section, Friendly Gates, Real Outcomes

## Section data contracts (M3)
- `src/services/catalog/sectionDataContracts.ts` declares per-section: `requiredDataType`, `sourceTable`, `minRows`, `emptyState`, `editPath`, `bindingIdPrefix`.
- Registered sections: ServicesGrid, ProductGrid, Menu, PricingTable, FeaturedOffers, Testimonials, Portfolio, BookingAvailability.
- `contractsForIndustry(industry)` returns default contract set per vertical.

## New public tables (public read, member write)
- `featured_offers`, `testimonials`, `portfolio_projects` — all with business_id FK, RLS via `is_business_member`, GRANT to authenticated + anon SELECT + service_role, updated_at trigger.
- `businesses` extended with `notification_email`, `notification_phone`.

## Cross-cutting schema changes
- Added `business_id` + `metadata` to `crm_activities` and `tasks`, with member-scoped policies so outcomes can be attributed to a business.

## Readiness (M4)
- `src/services/readiness/repairActions.ts` — `buildRepairActions(signals)` returns `{ id, label, headline, reason, severity, fix }[]` covering: name/phone/email/address, notification email, per-section minimum rows, booking/payment connect, email domain verify, publish destination.
- `src/components/business/ReadinessChecklist.tsx` — plain-language blocker/warning list with a single primary action per row. Emits `lovable:readiness-action` / `lovable:open-connector` events, otherwise navigates.
- Mounted inside `BusinessCenterPanel`.

## Real outcomes (M5)
- `supabase/functions/create-lead/index.ts` — extended to insert `crm_activities` (lead_captured) + a 24h follow-up `tasks` row scoped by business_id.
- `supabase/functions/request-quote/index.ts` — new function: upserts contact, inserts lead (intent=quote_request), inserts crm_deal (stage=quote), inserts activity + follow-up task, sends owner + visitor emails.
- `src/components/crm/CRMActivityFeed.tsx` — dual-panel Recent activity + Follow-ups due, mounted at the bottom of `CRMOverview` when a businessId is bound. Refreshes on `lovable:outcome-recorded` events.

## Wiring conventions
- Frontend outcome dispatchers should:
  1. `supabase.functions.invoke(<fn>, { body })`
  2. On success, toast the visitor and dispatch `new CustomEvent('lovable:outcome-recorded', { detail: { intent, businessId } })` so the OS shell activity feed refreshes.
- Owner notifications resolve to `businesses.notification_email` (fallback: profile email); visitor confirmations always send to the submitted email.

## Not yet built (follow-ups)
- Individual Business Center CRUD pages under `/business/{services,products,menu,pricing,offers,testimonials,portfolio,availability}` — reuse `CatalogInspectorPanel` pattern per table.
- Runtime hydration extension in `catalogHydrationModule.ts` for the three new tables.
- SMS notifications for booking (Twilio pending).
- Publish modal integration for `ReadinessChecklist`.
