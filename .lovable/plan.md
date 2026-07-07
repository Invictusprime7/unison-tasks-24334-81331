# Milestone 1 — Golden Journey: Local Service / Booking

**Vertical chosen:** `local-service` (covers salon, cleaning, contractor, barber, detailing, photographer). Salon already has the most complete intent profile + catalog seeding, so we harden that path first and use `local-service` as the second vertical on the same rails.

**Definition of done:** a non-technical owner can complete the full journey below in one session, from a fresh account, without hitting a dead end or needing developer help.

---

## The 9 steps of the journey (and what we do for each)

```text
1. Sign up
2. Create business profile
3. Launch site (wizard)
4. Add services / products
5. Preview live data
6. Publish
7. Visitor submits lead / booking
8. Lead appears in CRM
9. Owner gets email (SMS optional) and can follow up
```

### 1. Sign up
- Keep existing email + Google auth on `/auth`.
- After sign-up, force redirect to `/onboarding` (not `/dashboard`) if no business exists yet.
- Auto-create a `profiles` row (already wired via trigger) and a default `user_subscriptions` row (already wired).

### 2. Create business profile
- One short form in `/onboarding`: business name, industry (default `local-service`, salon preselectable), city, phone, contact email.
- Writes to `businesses` + `business_members(owner)` + `business_setup_progress`.
- Persists `industry` so the intent runtime + catalog seeding branch correctly.

### 3. Launch site (wizard)
- Reuse existing `SystemLauncher` / wizard. Force `themePresetId` to always be set (recent soft-fallback stays as safety net).
- Wizard calls `install-system` edge function with `{ businessId, industry, templateId, themePresetId }`.
- `install-system` seeds `services` (haircut, color, blowout / cleaning visit / consultation, etc. per industry) via existing `industrySeeds.ts`. Verify local-service seeds exist; add if missing.

### 4. Add services / products
- New minimal `/business/catalog` page (tabs: Services, Products) using existing `services` / `products` tables.
- CRUD with name, price, duration (services), description, active toggle. RLS scoped by `business_id` via `is_business_member`.
- Optional; the seeded rows from step 3 already make the site usable.

### 5. Preview live data
- Preview surface (`WebBuilder` / `VFSPreview`) already hydrates from `builder_drafts`. Verify the services/products from step 3–4 render in the site's Services section by binding the catalog hydration module to the live table (already stubbed as `catalogHydrationModule.ts`).
- Add a small "Live data" badge in preview when the section is reading real rows vs seed placeholder.

### 6. Publish
- Publish button in Web Builder calls existing publish flow. Enforce `isPublishReady` gate (already stricter than preview). Required capabilities for local-service: `contact.call`, `quote.request` or `booking.create`, `contact.submit`. Block publish with a single actionable message if any are missing (not a wall of errors).
- On success: show live URL + copy button + "Send me the link" email.

### 7. Visitor submits lead / booking
- Public site CTAs already fire `data-ut-intent`. Ensure the `intent-router` edge function handles:
  - `contact.submit` → `crm_leads` (source=`contact_form`)
  - `quote.request` → `crm_leads` (source=`quote`)
  - `booking.create` → `bookings` row + `crm_leads` (source=`booking`)
- Add missing input validation (Zod) and CORS on the edge function response.

### 8. Lead appears in CRM
- `/crm` Leads view already exists. Verify realtime subscription on `crm_leads` filtered by `business_id` so new submissions appear without refresh.
- Show source, contact info, service requested, timestamp, and a "Mark contacted" action that writes `crm_activities`.

### 9. Owner notification + follow-up
- On insert into `crm_leads` / `bookings`, trigger `send-transactional-email` (Lovable Emails) to the business `notification_email` with a compact summary + deep link back to `/crm`.
- SMS optional / behind a "Connect SMS" button (GatewayAPI connector); do not block the journey on it in Milestone 1.
- Follow-up: from the lead row, one-click "Reply via email" opens `mailto:` prefilled; "Call" opens `tel:` on mobile.

---

## Technical work list (grouped by area)

**Auth & onboarding**
- Redirect gate: signed-in user with no business → `/onboarding`.
- Onboarding form + write path (`businesses`, `business_members`, `business_setup_progress`).

**Launcher & seeding**
- Confirm `install-system` writes `industry` on `businesses` and seeds `services` for `local-service` (add seeds if missing in `supabase/functions/install-system/industrySeeds.ts`).
- Keep the recent `buildBaseCssForPreset` soft fallback; always pass `themePresetId` from wizard.

**Catalog UI**
- `/business/catalog` page: list + create/edit/delete for `services` and `products`. Reuse shadcn table + dialog.

**Preview binding**
- Wire `catalogHydrationModule` to fetch `services` / `products` for the current `business_id` and inject into the Services/Products section props at preview time.

**Publish gate**
- Trim publish blockers to the small set that actually breaks the journey; make the failure message user-friendly.

**Intent router (edge function)**
- Zod validation on payloads.
- Branches: `contact.submit`, `quote.request`, `booking.create`.
- Writes lead + optional booking, then invokes `send-transactional-email`.
- Return `{ ok, leadId }` with CORS.

**Notifications**
- Use existing Lovable Emails infra + `send-transactional-email` + a new template `new-lead-notification` (owner-facing).
- Uses `businesses.notification_email` (fallback: owner's auth email).

**CRM view**
- Realtime channel on `crm_leads` filtered by `business_id`.
- "Mark contacted" writes `crm_activities`.

**Tests**
- One Playwright happy-path script that runs steps 1–9 against localhost, screenshotting each step.
- Vitest: intent-router payload validation + lead insert shape.

---

## Out of scope for Milestone 1

- Other industries beyond salon/local-service (restaurant, SaaS, ecommerce, etc.) — they keep working but are not the golden path.
- SMS notifications (button present, wiring optional).
- Advanced CRM (pipeline automations, workflows) — already exist, not part of the golden loop.
- Payments / checkout.
- Custom domains.

---

## Suggested execution order (small PRs)

1. Onboarding redirect + business profile form.
2. Confirm/patch `install-system` seeds for local-service; thread `themePresetId` unconditionally.
3. Catalog CRUD page.
4. Preview hydration from live `services` / `products`.
5. Intent router hardening (validation + booking branch + email trigger).
6. Owner email template + wiring.
7. CRM realtime + "Mark contacted".
8. Publish gate trim + friendly message.
9. Playwright end-to-end happy path + fix whatever it surfaces.

Ship each step behind the same journey so it is testable in isolation, then run the full Playwright script as the acceptance check for Milestone 1.
