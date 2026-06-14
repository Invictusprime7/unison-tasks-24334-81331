---
name: All-vertical intent hardening
description: All 9 verticals (salon/local-service/contractor/coaching/restaurant/ecommerce/agency/nonprofit/portfolio/real-estate) ship unified industryIntentProfiles maps with industry-unique synthesize slots and dedicated UI intent profiles. Each vertical's CTAs, icons, labels, and forbidden intents are authored to its own conversion model — never copy-pasted across industries.
type: feature
---

# All-vertical intent hardening

Salon was the prototype. Every other vertical now matches the same hardening contract:

## Files
- `src/platform/core/industryIntentProfiles.ts` — every vertical uses `profileFromMap` with `intents` map (level + synthesize per CoreIntent). Shared footer fragments (`FOOTER_CONTACT_CALL`, `FOOTER_DIRECTIONS`, `FOOTER_NEWSLETTER`, `FOOTER_CONTACT_EMAIL`) keep secondary intents DRY without collapsing industry uniqueness.
- `src/platform/core/uiIntentProfiles/{salon,localService,coaching,restaurant,ecommerce,agency,nonprofit,portfolio,realEstate}.ui.ts` — one profile per vertical declaring affordance, icon set, label options, variant/size, and `required` flag per placement.
- `src/platform/core/uiIntentProfiles/index.ts` — re-exports all 9 profiles.
- `src/platform/core/uiIntentProfile.ts` `UI_INTENT_PROFILES` — registers all 9 (`contractor` aliases `local-service`).
- `src/test/industryHardening.test.ts` — 83 parametric tests: unified-map shape, required-intent synthesis presence, idempotency, UI profile registration, icon/label completeness, required-placement count, prompt-contract emission, forbidden-intent stripping.

## Industry-unique CTAs (do NOT copy-paste)
- **salon**: booking.create (hero/nav/services/pricing), Calendar icons, "Book Now"
- **local-service / contractor**: quote.request (required) + contact.call (required); urgent trust copy "Get Free Estimate" / "Call Now"
- **coaching**: booking.create as "Book Discovery Call" + lead.capture as "Free Resource" / "Download Free Guide"
- **restaurant**: booking.create as "Reserve a Table" + contact.call as "Call to Order" + location.directions required everywhere
- **ecommerce**: cart.add / cart.view / cart.checkout (all required) + search/favorite/auth utilities; booking & quote forbidden
- **agency**: lead.capture as "Get a Free Consultation" + quote.request as "Request Proposal"; cart forbidden
- **nonprofit**: donation.start as "Donate Now" + volunteer.signup as "Volunteer"; cart/booking/quote forbidden
- **portfolio**: contact.submit as "Start a Project"; cart/quote/donation forbidden
- **real-estate**: contact.submit (Contact an Agent) + booking.create (Schedule a Showing) + lead.capture (Home Valuation); cart/donation forbidden

## Behavior
- `synthesizeIndustryBindings()` now stamps real bindings for every vertical (no more legacy no-op).
- `buildUIIntentContract()` emits a populated prompt block for every vertical (no more permissive fallback).
- Forbidden intents are stripped per vertical (e.g. nonprofit drops cart.add, salon drops quote.request, ecommerce drops booking.create).
- Preflight repair (aiSitePreflightRepair) and JSX typo repair (repairAiJsxTypos) automatically extend coverage to all generated sites regardless of vertical.
