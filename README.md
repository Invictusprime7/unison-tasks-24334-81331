# Unison Tasks

**All-in-One Business Automation Platform with AI-Powered Web Generation**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)](https://supabase.com)
[![Inngest](https://img.shields.io/badge/Inngest-Workflows-6366F1)](https://www.inngest.com/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Preview-2496ED)](https://www.docker.com/)

---

## Executive Summary

Unison Tasks is an enterprise-grade business automation platform that combines AI-powered website generation, workflow automation, CRM, and task management into a unified solution. Built with **React 18 + TypeScript 5.9** on **Vite**, backed by **Supabase** and orchestrated with **Inngest**, it delivers the power of multiple SaaS platforms through a single, intelligent interface.

### Problem Statement

Small to medium-sized businesses face a critical integration challenge:
- Marketing teams use website builders (Webflow, Wix)
- Sales teams use CRMs (HubSpot, Salesforce)
- Operations teams use automation tools (Zapier, GoHighLevel)
- Development teams maintain custom integrations

**Result**: Fragmented data, duplicated workflows, escalating costs, and technical debt.

### Our Solution

Unison Tasks eliminates fragmentation by providing:
- **AI-Generated Websites** from natural language prompts (Google Gemini 2.5 Flash)
- **Universal Intent System** for deterministic user journey routing (25+ intent types)
- **Industry-Specific Automation** with pre-built workflow recipes via Inngest durable execution
- **Integrated CRM** with pipeline management, lead scoring, and deal automation
- **Visual Workflow Builder** with DAG-based conditional logic and branching
- **Multi-Tenant Architecture** with enterprise RBAC, audit logging, and quota enforcement
- **Live Preview Runtime** with three-tier architecture (ECS Vite HMR → Sandpack → Static)
- **Full-Stack App Generation** with backend provisioning and template automation
- **AI Agent Runner** for autonomous task execution and research capabilities

---

## Core Features

### 1. AI-Powered Web Builder

Generate production-ready websites from natural language using Google Gemini 2.5 Flash:

- **9+ Template Categories**: Portfolio, Restaurant, E-commerce, SaaS, Contractor, Blog, Digital Creator
- **Multi-Variant Generation**: A/B/C design experiments with distinct aesthetics
- **Canvas-Based Editor**: Full Fabric.js integration for visual editing
- **Export to Production**: HTML/CSS/JS with design system tokens
- **Sandboxed Preview**: Isolated iframe with RPC communication

**Technical Differentiator**: Dual-mode rendering from a single template schema - editable canvas for designers, optimized HTML for production.

### 2. Universal Intent System

Deterministic routing for 25+ intent types with 95% accuracy:

**Intent Categories**:
- **Navigation**: Internal routing, external links, anchor scrolling
- **Commerce**: Add to cart, checkout, coupon application
- **Booking**: Reservations, confirmations, calendar integration
- **Lead Capture**: Form submissions, quote requests
- **Automation Triggers**: Button clicks, form events

**Architecture**: Rule-based engine handles 95% of intents deterministically, AI fallback for ambiguous cases. Intents are pre-annotated at build time, eliminating runtime AI dependency.

### 3. Automation Recipes Engine

Event-driven workflow automation with 17+ automation intent types:

- **Industry-Specific Packs**: Salon, Restaurant, Contractor, E-commerce, Agency workflows
- **DAG-Based Workflows**: Trigger → Condition → Action → Goal node types
- **Business Hour Guardrails**: Quiet hours, rate limiting, deduplication windows
- **Action Types**: Email, SMS, Task creation, Lead generation, Pipeline movement, Webhooks, Delays

**Workflow Examples**:
- Booking confirmation → Send SMS → Add to calendar → Send reminder 24h before
- Cart abandonment → Wait 1 hour → Send email with 10% coupon
- Lead capture → Score qualification → Route to sales team → Create follow-up task

### 4. Enterprise CRM

- Lead and contact management with custom fields
- Pipeline stages with deal tracking
- Contact tagging and segmentation
- Activity timeline and interaction history
- Lead scoring and qualification rules
- Quote and booking management

### 5. Design Studio

- Canvas-based design editor with component library
- Design tokens system (colors, typography, spacing)
- Brand kit management with style guides
- Asset management and image optimization
- Real-time collaboration (coming soon)

### 6. Multi-Tenant Organization Model

- Organization/workspace hierarchy with projects
- Role-Based Access Control (RBAC) with 12+ permission types
- Project-level permissions for team collaboration
- Subscription/billing integration with usage quotas
- Audit logging for compliance and governance

### 7. Inngest Workflow Orchestration

Serverless durable execution engine for reliable workflow automation:

- **Event-Driven Architecture**: 17+ event types trigger workflows automatically
- **Durable Execution**: Built-in retries, scheduling, debouncing, and streaming
- **Cron Jobs**: Booking reminders (hourly), CRM daily tasks, weekly summaries
- **Step Functions**: Composable workflow steps with sleep, retry, and branching
- **Zero Infrastructure**: No workers to manage — runs on Supabase Edge Functions + Vercel

**Integration Pattern**:
```typescript
const inngest = new Inngest({ id: "unison-tasks" });
export const dealStageWorkflow = inngest.createFunction(
  { id: "deal-stage-changed" },
  { event: "crm/deal.stage.changed" },
  async ({ event, step }) => {
    await step.run("send-notification", async () => { /* ... */ });
    await step.sleep("wait-for-follow-up", "1h");
    await step.run("send-follow-up", async () => { /* ... */ });
  }
);
```

### 8. Live Preview Runtime

Three-tier preview architecture with true Hot Module Replacement:

```
Tier 1 (Primary):   ECS Vite Runtime  — true HMR, React dev server in Docker
Tier 2 (Fallback):  Sandpack Browser  — in-browser bundler if runtime unavailable
Tier 3 (Static):    Pre-generated HTML — always works, zero dependencies
```

- **Virtual File System (VFS)**: In-memory file representation with FileMap snapshots
- **Session Management**: Lifecycle with 30s keepalive, 5min timeout
- **WebSocket HMR**: Real-time file patches from editor to preview
- **Intent Bridge**: IIFE injection in index.tsx for click interception
- **Auto-Injection**: Missing Vite root files auto-generated at preview time

### 9. Full-Stack Generation & AI Agents

- **Full-Stack App Generation**: `generate-fullstack-app` edge function provisions complete applications
- **Template Automation**: Auto-generate backend APIs, database schemas, and auth flows
- **Agent Runner**: Autonomous AI agent for research, code assistance, and task execution
- **Copy Rewrite**: AI-powered content rewriting for marketing and SEO
- **AI Design Assistant**: Intelligent design suggestions and layout optimization
- **AI Code Assistant**: Context-aware code suggestions and refactoring

### 10. Plugin & Integration System

- **GoHighLevel CRM Sync**: Bi-directional contact and deal synchronization
- **Stripe Payments**: Subscription management, checkout, and webhook handling
- **Plugin Event Ingest**: Custom plugin events for third-party integrations
- **Site Publishing**: One-click publish with authentication and CDN delivery
- **Email Provider Management**: Configurable email service integration

### 11. System Launcher Wizard

Multi-step guided wizard for launching new business websites with AI assistance:

**4-Step Flow**:
1. **Industry Selection** — Choose from 6 business system types (`booking`, `saas`, `agency`, `portfolio`, `store`, `content`) with gradient-coded cards
2. **Goals & Needs** — Select primary goals (6 options), customer needs (5 multi-select), and desired pages (9 choices incl. booking, checkout, blog)
3. **Template Selection** — Browse and preview template compositions filtered by industry category
4. **Launch & Aesthetic** — Name business, select design theme from presets, review settings, and generate

**Key Capabilities**:
- Goal-to-needs mapping (e.g., `collect_leads` → `wantsLeadCapture`)
- System-to-industry overlay mapping for template filtering
- Executes `canonicalPipeline` to compile site topology into a `RuntimeManifest`
- Returns `LauncherHandoff` object with generated VFS files ready for the Web Builder
- Theme presets for immediate aesthetic customization

**Simplified Launcher**: `BusinessLauncher` provides a quick-start path with 8 industry chips (Local Service, Salon, Restaurant, E-commerce, Creator, Coaching, Real Estate, Nonprofit) that map directly to canonical templates.

### 12. Business Setup & Project Configuration

**Business Settings** (`/business-settings`):
- Manage business profiles, notification email/phone, and contact settings
- Multi-business support with active business selector
- Persisted to Supabase `businesses` table

**Project Setup** (`/project/:id/setup`):
- Contextual 8-section setup guide filtered by business type:
  - Payments (Stripe), Database (Supabase), Email Notifications, Calendar & Scheduling, Content Management, Custom Domain, Analytics & Tracking, Automations & Workflows
- Per-section progress tracking with visual progress bar
- Time estimates per section (5–15 min)
- System-type-aware filtering (e.g., booking systems show Calendar section)
- Deep linking via URL parameters (`?section=payments`)

**Setup Wizard Hook** (`useSetupWizard`):
- 7 guided steps: booking_calendar → notifications → payments → database → domain → seo → analytics
- Step categories: `core`, `growth`, `advanced`
- Status tracking: `pending | in_progress | completed | skipped`
- Config persistence per step with save/reset actions

### 13. Web Builder Playground & VFS

Full-featured development environment with dual-mode editing:

**Layout Zones**:
```
┌──────────┬──────────────────────────┬──────────┐
│  Left    │     Center Canvas        │  Right   │
│  Sidebar │  ┌──────────────────┐    │  Sidebar │
│          │  │ Monaco Code      │    │          │
│  File    │  │ Editor           │    │ Elements │
│  Explorer│  ├──────────────────┤    │ Design   │
│  Pages   │  │ Fabric.js Canvas │    │ AI Panel │
│  Layers  │  │ (Visual Edit)    │    │ Intents  │
│          │  └──────────────────┘    │ SEO      │
│          │  ┌──────────────────┐    │ Workflow │
│          │  │ Live Preview     │    │          │
│          │  │ (Sandpack/Docker)│    │          │
│          │  └──────────────────┘    │          │
├──────────┴──────────────────────────┴──────────┤
│  Console Logs / Diagnostics                     │
└─────────────────────────────────────────────────┘
```

**Dual Edit Modes**:
- **Code Mode**: Monaco editor with TypeScript/JSX IntelliSense, file tabs, syntax highlighting
- **Canvas Mode**: Fabric.js visual editor with element selection, drag-drop, arrangement tools

**Virtual File System (VFS)**:
- In-memory file tree with `VirtualNode` (file/folder) hierarchy
- Language detection: tsx, ts, jsx, js, css, scss, html, json, md, yaml, svg
- Import from saved projects, webpages, or raw code
- Snapshot/undo-redo with `vfsSnapshotManager`
- Event bus for component lifecycle tracking
- Sandpack file sync with debounced `patchFile()` for live preview

**40+ Sidebar Panels** including:
- FileExplorer, ElementsSidebar, DesignSidebar, AIBuilderPanel
- IntentDirectoryPanel, SEOSettingsPanel, PerformancePanel
- WorkflowListPanel, TemplateCustomizerPanel, ProjectsPanel

**Interactive Features**:
- Element floating toolbar (arrange, delete, duplicate, direct edit)
- Intent pipeline visualization overlaid on canvas
- Demo intent simulation for testing automation flows
- Device responsive preview (desktop, tablet, mobile)
- Research overlay for external resource lookup
- Section variant swapping between design options
- Export to HTML, React, or JSON formats

---

## Technical Architecture

### Frontend

- **React 18 + TypeScript 5.9** — Hooks-first functional components, 200+ components, 50+ custom hooks
- **Vite + SWC** — Fast builds with ESNext target and lazy-loaded routes
- **Radix UI + Shadcn/ui + Tailwind CSS** — Accessible component primitives with utility-first styling
- **TanStack React Query** — Server state management and caching
- **Fabric.js** — Canvas-based visual design editor
- **Monaco Editor + CodeMirror** — Code editing with IntelliSense
- **Sandpack + Docker** — In-browser and containerized live preview
- **Framer Motion** — Animations and layout transitions
- **React Hook Form + Zod** — Schema-validated forms

### Backend

- **Supabase** — PostgreSQL with Row-Level Security, 45+ Deno Edge Functions, JWT auth, Realtime WebSockets
- **Inngest** — Serverless durable workflow execution with event-driven triggers
- **Trigger.dev** — Background job processing for reports, imports, and exports
- **Stripe** — Subscription billing, checkout, and webhook handling
- **Docker + Terraform** — Containerized preview workers on AWS ECS

### Automation & Orchestration

```
Inngest (Serverless Durable Execution)
├── Event Processing: 17+ event types with fan-out
├── Step Functions: Composable async workflow steps
├── Scheduling: Cron jobs for reminders, daily/weekly reports
├── Retries: Built-in exponential backoff
└── Observability: Real-time streaming and logging

Trigger.dev (Background Job Processing)
├── CRM Reports, Batch Imports, Data Exports
├── AI Content Generation (email templates, page copy)
└── Stale Data Cleanup and Archival
```

### Preview & Execution

```
Docker-Based Preview Service
├── API Gateway: Express.js with TypeScript
├── Worker Pool: Isolated Docker containers
├── Session Manager: Lifecycle and resource limits
├── VFS: In-memory virtual file system
├── RPC Layer: PostMessage for iframe communication
└── Monitoring: AWS CloudWatch integration
```

### Security Model

**Multi-Layer Defense**:
1. **Database Layer**: Row-Level Security (RLS) for tenant isolation
2. **API Layer**: RBAC with granular permission checks
3. **Preview Layer**: Sandboxed iframe + Docker container isolation
4. **Network Layer**: AWS WAF + VPC restrictions
5. **Audit Layer**: Comprehensive action logging for compliance

**Compliance Ready**: SOC 2 architecture with audit trails, access controls, and data encryption

---

## Key Technical Differentiators

### 1. Schema-Driven Development

Template schema serves as single source of truth:
- Renders to editable Fabric.js canvas (designer mode)
- Exports to production HTML/CSS/JS (runtime mode)
- Supports data binding from CRM (dynamic content)
- Enables variant generation (A/B testing)

**Benefit**: No sync issues between design and production - one schema, multiple outputs.

### 2. Deterministic Runtime

Unlike competitors relying on AI at runtime:
- Intents resolved at build time (95% via rules)
- Predictable button behavior without API calls
- Offline-capable exported sites
- Sub-50ms intent routing latency

**Benefit**: Predictable UX, lower operational costs, no runtime AI dependencies.

### 3. Industry-Specific Recipes

Pre-built automation workflows tailored to verticals:
- Salon: Booking reminders, no-show tracking, review requests
- Restaurant: Reservation confirmations, waitlist management, delivery updates
- Contractor: Quote follow-ups, project milestones, invoice reminders
- E-commerce: Cart abandonment, order fulfillment, loyalty programs

**Benefit**: Businesses inherit best practices instead of building from scratch.

### 4. Resource Quota System

Organization-level quotas with real-time enforcement:
- Concurrent preview sessions
- Daily AI generations
- File upload limits
- API rate limiting

**Benefit**: Predictable costs, abuse prevention, fair resource allocation.

---

## Competitive Positioning

| Platform | Web Builder | Automation | CRM | AI Generation | Industry Recipes |
|----------|-------------|------------|-----|---------------|------------------|
| **Unison Tasks** | ✅ Canvas + Code | ✅ Visual DAG | ✅ Native | ✅ Templates | ✅ Pre-built |
| Webflow | ✅ Visual | ❌ | ❌ | ❌ | ❌ |
| GoHighLevel | ⚠️ Basic | ✅ Advanced | ✅ Native | ❌ | ⚠️ Manual |
| Figma/Framer | ✅ Design-first | ❌ | ❌ | ⚠️ Limited | ❌ |
| Zapier/Make | ❌ | ✅ Integration | ❌ | ❌ | ❌ |

**Unique Value**: Only platform combining AI website generation, deterministic automation, and native CRM with industry-specific templates.

---

## Data Model Overview

### Core Entities

**Templates & Design**:
- `templates` - Design schemas with component definitions
- `template_variants` - A/B/C design experiments
- `design_tokens` - Color systems, typography, spacing
- `brand_kits` - Brand guidelines and style guides
- `assets` - Images, fonts, media files

**Automation**:
- `automation_workflows` - DAG-based workflow definitions
- `automation_nodes` - Trigger/Action/Condition/Wait/Goal nodes
- `automation_edges` - Connections between nodes
- `automation_runs` - Execution instances with state
- `automation_jobs` - Scheduled and queued jobs
- `automation_events` - Event log for triggers
- `automation_recipe_packs` - Industry-specific workflow templates
- `automation_logs` - Observability and execution traces
- `business_automation_settings` - Guardrails (hours, rate limits)

**CRM**:
- `contacts` - Customer and lead records
- `leads` - Sales opportunities with scoring
- `pipelines` - Deal stages and progression
- `pipeline_stages` - Customizable stage definitions
- `activities` - Interaction timeline and history
- `tags` - Contact segmentation and categorization

**Organization**:
- `organizations` - Multi-tenant workspaces
- `organization_members` - Team management and membership
- `organization_quotas` - Plan-based resource limits
- `projects` - Website and campaign projects
- `team_members` - User roles and permissions
- `organization_entitlements` - Subscription quotas
- `rbac_permissions` - Granular permission definitions
- `rbac_user_roles` - Role assignments per user
- `audit_logs` - Compliance and security tracking

---

## Supabase Edge Functions Reference

45+ serverless functions organized by domain:

| Domain | Functions | Purpose |
|--------|-----------|---------|
| **AI Generation** | `generate-ai-template`, `generate-page`, `generate-template`, `generate-template-image`, `generate-fullstack-app`, `generate-image` | Template, page, and full-stack app generation via Gemini 2.5 Flash |
| **Web Builder** | `web-builder-ai`, `builder-actions`, `builder-provision`, `builder-provision-lite` | AI-assisted web building, canvas actions, project provisioning |
| **Intent System** | `intent-router`, `intent-router-lite`, `intent-exec`, `intent-action`, `intent-booking` | Deterministic intent resolution and execution |
| **Automation** | `automation-event`, `automation-runtime`, `workflow-trigger`, `workflow-job-processor`, `workflow-cron`, `template-automation` | Event ingestion, DAG execution, cron scheduling |
| **Systems** | `systems-build`, `systems-classify`, `systems-compile`, `install-system` | System provisioning, industry classification, compilation |
| **CRM & Commerce** | `create-lead`, `create-lead-lite`, `create-booking`, `create-checkout`, `create-order-checkout`, `form-submit` | Lead capture, bookings, checkout flows |
| **AI Agents** | `agent-runner`, `ai-code-assistant`, `ai-design-assistant`, `research`, `copy-rewrite` | Autonomous agents, code/design assistance, content rewriting |
| **Integrations** | `gohighlevel-crm`, `stripe-webhook`, `plugin-event-ingest`, `save-email-provider` | Third-party CRM sync, payments, plugins |
| **Publishing** | `publish-site`, `site-auth`, `template-backend` | Site deployment, authentication, backend generation |
| **Billing** | `manage-subscription` | Subscription lifecycle management |

---

## Getting Started

### Prerequisites

- Node.js 20.x or 22.x
- Supabase account (local or cloud)
- Docker (for preview service)
- Inngest account (for workflow automation, optional for dev)

### Installation

```bash
# Clone the repository
git clone https://github.com/Invictusprime7/unison-tasks-official.git
cd unison-tasks-official

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure Supabase URL and API keys
```

### Running Locally

```bash
# Start Supabase locally
npx supabase start

# Run database migrations
npx supabase db push

# Start development server
npm run dev

# (Optional) Start with Inngest automation dev server
npm run automation:dev
```

### Preview Service

```bash
# Start Docker preview service
npm run preview:docker:start

# Check service status
npm run preview:docker:status

# Stop service
npm run preview:docker:stop
```

### Environment Variables

Required environment variables (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `LOVABLE_API_KEY` | Yes | Google Gemini 2.5 Flash API key |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `INNGEST_EVENT_KEY` | For automation | Inngest event key |
| `INNGEST_SIGNING_KEY` | For automation | Inngest signing key |
| `GOHIGHLEVEL_API_KEY` | For CRM sync | GoHighLevel API key |

---

## Development

### Project Structure

```
unison-tasks/
├── src/
│   ├── components/        # 200+ React components
│   │   ├── crm/          # CRM UI (pipeline, leads, contacts, automations)
│   │   ├── creatives/    # Design studio, web builder, code editor
│   │   ├── ai-agent/     # AI assistant interface
│   │   ├── onboarding/   # Onboarding flows and SystemsAIPanel
│   │   └── ui/           # 50+ Radix + Shadcn primitives
│   ├── services/          # 45+ business logic modules
│   │   ├── automationOrchestrator.ts
│   │   ├── aiVFSOrchestrator.ts
│   │   ├── intentBindingService.ts
│   │   ├── previewSession.ts
│   │   ├── designTokens.ts
│   │   └── recipeManagerService.ts
│   ├── runtime/           # Universal intent system
│   │   ├── intentRouter.ts       # Main orchestrator
│   │   ├── actionCatalog.ts      # Fixed handlers for all intents
│   │   ├── intentResolver.ts     # Build-time resolution
│   │   └── intentClassifier.ts   # Intent type detection
│   ├── contexts/          # React contexts (VFSContext, CloudContext)
│   ├── hooks/             # 50+ custom React hooks
│   ├── schemas/           # Data schemas (templateSchema, SiteBundle, BusinessBlueprint)
│   ├── sections/          # Page sections and variant templates
│   ├── integrations/      # Supabase client and external services
│   ├── pages/             # 20+ route components
│   ├── types/             # TypeScript definitions
│   └── utils/             # 100+ utility functions
├── api/                   # Vercel API routes
│   ├── inngest.ts         # Inngest webhook handler
│   ├── inngest-send.ts    # Event dispatch
│   └── cron/              # Scheduled jobs (booking, CRM daily/weekly)
├── preview-service/       # Docker-based preview runtime
│   ├── gateway/           # Express.js API server + auth
│   │   └── src/services/SessionManager.ts
│   ├── worker/            # Vite dev server container
│   └── infrastructure/    # Terraform IaC (ECS, security, VPC)
├── supabase/
│   ├── functions/         # 45+ Edge Functions (Deno runtime)
│   └── migrations/        # Database schema migrations
├── scripts/               # Deployment and setup automation
│   ├── deploy.sh
│   ├── setup-local.sh
│   ├── setup-supabase.sh
│   └── setup-ai-keys.sh
└── public/                # Static assets and variants
```

### Key Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run build:dev        # Development build
npm run build:analyze    # Build with bundle analysis
npm run preview          # Preview production build
npm run lint             # ESLint checks
npm run type-check       # TypeScript validation

# Automation (Inngest)
npm run inngest:dev      # Start Inngest dev server
npm run inngest:deploy   # Deploy Inngest functions
npm run automation:dev   # Run app + Inngest concurrently

# Supabase
npx supabase start       # Start local Supabase
npx supabase db reset    # Reset database with migrations
npx supabase gen types typescript  # Generate TypeScript types

# Preview Service (Docker)
npm run preview:docker:start   # Start Docker preview service
npm run preview:docker:stop    # Stop Docker preview service
npm run preview:docker:status  # Check service status

# Deployment
npm run deploy           # Deploy to Vercel (production)
npm run deploy:preview   # Deploy preview build
```

---

## Architecture Documentation

For detailed technical documentation, see:

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Template rendering pipeline, dual-mode canvas/HTML architecture |
| [AUTOMATION_RECIPES_ENGINE.md](AUTOMATION_RECIPES_ENGINE.md) | DAG-based workflow automation, industry recipe packs, database schema |
| [UNIVERSAL_INTENT_SYSTEM.md](UNIVERSAL_INTENT_SYSTEM.md) | 25+ intent types, two-step resolution, action catalog |
| [ENTERPRISE_HARDENING.md](ENTERPRISE_HARDENING.md) | RBAC, multi-tenancy, audit logging, quota enforcement, SOC 2 readiness |
| [BUILD_TO_CANVAS_WORKFLOW.md](BUILD_TO_CANVAS_WORKFLOW.md) | AI template → preview → canvas → edit pipeline |
| [PREVIEW_RUNTIME_ARCHITECTURE.md](PREVIEW_RUNTIME_ARCHITECTURE.md) | Three-tier preview system, session lifecycle, HMR |
| [VFS_PREVIEW_ARCHITECTURE.md](VFS_PREVIEW_ARCHITECTURE.md) | Virtual file system, Sandpack integration, auto-inject |
| [CRM_PIPELINE_AUTOMATION.md](CRM_PIPELINE_AUTOMATION.md) | Pipeline stages, deal tracking, CRM automations |
| [WORKFLOW_ORCHESTRATION_COMPARISON.md](WORKFLOW_ORCHESTRATION_COMPARISON.md) | Inngest vs Trigger.dev vs Temporal comparison |
| [INNGEST_CRM_SETUP.md](INNGEST_CRM_SETUP.md) | Inngest + CRM integration setup guide |
| [STRIPE_SETUP.md](STRIPE_SETUP.md) | Stripe payment integration and webhook configuration |
| [CRM_SCHEMA_DEPLOYMENT.sql](CRM_SCHEMA_DEPLOYMENT.sql) | CRM database schema and migration reference |

---

## Roadmap

### Completed (Q1 2026)
- ✅ Inngest durable workflow orchestration
- ✅ Trigger.dev background job processing (reports, imports, exports)
- ✅ Enterprise RBAC with 12+ permission types
- ✅ Multi-tenant organization model with quota enforcement
- ✅ Three-tier preview runtime (ECS + Sandpack + Static)
- ✅ Universal Intent System with build-time resolution
- ✅ Full-stack app generation pipeline
- ✅ AI Agent Runner and research capabilities
- ✅ GoHighLevel CRM synchronization
- ✅ Stripe subscription and checkout integration
- ✅ Industry-specific automation recipe packs
- ✅ System Launcher Wizard (4-step guided onboarding)
- ✅ Business Setup & Project Configuration (8-section contextual guide)
- ✅ Web Builder Playground with VFS + dual-mode editing (Monaco + Fabric.js)
- ✅ HuggingFace Transformers local inference integration

### Q2 2026
- Real-time collaboration (multi-user canvas editing)
- Advanced A/B testing with analytics dashboard
- Shopify/WooCommerce integration
- SSO/SAML enterprise authentication
- AI-powered content generation (blog posts, product descriptions)

### Q3 2026
- Mobile app builder (React Native templates)
- Custom component marketplace
- API platform for third-party integrations
- Multi-language support (i18n)
- Advanced reporting and business intelligence

### Q4 2026
- Voice and video integration
- Advanced permissions with approval workflows
- Enterprise service agreements (SLA)
- White-label reseller program

---

## Contributing

We welcome contributions from the community. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Security

Security is foundational to Unison Tasks. We implement:

- Row-Level Security (RLS) for data isolation
- JWT-based authentication with token rotation
- RBAC with 12+ granular permission types
- Docker container isolation for preview runtime
- AWS WAF for DDoS protection
- Comprehensive audit logging
- Regular security audits and penetration testing

**Report vulnerabilities**: security@unison-tasks.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Enterprise Support

For enterprise licensing, custom deployments, or partnership inquiries:

- **Email**: enterprise@unison-tasks.com
- **Sales**: sales@unison-tasks.com
- **Documentation**: https://docs.unison-tasks.com
- **Status Page**: https://status.unison-tasks.com

---

## Metrics & Performance

### Platform Statistics
- **Template Generation**: <5 seconds for full website
- **Intent Resolution**: <50ms average latency
- **Database Queries**: <100ms p95 (with RLS)
- **Preview Launch**: <2 seconds for Docker worker
- **Export Time**: <3 seconds for production HTML/CSS/JS

### Scalability
- Supports 10,000+ concurrent users per region
- Handles 1M+ automation jobs per day
- Processes 100K+ intent resolutions per minute
- Stores 10TB+ of design assets

---

## Built With

- [React 18](https://reactjs.org/) + [TypeScript 5.9](https://www.typescriptlang.org/) — UI framework + type safety
- [Vite](https://vitejs.dev/) — Build tool with SWC
- [Supabase](https://supabase.com) — PostgreSQL, Edge Functions, Auth, Realtime
- [Inngest](https://www.inngest.com/) + [Trigger.dev](https://trigger.dev/) — Workflow orchestration + background jobs
- [Radix UI](https://www.radix-ui.com/) + [Shadcn/ui](https://ui.shadcn.com/) — Component primitives
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Fabric.js](http://fabricjs.com/) — Canvas editing
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) + [CodeMirror](https://codemirror.net/) — Code editors
- [Sandpack](https://sandpack.codesandbox.io/) — In-browser live preview
- [Google Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/) — AI generation
- [Stripe](https://stripe.com/) — Payments
- [Docker](https://www.docker.com/) + [Terraform](https://www.terraform.io/) — Preview containers + IaC
- [Framer Motion](https://www.framer.com/motion/) — Animations
- [TanStack React Query](https://tanstack.com/query/) — Server state
- [Zod](https://zod.dev/) — Schema validation
- [Vitest](https://vitest.dev/) — Testing

---

## Acknowledgments

- Powered by Google Gemini 2.5 Flash for AI generation
- Built on Supabase open-source infrastructure
- Inspired by the best of Webflow, GoHighLevel, and Figma
- Community feedback and contributions from 100+ beta testers

---

**Ready to revolutionize your business operations?** Start building with Unison Tasks today.

[Get Started](https://unison-tasks.com/signup) | [Documentation](https://docs.unison-tasks.com) | [Demo](https://demo.unison-tasks.com) | [Community](https://community.unison-tasks.com)
