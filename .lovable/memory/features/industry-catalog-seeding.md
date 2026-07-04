---
name: Per-Industry Catalog Seeding on System Launch
description: install-system edge function accepts `industry` and seeds services / menu_items / pricing_plans / products per industry via supabase/functions/install-system/industrySeeds.ts. SystemLauncher passes resolvedIndustry. Salon→services+slots, Restaurant→menu_items+reservation services, Local-service→quote+service-call services, Coaching→services+pricing_plans, Agency→services+pricing_plans, SaaS→pricing_plans, Ecommerce→products. Portfolio/real-estate/nonprofit are lead-only (no catalog rows).
type: feature
---

## Contract
`install-system` request body now includes optional `industry` (normalized IndustryMatrix key). When present, `getIndustrySeeds(industry)` returns a bundle of rows for services / menu_items / pricing_plans / products. The function inserts each present array with service-role client, RLS-scoped by business_id. All failures are non-fatal warnings.

## Adding a new industry
1. Add an entry to `SEEDS` in `supabase/functions/install-system/industrySeeds.ts`.
2. Add any aliases to `ALIASES`.
3. Redeploy the `install-system` function.

## Response shape
`{ businessId, businessCreated, packs, systemType, industry, templateId, warnings }` — `industry` echoed so launcher can log/telemetry.
