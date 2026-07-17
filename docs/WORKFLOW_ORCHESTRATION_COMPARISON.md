# Workflow Orchestration Comparison

> **Stack**: React 18 + TypeScript 5.9 | Inngest (primary: durable execution) | Trigger.dev (secondary: background jobs) | Supabase Edge Functions

## Overview

Comparison of three serverless workflow orchestration platforms for Unison Tasks CRM automation:

| Feature | Inngest | Trigger.dev | Temporal |
|---------|---------|-------------|----------|
| **Type** | Durable execution | Background jobs | Durable workflows |
| **Architecture** | Serverless-first | Managed workers | Worker-based |
| **Open Source** | Yes (Apache 2.0) | Yes (Apache 2.0) | Yes (MIT) |
| **Self-Host** | Yes | Yes | Yes |

---

## 1. Inngest

### Overview
Serverless-native durable execution platform. Functions run on your existing infrastructure (Vercel, Supabase Edge Functions, etc.) with no additional workers needed.

### Pricing
| Tier | Cost | Included |
|------|------|----------|
| Hobby | **$0/mo** | 50K executions, 5 concurrent steps |
| Pro | **$75/mo** | 1M+ executions, 100+ concurrent steps |
| Enterprise | Custom | Unlimited |

**Pay-as-you-go**: $0.00005/execution after free tier

### Pros
- ✅ **Best Supabase/Vercel integration** - works directly with Edge Functions
- ✅ **No workers to manage** - truly serverless
- ✅ **Generous free tier** - 50K executions/month
- ✅ **Simple integration** - 10-line setup
- ✅ **Built-in retries, scheduling, debouncing**
- ✅ **Real-time streaming** - great for AI agents

### Cons
- ❌ Newer platform (less mature than Temporal)
- ❌ Limited to JavaScript/TypeScript SDK

### Integration Pattern
```typescript
// In Supabase Edge Function or Vercel API route
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "unison-tasks" });

// Define a workflow
export const dealStageWorkflow = inngest.createFunction(
  { id: "deal-stage-changed" },
  { event: "crm/deal.stage.changed" },
  async ({ event, step }) => {
    // Step 1: Send notification
    await step.run("send-notification", async () => {
      return await sendPushNotification(event.data.userId, event.data.dealId);
    });

    // Step 2: Wait 1 hour then send follow-up
    await step.sleep("wait-for-follow-up", "1h");

    // Step 3: Send follow-up email
    await step.run("send-follow-up", async () => {
      return await sendEmail(event.data.contactEmail);
    });
  }
);

// Trigger from anywhere
await inngest.send({
  name: "crm/deal.stage.changed",
  data: { dealId: "123", newStage: "negotiation", contactEmail: "..." }
});
```

### Best For
- Supabase Edge Functions automation
- Event-driven CRM workflows
- AI agent orchestration
- Teams wanting minimal infrastructure

---

## 2. Trigger.dev

### Overview
Managed background job platform with long-running task support. Deploys your code to Trigger.dev workers - no timeouts, full Node.js environment.

### Pricing
| Tier | Cost | Included |
|------|------|----------|
| Free | **$0/mo** | $5 usage credit, 20 concurrent runs |
| Hobby | **$10/mo** | $10 usage credit, 50 concurrent runs |
| Pro | **$50/mo** | $50 usage credit, 200 concurrent runs |
| Enterprise | Custom | Unlimited |

**Compute**: $0.12/hour (small machine) + $0.25/10K runs

### Pros
- ✅ **No timeouts** - tasks can run indefinitely
- ✅ **Full Node.js environment** - use any npm package
- ✅ **Generous free tier** - $5/month credit
- ✅ **Great DX** - hot reloading, local development
- ✅ **Open source** - fully self-hostable

### Cons
- ❌ **Code runs on Trigger.dev servers** - not on your Edge Functions
- ❌ Requires deployment to their platform
- ❌ More complex than Inngest for serverless use cases

### Integration Pattern
```typescript
// In /trigger folder - deployed to Trigger.dev
import { task, wait } from "@trigger.dev/sdk/v3";

export const processDealStageChange = task({
  id: "process-deal-stage-change",
  run: async (payload: { dealId: string; newStage: string }) => {
    // This runs on Trigger.dev infrastructure
    await sendNotification(payload.dealId);
    
    // Wait without paying for compute
    await wait.for({ hours: 1 });
    
    // Continue workflow
    await sendFollowUp(payload.dealId);
    
    return { success: true };
  },
});

// Trigger from Supabase Edge Function
await processDealStageChange.trigger({ 
  dealId: "123", 
  newStage: "negotiation" 
});
```

### Best For
- Long-running batch jobs
- Heavy compute tasks (video processing, ML)
- Teams needing full Node.js (not Edge runtime limits)
- AI agents with complex tool calling

---

## 3. Temporal

### Overview
Enterprise-grade durable workflow engine. Requires running worker processes that poll for work - best for mission-critical, high-scale applications.

### Pricing
| Tier | Cost | Included |
|------|------|----------|
| Essentials | **$100/mo** | 1M actions, 1GB storage |
| Business | **$500/mo** | 2.5M actions, 2.5GB storage |
| Enterprise | Custom | 10M+ actions |

**Pay-as-you-go**: ~$30-50 per 1M actions (tiered)

### Pros
- ✅ **Battle-tested** - used by Uber, Netflix, Stripe
- ✅ **Multi-language SDKs** - Go, Java, Python, TypeScript, PHP
- ✅ **Strongest durability guarantees**
- ✅ **Complex workflow patterns** - sagas, compensation, child workflows
- ✅ **99.99% SLA available**

