---
name: Golden Journey — Local Service Booking
description: M1 target vertical is local-service/booking (salon, cleaning, contractor, barber, detailing, photographer). Signup → BusinessProfileGate → SystemLauncher → Services CRUD → Preview → Publish → visitor booking → intent-router writes bookings + crm_leads → owner notification email → CRM Dashboard shows bookings alongside leads. Plan detail lives in .lovable/plan.md.
type: feature
---

## Deliverables (in-flight)

- [x] `src/components/onboarding/BusinessProfileGate.tsx` — post-signup gate; auto-provisions owned business row; requires name + industry + notificationEmail.
- [x] `src/pages/Onboarding.tsx` — Start Building opens gate first; gate → launcher on ready.
- [x] `src/components/crm/CRMBookings.tsx` + wired into `CRMDashboard.tsx` sidebar.
- [x] `src/contexts/BusinessProfileContext.tsx` — Provider + inline `useBusinessProfile()`; mirrors profile to `window.__UNISON_BUSINESS__` and dispatches `lovable:business-profile-changed`.
- [x] `src/sections/businessProfileHydrationModule.ts` — VFS-injected `/src/components/businessProfile.ts` module; iframe reads via `window.parent.__UNISON_BUSINESS__` or `BUSINESS_PROFILE_CHANGED` postMessage.
- [ ] Launcher pre-fill from `businessProfileService` (skip re-asking name/industry).
- [ ] `booking-received` transactional email template + `intent-router` invocation.
- [ ] `buildNativePublishReadinessManifest` local-service extras: ≥1 service row + notification_email + visible booking form.
- [ ] Wrap WebBuilder root with `BusinessProfileProvider`; inject hydration module in preview VFS scaffolder; refactor Hero/Footer/Contact section templates to read from `useBusinessProfile()` (iframe hook).
- [ ] Preview host: respond to `BUSINESS_PROFILE_REQUEST` postMessage from iframe and rebroadcast `BUSINESS_PROFILE_CHANGED` on `lovable:business-profile-changed`.

## Contracts

- Gate blocking rule: `profile.name && profile.industry && profile.notificationEmail` required to enter SystemLauncher.
- Profile is the single source of truth; no section reads business identity from `LaunchState`, `WizardSelections`, or hardcoded seed JSON.
- Iframe hydration hook is prop-additive: seed props always render as fallback when the parent hasn't broadcast.
