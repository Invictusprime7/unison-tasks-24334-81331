# Automation Recipes Engine

> **Stack**: React 18 + TypeScript 5.9 | Inngest (durable execution) + Trigger.dev (background jobs) | Supabase Edge Functions (Deno)

This document describes the automation/workflow recipe system for Unison Tasks, which provides GoHighLevel-style automation capabilities with industry-specific recipe packs.

## Overview

The automation system follows an event-driven architecture where:
1. **Events** are fired by user actions (button clicks, form submissions, bookings, etc.)
2. **Intent Router** processes the event and triggers the automation engine
3. **Automation Engine** finds matching workflows based on intent + industry
4. **Workflow Runtime** executes the workflow steps with proper scheduling

## Key Features

### 1. Industry + Intent Mapped Recipes
- Each industry (salon, contractor, restaurant, etc.) has pre-configured automation recipes
- Recipes are triggered by specific intents (booking.create, lead.capture, contact.submit)
- Businesses can enable/disable individual recipes

### 2. Business Profile Guardrails
- **Business Hours**: Only send messages during configured hours
- **Quiet Hours**: No SMS/calls during nighttime
- **Rate Limiting**: Max messages per contact per day
- **Deduplication**: Prevent duplicate workflow triggers within a time window

### 3. Loop Prevention
- **Max Steps**: Each run has a maximum step limit (default 100)
- **Max Runtime**: Runs are terminated after 30 minutes
- **Idempotency Keys**: Prevent duplicate runs for the same event
- **Enrollment Tracking**: Control re-enrollment cooldowns

### 4. Template-Driven Defaults
When a user launches a template (e.g., "Booking System"), automations are auto-enabled:
- Booking confirmation
- Reminder schedule
- No-show follow-up
- Review request after completion

## Database Schema

### Core Tables

```sql
-- Events ingested from templates/API
automation_events
  - id, business_id, intent, payload, dedupe_key, processed

-- Workflow definitions
crm_workflows (extended)
  - industry, recipe_id, business_id, is_recipe, category
  - max_enrollments_per_contact, reenroll_after_days
  - suppression_tags, suppression_stages

-- DAG-based workflow steps
automation_nodes
  - workflow_id, node_type (trigger/action/condition/wait/goal)
  - action_type, config, execution_order

-- DAG connections for branching
automation_edges
  - from_node_id, to_node_id, condition_key

-- Workflow execution instances
automation_runs
  - workflow_id, event_id, contact_id, status, current_node_id
  - context, steps_completed, max_steps, idempotency_key

-- Delayed execution queue
automation_jobs
  - run_id, node_id, execute_at, attempts, status

-- Observability
automation_logs
  - run_id, node_id, level, message, data
```

### Settings Tables

```sql
-- Per-business automation settings
business_automation_settings
  - business_hours, quiet_hours, rate_limiting
  - sender_identity, compliance flags

-- Industry recipe packs
automation_recipe_packs
  - pack_id, name, industry, tier, recipes (jsonb)

-- Installed packs per business
installed_recipe_packs
  - business_id, pack_id, enabled

-- Individual recipe toggles
business_recipe_toggles
  - business_id, recipe_id, enabled, custom_config
```

## Edge Functions

### `automation-event`
Ingests events and routes to appropriate workflows:
1. Validates business and settings
2. Deduplicates events
3. Finds matching workflows via intent-recipe mappings
4. Creates automation runs and triggers execution

### `automation-runtime`
Executes workflow runs step-by-step:
1. Loads run context and nodes
2. Checks business/quiet hours
3. Executes each node (actions, conditions, waits)
4. Schedules delayed jobs for wait steps
5. Handles branching via edges

### `workflow-cron`
Processes scheduled jobs:
1. Finds due automation_jobs
2. Resumes paused runs
3. Triggers workflow-runtime for continuation

### `intent-router` (updated)
Routes all intents and fires automation events:
1. Processes the intent (CRM, notifications)
2. Fires automation-event for workflow routing

## Recipe Packs

Pre-configured recipe packs by industry:

### Salon Pack
- Booking Confirmation
- 24hr Reminder
- Review Request after appointment

### Contractor Pack
- Quote Follow-up
- Lead Nurture Sequence
- Job Completion Review

### Restaurant Pack
- Reservation Confirmation
- 2hr Reminder
- No-Show Follow-up

### Agency Pack
- Consultation Booked
- Proposal Follow-up
- Client Onboarding

### E-commerce Pack
- Order Confirmation
- Abandoned Cart Recovery
- Post-Purchase Review

## Frontend Components

### `BusinessAutomationSettings`
React component for managing:
- Recipe pack installation
- Individual recipe toggles
- Business hours / quiet hours
- Rate limiting settings
- Sender identity
- Compliance settings

### `useAutomationEvent` Hook
Utility hook for firing automation events:
```typescript
const { fireBookingCreated, fireLeadCapture, fireContactSubmit } = useAutomationEvent();

// Fire a booking event
await fireBookingCreated(businessId, {
  date: '2024-03-15',
  time: '14:00',
  customerEmail: 'customer@example.com',
});
```

## Button Behavior Changes

**Before**: All button clicks showed an overlay
**After**: Button clicks trigger `button.click` intent for automation routing

Links still show overlays for navigation preview, but buttons now:
1. Fire the `button.click` automation event
2. Record analytics
3. Show visual feedback
4. Let workflows handle the actual automation

## Intent Flow

```
User Action (click/submit)
    ↓
SimplePreview detects intent
    ↓
Fires intent via postMessage
    ↓
Intent Router processes
    ↓
Triggers automation-event
    ↓
Finds matching workflows
    ↓
Creates automation run
    ↓
Automation Runtime executes steps
    ↓
Sends emails/SMS, creates tasks, etc.
```

## Configuration

### Environment Variables
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key
- `RESEND_API_KEY`: For email sending

### Recommended Settings
```json
{
  "business_hours_enabled": true,
  "business_hours_start": "09:00",
  "business_hours_end": "17:00",
  "quiet_hours_enabled": true,
  "quiet_hours_start": "21:00",
  "quiet_hours_end": "08:00",
  "max_messages_per_contact_per_day": 5,
  "dedupe_window_minutes": 60
}
```

## Future Enhancements

1. **A/B Messaging**: Test different message variants
2. **Goal-Based Stops**: Stop automation when contact converts
3. **Visual Workflow Builder**: Drag-and-drop DAG editor
4. **SMS Integration**: Twilio/other SMS providers
5. **Marketplace**: Agency recipe sharing
6. **AI Recipe Generation**: Generate recipes from natural language