### Cons
- ❌ **Requires workers** - not serverless, need persistent processes
- ❌ **Higher complexity** - steeper learning curve
- ❌ **Higher cost** - starts at $100/mo vs $0
- ❌ **Not ideal for Edge Functions** - workers can't run in Vercel/Supabase

### Integration Pattern
```typescript
// Worker process (needs to run 24/7)
import { Worker } from "@temporalio/worker";
import * as activities from "./activities";

const worker = await Worker.create({
  workflowsPath: require.resolve("./workflows"),
  activities,
  taskQueue: "crm-tasks",
});
await worker.run();

// Workflow definition
export async function dealStageWorkflow(dealId: string): Promise<void> {
  await sendNotification(dealId);
  await sleep("1 hour");
  await sendFollowUp(dealId);
}

// Start from Supabase Edge Function
import { Connection, Client } from "@temporalio/client";
const client = new Client();
await client.workflow.start(dealStageWorkflow, {
  args: ["deal-123"],
  taskQueue: "crm-tasks",
  workflowId: "deal-stage-deal-123",
});
```

### Best For
- Mission-critical financial workflows
- Complex multi-step sagas with compensation
- Large engineering teams
- When you need multi-language support

---

## Comparison Matrix

| Criteria | Inngest | Trigger.dev | Temporal |
|----------|---------|-------------|----------|
| **Supabase Edge Functions** | ⭐⭐⭐ Native | ⭐⭐ Via trigger | ⭐ Needs workers |
| **Vercel Serverless** | ⭐⭐⭐ Native | ⭐⭐ Via trigger | ⭐ Needs workers |
| **Free Tier** | ⭐⭐⭐ 50K exec | ⭐⭐⭐ $5/mo | ⭐ $100/mo min |
| **Setup Complexity** | ⭐⭐⭐ Simple | ⭐⭐ Medium | ⭐ Complex |
| **Learning Curve** | ⭐⭐⭐ Easy | ⭐⭐ Medium | ⭐ Steep |
| **Enterprise Scale** | ⭐⭐ Good | ⭐⭐ Good | ⭐⭐⭐ Best |
| **Durability Guarantees** | ⭐⭐ Good | ⭐⭐ Good | ⭐⭐⭐ Best |
| **AI/Agent Support** | ⭐⭐⭐ Built-in | ⭐⭐⭐ Built-in | ⭐⭐ Manual |

---

## Recommendation for Unison Tasks

### 🏆 **Primary Choice: Inngest**

**Reasons:**
1. **Perfect serverless fit** - Works directly with Supabase Edge Functions and Vercel
2. **Generous free tier** - 50K executions/month is plenty for CRM automation
3. **Minimal infrastructure** - No workers to deploy or manage
4. **Native event-driven** - Aligns with existing `automation_events` architecture
5. **Great DX** - Simple SDK, hot reload in development
6. **AI-ready** - Built-in streaming and agent orchestration support

### 🥈 **Alternative: Trigger.dev**

**Use when:**
- You need long-running jobs without timeouts (>30 seconds)
- Heavy compute tasks (PDF generation, image processing)
- Full Node.js environment needed (Edge runtime too limiting)

### 🥉 **Not Recommended: Temporal**

**Reasons to avoid:**
- $100/mo minimum is expensive for a startup
- Requires running worker processes 24/7
- Overkill for CRM workflow automation
- Doesn't integrate naturally with serverless architecture

---

## Implementation Roadmap

### Phase 1: Inngest Setup (Day 1)
1. Install `inngest` package
2. Create Inngest client with app ID
3. Set up `/api/inngest` webhook endpoint in Vercel
4. Configure Inngest dashboard

### Phase 2: Core Workflows (Days 2-3)
1. Deal stage change automation
2. Lead follow-up sequences
3. Booking confirmations and reminders
4. Review request workflows

### Phase 3: Advanced Features (Week 2)
1. Multi-step email sequences
2. AI-powered response workflows
3. Webhook integrations
4. Real-time progress tracking

### Phase 4: Trigger.dev for Heavy Jobs (Optional)
1. Add Trigger.dev for PDF report generation
2. Batch data processing jobs
3. AI model inference tasks

---

## Quick Start

```bash
# Install Inngest
npm install inngest

# Create inngest client
# src/lib/inngest.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "unison-tasks" });

# Create API route
# api/inngest/route.ts
import { serve } from "inngest/vercel";
import { inngest } from "@/lib/inngest";
import { dealStageWorkflow } from "@/workflows";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dealStageWorkflow],
});
```

---

## Environment Variables

Add these to your Vercel project settings:

```bash
# Inngest (required for CRM automations)
INNGEST_EVENT_KEY=your-event-key        # From Inngest dashboard
INNGEST_SIGNING_KEY=your-signing-key    # From Inngest dashboard

# Trigger.dev (required for heavy jobs)
TRIGGER_API_KEY=your-api-key            # From Trigger.dev dashboard
TRIGGER_API_URL=https://api.trigger.dev # Leave as default for cloud
```

### Getting API Keys

1. **Inngest**: Sign up at [app.inngest.com](https://app.inngest.com), create an app, get keys from Settings
2. **Trigger.dev**: Sign up at [cloud.trigger.dev](https://cloud.trigger.dev), create a project, copy API key

---

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/inngest.ts` | Inngest client & event types |
| `src/lib/inngest-workflows.ts` | CRM automation workflows |
| `src/lib/trigger.ts` | Trigger.dev client |
| `src/trigger/jobs.ts` | Heavy background tasks |
| `src/lib/workflow-triggers.ts` | Helper functions to trigger workflows |
| `api/inngest.ts` | Vercel API route for Inngest webhook |
| `trigger.config.ts` | Trigger.dev configuration |

---

*Last updated: 2024*
