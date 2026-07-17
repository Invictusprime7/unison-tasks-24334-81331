# Stripe Subscription Setup Guide

This guide explains how to configure Stripe for subscription payments in Unison Tasks.

## Prerequisites

1. A Stripe account (create one at https://stripe.com)
2. Supabase project with Edge Functions enabled

## Stripe Dashboard Configuration

### 1. Create Products and Prices

In your Stripe Dashboard, create the following products:

#### Pro Plan ($29/month)
1. Go to Products > Add Product
2. Name: "Unison Tasks Pro"
3. Pricing: $29.00 monthly recurring
4. Copy the Price ID (starts with `price_`)

#### Business Plan ($99/month)  
1. Go to Products > Add Product
2. Name: "Unison Tasks Business"
3. Pricing: $99.00 monthly recurring
4. Copy the Price ID (starts with `price_`)

### 2. Get API Keys

1. Go to Developers > API Keys
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)

### 3. Configure Webhook

1. Go to Developers > Webhooks
2. Add endpoint: `https://<your-supabase-project>.supabase.co/functions/v1/stripe-webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Webhook signing secret** (starts with `whsec_`)

## Environment Configuration

### Frontend (.env or Vercel/Netlify)

Add the following environment variable:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx  # or pk_test_xxxxx for testing
```

### Supabase Edge Functions

Set the following secrets in your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set STRIPE_PRO_PRICE_ID=price_xxxxx
supabase secrets set STRIPE_BUSINESS_PRICE_ID=price_xxxxx

# Optional: For yearly plans
supabase secrets set STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx
supabase secrets set STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxxxx
```

Or via the Supabase Dashboard:
1. Go to Project Settings > Edge Functions
2. Add each secret key-value pair

## Deploy Edge Functions

Deploy the Stripe edge functions:

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy manage-subscription
```

## Database Schema

Ensure your `user_subscriptions` table has the required columns. The migration should already include:

```sql
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  projects_count INTEGER DEFAULT 0,
  ai_generations_used INTEGER DEFAULT 0,
  ai_generations_reset_at TIMESTAMPTZ DEFAULT NOW(),
  storage_used_mb INTEGER DEFAULT 0,
  team_members_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing

### Test Mode

1. Use test API keys (start with `pk_test_` and `sk_test_`)
2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Declined: `4000 0000 0000 0002`
   - Requires authentication: `4000 0025 0000 3155`

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks to your local development:

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

## Flow Overview

1. **User selects plan on /pricing page**
2. **Frontend calls `create-checkout` edge function**
3. **Edge function creates Stripe Checkout Session**
4. **User is redirected to Stripe Checkout**
5. **User completes payment**
6. **Stripe sends webhook to `stripe-webhook` function**
7. **Webhook updates `user_subscriptions` table**
8. **User is redirected to /checkout/success**

## Troubleshooting

### Webhook not receiving events
- Verify the webhook URL is correct
- Check that the webhook secret matches
- Ensure the edge function is deployed

### Checkout session fails
- Verify the price ID exists in Stripe
- Check that the secret key is correct
- Review edge function logs in Supabase

### Subscription not updating
- Check webhook logs in Stripe Dashboard
- Review Supabase edge function logs
- Verify the `user_subscriptions` table permissions

## Customer Portal (Optional)

To allow customers to manage their subscriptions directly:

1. Enable Customer Portal in Stripe Dashboard (Settings > Billing > Customer Portal)
2. Configure allowed actions (cancel, change plan, update payment)
3. Users access it via the "Manage Payment" button in Settings > Billing

## Security Notes

- Never expose the secret key (`sk_`) in frontend code
- Always verify webhook signatures
- Use HTTPS in production
- Store secrets securely using Supabase secrets management
