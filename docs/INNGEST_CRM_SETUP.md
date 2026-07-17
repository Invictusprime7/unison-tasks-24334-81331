# Inngest + CRM Automation Setup Guide

This guide covers deploying and running the fully integrated Intent System with Inngest-powered CRM automation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
│  User clicks "Book Now" → Button has data-ut-intent="booking.create"
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTENT EXECUTOR                             │
│  - Normalizes via INTENT_ALIASES                                 │
│  - Executes handler with context hydration                       │
│  - Returns UI directives (modal, toast, etc.)                    │
│  - Emits events: { name: "booking.requested", ... }              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INNGEST EVENT BRIDGE                          │
│  - Maps intent events → Inngest events                           │
│  - "booking.requested" → "booking/created"                       │
│  - Sends to Inngest Cloud                                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INNGEST CLOUD                               │
│  - Receives events                                               │
│  - Triggers workflow functions                                   │
│  - Durable execution with retries                                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW FUNCTIONS                            │
│  - bookingReminderWorkflow: sends confirmations, reminders       │
│  - leadFollowUpWorkflow: 4-step follow-up sequence               │
│  - dealStageWorkflow: CRM pipeline automations                   │
│  - cartAbandonmentWorkflow: recovery email sequence              │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create/update `.env.local`:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Inngest
INNGEST_EVENT_KEY=your-event-key      # For sending events
INNGEST_SIGNING_KEY=your-signing-key  # For verifying webhooks

# Stripe (optional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Run Development Servers

**Option A: Run Both Together**
```bash
npm run automation:dev
```

**Option B: Run Separately**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Inngest Dev Server
npm run inngest:dev
```

### 4. Open Inngest Dev UI

Visit: http://localhost:8288

This shows:
- All registered workflow functions
- Event stream
- Step execution details
- Retry status

## Initializing the System

In your main App component or entry point:

```tsx
import { initializeCRMSystem } from '@/lib/crm-managers';

// Initialize once at app startup
initializeCRMSystem({
  businessId: 'your-business-id',  // From Supabase or context
  siteId: 'your-site-id',
  sessionId: localStorage.getItem('sessionId') || crypto.randomUUID(),
});
```

## Testing the Integration

### 1. Test Intent Execution

Open browser console and run:

```javascript
// Import the executor
import('@/runtime/intentExecutor').then(({ executeIntent }) => {
  // Test a booking intent
  executeIntent('booking.create', {
    payload: {
      serviceId: 'test-service',
      customerEmail: 'test@example.com',
    }
  }).then(result => {
    console.log('Result:', result);
    // Should show: { ok: true, ui: { openModal: 'booking' }, ... }
  });
});
```

### 2. Test Event Emission

```javascript
import('@/lib/inngest-event-bridge').then(({ sendToInngest }) => {
  sendToInngest({
    name: 'lead.submitted',
    payload: {
      email: 'test@example.com',
      name: 'Test User',
    },
    timestamp: Date.now(),
  }, { businessId: 'test' }).then(console.log);
});
```

### 3. Check Inngest Dev UI

After running tests, check http://localhost:8288 to see:
- Events received
- Functions triggered
- Step execution logs

## Deployment

### Vercel

1. **Connect to Inngest Cloud**
   - Go to https://app.inngest.com
   - Create an account/app
   - Get your Event Key and Signing Key

2. **Add Environment Variables**
   ```bash
   vercel env add INNGEST_EVENT_KEY
   vercel env add INNGEST_SIGNING_KEY
   ```

3. **Deploy**
   ```bash
   npm run build
   vercel deploy --prod
   ```

4. **Register with Inngest**
   ```bash
   npx inngest-cli deploy --api-url https://your-site.vercel.app/api/inngest
   ```

### Netlify

1. Add environment variables in Netlify Dashboard
2. The `api/inngest.ts` will be deployed as a Netlify Function

## Available Workflows

| Workflow | Trigger Event | Description |
|----------|---------------|-------------|
| `dealStageWorkflow` | `crm/deal.stage.changed` | CRM pipeline automations |
| `leadFollowUpWorkflow` | `crm/lead.created` | 4-step lead nurture sequence |
| `bookingReminderWorkflow` | `booking/created` | Confirmation + 24h + 2h reminders |
| `reviewRequestWorkflow` | `booking/completed` | Post-service review request |
| `noShowFollowUpWorkflow` | `booking/no.show` | No-show recovery |
| `formSubmissionWorkflow` | `form/submitted` | Form processing + lead creation |
| `cartAbandonmentWorkflow` | `cart/abandoned` | 3-step cart recovery |
| `orderFulfillmentWorkflow` | `order/created` | Order confirmation + shipping |
| `newsletterWelcomeWorkflow` | `newsletter/subscribed` | Welcome email sequence |
| `automationTriggerWorkflow` | `automation/trigger` | Generic automation handler |

## Intent to Event Mapping

| Intent Event | Inngest Event |
|--------------|---------------|
| `lead.submitted` | `crm/lead.created` |
| `booking.requested` | `booking/created` |
| `checkout.started` | `checkout/started` |
| `cart.abandoned` | `cart/abandoned` |
| `deal.won` | `crm/deal.stage.changed` |
| `newsletter.subscribed` | `newsletter/subscribed` |

## Troubleshooting

### Events Not Reaching Inngest

1. Check browser console for `[EventBridge]` logs
2. Verify `INNGEST_EVENT_KEY` is set
3. Check Inngest Dev UI for received events

### Workflows Not Running

1. Check that functions are registered at `/api/inngest`
2. Verify `INNGEST_SIGNING_KEY` matches
3. Check function logs in Inngest dashboard

### Buttons Not Working

1. Run AutoBinder on your template:
   ```typescript
   import { autoBindElement } from '@/runtime';
   autoBindElement(document.body, { category: 'landing' });
   ```

2. Check `data-ut-intent` attributes on buttons
3. Verify Intent Executor is configured with managers

## Files Reference

| File | Purpose |
|------|---------|
| `src/runtime/intentAliases.ts` | Maps legacy intents to CORE_INTENTS |
| `src/runtime/intentExecutor.ts` | Unified intent execution with UI directives |
| `src/runtime/autoBinder.ts` | Build-time intent assignment |
| `src/lib/inngest.ts` | Inngest client + event schemas |
| `src/lib/inngest-workflows.ts` | All workflow function definitions |
| `src/lib/inngest-event-bridge.ts` | Connects Intent Executor → Inngest |
| `src/lib/crm-managers.ts` | CRM/Booking/Cart implementations |
| `api/inngest.ts` | Vercel API route for Inngest webhooks |
