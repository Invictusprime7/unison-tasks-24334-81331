# CRM Pipeline Automation

> **Stack**: React 18 + TypeScript 5.9 | Supabase PostgreSQL (RLS) | Inngest (durable workflows) | Trigger.dev (CRM reports, batch import)

## Overview

The CRM Pipeline Automation feature provides a visual kanban-style board for managing deals and automating workflows when deals move through pipeline stages.

## Features

### Pipeline Board
- **Visual Organization**: Deals organized into 4 stages
  - Prospecting
  - Negotiation
  - Closed Won
  - Closed Lost
- **Drag & Drop**: Move deals between stages by dragging cards
- **Real-time Stats**: See deal counts and total value per stage
- **Pipeline Analytics**: 
  - Total deals count
  - Total pipeline value
  - Won deals count
  - Win rate percentage

### Deal Management
- Create new deals with title, value, and expected close date
- Track deal value in dollars
- Set expected close dates
- Link deals to contacts and leads
- Search and filter deals

### Automation Engine
When a deal moves to a new stage, the system:
1. Checks for active automations with "deal_stage_changed" trigger
2. Evaluates automation conditions (old_stage, new_stage)
3. Executes configured actions if conditions match

### Automation Types
Create custom automations in the Automations tab with:

**Trigger Events:**
- Contact Created
- Lead Created
- Lead Status Changed
- Deal Created
- Deal Stage Changed
- Form Submitted

**Action Types** (Coming Soon):
- Send Email
- Create Task
- Update Field
- Add Tag
- Trigger Webhook

## Usage

### Accessing the Pipeline
1. Navigate to `/crm` in your application
2. Click on "Pipeline" in the sidebar
3. You'll see your deals organized by stage

### Creating a Deal
1. Click the "Add Deal" button
2. Fill in the deal details:
   - Title (required)
   - Value (optional)
   - Expected Close Date (optional)
3. Click "Create Deal"

### Moving Deals Through Stages
1. Click and hold on a deal card
2. Drag it to the desired stage column
3. Release to drop
4. The deal updates automatically and triggers any relevant automations

### Setting Up Automation
1. Navigate to the "Automations" tab
2. Click "Add Automation"
3. Configure:
   - Name: Descriptive name for the automation
   - Trigger Event: When the automation should run
   - (Advanced configuration coming soon)
4. Toggle the switch to activate/deactivate

## Database Schema

The pipeline uses the following tables:
- `crm_deals`: Stores deal information and current stage
- `crm_automations`: Stores automation rules
- `crm_contacts`: Linked contact information
- `crm_leads`: Linked lead information

## Future Enhancements

- [ ] Advanced condition builder UI
- [ ] Action configuration UI
- [ ] Email template integration
- [ ] Task creation automation
- [ ] Webhook triggers
- [ ] Deal activity timeline
- [ ] Pipeline custom stages
- [ ] Deal assignments
- [ ] Probability weighting
- [ ] Forecast reporting

## Technical Notes

### Automation Condition Format
```json
{
  "field": "new_stage",
  "value": "closed_won"
}
```

### Automation Action Format
```json
{
  "type": "send_email",
  "config": {
    "template_id": "deal-won-notification",
    "recipients": ["sales@example.com"]
  }
}
```

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only view and manage their own deals and automations
- Form submissions are public but require authentication to view
- All automation executions are logged for audit purposes
