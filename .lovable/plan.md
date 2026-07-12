# Golden Journey + Business Profile Hardening

## Milestone 1 — Golden Journey: Local Service / Booking

Target vertical: **local service / booking** (salon, cleaning, contractor, barber, detailing, photographer). Highest overlap with what already works: booking capability, services catalog, CRM lead capture, notification email — all wired in current pipeline (`industry-intent-runtime`, `industryIntentProfiles`, `services` table, `bookings` table, `crm_leads`, `intent-router` → `booking.create`).

### End-to-end flow to lock in

```text
Sign up
  → Create Business Profile (name, industry=local-service, contact, hours, timezone)
    → Launch site via System Launcher (Lane B, industry=local-service preset)
      → Owner adds Services (CatalogInspectorPanel: name, duration, price)
        → Preview reads live services (CatalogRuntime hydration)
          → Publish
            → Visitor books via data-ut-intent="booking.create"
              → intent-router writes bookings row + crm_leads row
                → send-transactional-email → owner notification_email
                  → Owner opens CRM Dashboard → sees lead → replies
```

### Concrete gaps to close for this journey only

1. **Signup → Business Profile completeness gate.** After signup, force `BusinessProfileWizard` (name, industry, phone, email, timezone, address, hours) before Launcher. Gate uses existing `scoreProfileCompleteness`; owner cannot launch until `readyForPublish=true` on core fields.
2. **Launcher pre-fills from profile.** `SystemLauncher` must read `BusinessProfileDTO` and skip re-asking for name/industry/contact. Wizard becomes 2 steps for returning owners.
3. **Services CRUD in builder.** Confirm `CatalogInspectorPanel` for `services` collection is functional for local-service (create/edit/delete/reorder); expose it as a first-class "Services" tab in WebBuilder, not buried in catalog inspector.
4. **Booking form contract for local-service.** Ensure every generated local-service site has one visible booking form bound to `booking.create` with `service_id`, `date`, `time`, `name`, `email`, `phone`. Add to `IndustryIntentProfiles.local-service.required`.
5. **Owner notification email.** After booking, `intent-router` invokes `send-transactional-email` with `booking-received` template → `businesses.notification_email`. Scaffold the template + wire the call (missing today for booking; only present for contact-confirmation).
6. **CRM Dashboard shows bookings alongside leads.** `CRMDashboard.tsx` unified view: `crm_leads` + `bookings` filtered by `business_id`.
7. **Publish gate honors the journey.** `buildNativePublishReadinessManifest` for local-service requires: profile complete, ≥1 service row, ≥1 booking form on site, notification_email set.

### Deliverables (Milestone 1)
- `BusinessProfileGate.tsx` post-signup
- Launcher pre-fill from `businessProfileService`
- `Services` tab surface in WebBuilder
- `booking-received` email template + `intent-router` send call
- CRM Dashboard bookings merge
- Local-service publish readiness rules

---

## Milestone 2 — Business Profile as Root Object

Make `BusinessProfileDTO` the single hydration source for every generated artifact. No component reads scattered fields from wizard state, launch state, or hardcoded seeds.

### Wiring targets

| Consumer | Field(s) from profile | Change |
|---|---|---|
| Hero section | `name`, `tagline`, `industry` | Section template reads `useBusinessProfile()` context, no wizard prop passthrough |
| Footer | `name`, `phone`, `email`, `address`, `socialLinks`, `hours` | Same context |
| Contact page | `email`, `phone`, `address`, `hours`, `notificationEmail` | Same context; form action = `contact.submit` bound to `business_id` |
| SEO metadata | `name`, `description`, `slug`, `logoUrl` | `index.html` head + per-route Helmet reads profile at build/preview time |
| Booking / contact forms | `businessId`, `industry`, `notificationEmail`, `timezone` | Form runtime auto-injects `business_id`; timezone drives slot rendering |
| CRM ownership | `businessId` | Every `crm_leads`/`bookings` row scoped by RLS to `business_members` |
| Catalog ownership | `businessId` | Every `services`/`products`/`menu_items`/`collections` row scoped identically |
| Published site identity | `slug`, `logoUrl`, `brandColor`, `name` | Publish artifact writes `businesses.published_slug` + preview URL manifest |
| Workspace/project nav | `businessId`, `name`, `logoUrl` | Topbar `Connected Business` chip becomes primary switcher |

### Architecture change

Introduce `BusinessProfileProvider` at the WebBuilder root (mirrors `BuilderSessionProvider`). Every downstream reader (`Hero`, `Footer`, `ContactSection`, `BookingForm`, SEO layer, CatalogInspector, CRM) resolves the profile from context — never from `LaunchState`, `WizardSelections`, or hardcoded seed JSON.

Runtime injection into preview VFS: `businessProfileHydrationModule.ts` (mirrors `catalogHydrationModule`) exposes `window.__UNISON_BUSINESS__` so section templates in the iframe read live profile without prop drilling.

### Golden test to prove Milestone 2

Change the business name in `BusinessSettings` → within one preview refresh, the new name appears in: hero, footer, contact page, browser tab title, SEO description, published-site preview card, CRM header, topbar chip. If any surface still shows the old name, that surface is not yet reading from profile context and is on the punch list.

### Deliverables (Milestone 2)
- `BusinessProfileProvider` + inline context reader
- `businessProfileHydrationModule` injected by preview session
- Section templates refactored: Hero, Footer, ContactSection, BookingForm read from `window.__UNISON_BUSINESS__`
- SEO layer (Helmet + `index.html` head) reads profile
- Publish artifact writes canonical business identity
- Golden name-change test

---

## Sequencing

Milestone 1 first (proves one journey works end-to-end for a real owner). Milestone 2 second (generalizes profile-as-root so remaining industries in later milestones inherit the plumbing for free).

## Not in scope now
- Other industries (restaurant, ecommerce, nonprofit, coaching) — reuse Milestone 2 plumbing later
- SMS notifications (email-only for M1; SMS is a follow-up)
- Multi-location businesses
- Team member roles beyond owner
