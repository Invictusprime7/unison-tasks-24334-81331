---
name: Industry-Scoped Intent Runtime
description: intent-router loads businesses.industry and branches booking.create (restaurant→Table Reservation + party_size), plus handles cart.add / cart.checkout (orders row) and donation.start (crm lead source=donation). install-system persists industry on new businesses and backfills it on existing ones.
type: feature
---

## Flow
1. Launcher calls `install-system` with `industry` — function writes it to `businesses.industry` on create and backfills on reuse.
2. Site CTAs fire `data-ut-intent` → `intent-router` → `loadBusinessSettings` returns `{ industry, notification_email, ... }`.
3. Handler branches:
   - `booking.create`: restaurant → serviceName "Table Reservation", stores partySize + bookingType="reservation" in metadata; other verticals → "Appointment".
   - `cart.add`: writes `cart_items` (session_id, product_id, quantity).
   - `cart.checkout`: writes `orders` row (business_id, items, subtotal/tax/total/currency, status="pending") + best-effort CRM lead source="cart_checkout".
   - `donation.start`: creates crm_lead with source="donation" and campaign/amount summary in message.

## Adding a new industry branch
1. Add the intent to `ACTION_INTENTS` in `supabase/functions/intent-router/index.ts`.
2. Read `industry` from `loadBusinessSettings()` inside the handler.
3. Redeploy `intent-router`.
