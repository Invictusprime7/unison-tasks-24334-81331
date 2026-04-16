# Unison Tasks — Architecture Documentation

## Framework Foundation

**React 18.3 + TypeScript 5.9** application built on **Vite + SWC** with a hooks-first, context-driven architecture.

| Layer | Technology | Config |
|-------|-----------|--------|
| **Runtime** | React 18.3 + ReactDOM | Function components, hooks-first, no class components |
| **Type System** | TypeScript 5.9 (relaxed strict) | `react-jsx` transform, bundler moduleResolution, `@/*` path alias |
| **Build** | Vite + @vitejs/plugin-react-swc | ESNext target, manual chunk splitting, 1000kb warning limit |
| **State** | TanStack React Query 5 + React Context | 3 contexts: VFSProvider, CloudProvider, DirectionProvider |
| **UI** | Radix UI (30+) + Shadcn/ui (50+) + Tailwind 3.4 | CVA for variants, Lucide icons, Framer Motion animations |
| **Canvas** | Fabric.js 7.2 | Scene model, layers, drag-drop, arrangement tools |
| **Editors** | Monaco Editor 4.7 + CodeMirror 6 | Full IntelliSense + lightweight syntax editing |
| **Preview** | Sandpack 2.20 + Docker Vite | In-browser bundler + containerized HMR dev server |
| **Backend** | Supabase (PostgreSQL + Deno Edge) | 45+ functions, RLS, JWT auth, Realtime WebSockets |
| **Orchestration** | Inngest + Trigger.dev | Durable workflows + background jobs (reports, imports) |
| **AI** | Google Gemini 2.5 Flash + HuggingFace Transformers | Server-side generation + browser-local inference |

## Phase 2 & 3 Implementation: Complete ✅ | Phase 4+ Systems: Active

### System Integration Map

```
┌──────────────────────────────────────────────────────────────────┐
│                     Unison Tasks Platform                         │
│                  React 18 + TypeScript 5.9 + Vite                │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ System   │ AI Web   │ Automa-  │ CRM &    │ VFS      │ Enter-   │
│ Launcher │ Builder  │ tion     │ Commerce │ Preview  │ prise    │
│ Wizard   │ Play-    │ Engine   │ Pipeline │ Runtime  │ RBAC &   │
│ (4-step  │ ground   │ (Inngest │ (Leads,  │ (3-Tier) │ Multi-   │
│ guided)  │ (Monaco  │ + DAG +  │ Deals,   │ Sandpack │ Tenant   │
│ + Biz    │ +Fabric  │ Trigger  │ Booking) │ +Docker  │ + Audit  │
│ Setup    │ +VFS)    │ .dev)    │          │ +Static) │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
     ▲           ▲          ▲          ▲          ▲          ▲
     └───────────┴──────────┴──────────┴──────────┴──────────┘
              Supabase (PostgreSQL + 45+ Deno Edge Functions)
              + Inngest (Durable Execution) + Trigger.dev (Jobs)
```

### User Journey Flow

```
System Launcher Wizard                    Web Builder Playground
┌─────────────────────┐                  ┌──────────────────────┐
│ 1. Industry Select  │                  │ Monaco Code Editor   │
│ 2. Goals & Needs    │──LauncherHandoff─│ Fabric.js Canvas     │
│ 3. Template Browse  │  (VFS files +    │ VFS File Explorer    │
│ 4. Theme & Launch   │  RuntimeManifest)│ Live Sandpack Preview│
└─────────────────────┘                  └──────────┬───────────┘
         │                                          │
         ▼                                          ▼
┌─────────────────────┐                  ┌──────────────────────┐
│ Project Setup       │                  │ Publish / Deploy     │
│ (8-section guide)   │                  │ (Vercel / CDN)       │
│ Payments, DB, Email │                  │ Preview → Production │
│ Calendar, Domain... │                  │                      │
└─────────────────────┘                  └──────────────────────┘
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Input (AI Prompt)                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Function                        │
│              (generate-ai-template/web-builder-ai)               │
│                                                                   │
│  • Lovable AI (google/gemini-2.5-flash)                         │
│  • Generates structured template schema                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Template Schema (Source of Truth)              │
│                                                                   │
│  AIGeneratedTemplate {                                           │
│    sections: TemplateSection[]                                   │
│    components: TemplateComponent[]                               │
│    brandKit: TemplateBrandKit                                    │
│    data: TemplateData                                            │
│  }                                                                │
└────────────────┬──────────────────────────┬─────────────────────┘
                 │                          │
                 ▼                          ▼
┌────────────────────────────┐  ┌──────────────────────────────────┐
│   Fabric.js Canvas         │  │   HTML/CSS Export                │
│   (Editing Mode)           │  │   (Preview Mode)                 │
│                            │  │                                  │
│  TemplateRenderer          │  │  TemplateToHTMLExporter          │
│  • Validates schema        │  │  • Applies design tokens         │
│  • Preloads assets         │  │  • Semantic HTML tags            │
│  • Renders to Fabric       │  │  • Google Fonts integration      │
│  • User can edit objects   │  │  • Sanitizes output              │
└────────────────────────────┘  └──────────────┬───────────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────────────┐
                                  │  SecureIframePreview            │
                                  │  • Sandboxed execution          │
                                  │  • RPC messaging                │
                                  │  • VFS file system              │
                                  │  • Live HTML preview            │
                                  └─────────────────────────────────┘
```

## Key Components

### 1. State Management (`useTemplateState.ts`)

**Single Source of Truth**: Template schema drives both rendering modes.

```typescript
const templateState = useTemplateState(fabricCanvas);

// Update template → triggers dual rendering
await templateState.updateTemplate(aiTemplate);

// Access synchronized state
const { template, html, css, isRendering } = templateState;
```

**Features:**
- ✅ Template schema as source of truth
- ✅ Automatic dual rendering (Fabric + HTML)
- ✅ Asset preloading before render
- ✅ HTML sanitization before iframe injection
- ✅ Data binding support

### 2. Template Rendering Pipeline

#### A. Fabric Canvas (Editing)
**File**: `src/utils/templateRenderer.ts`

```typescript
const renderer = new TemplateRenderer(fabricCanvas);
await renderer.renderTemplate(template);
```

**5 Pillars of Reliability:**
1. ✅ Schema validation (TemplateValidator)
2. ✅ Deterministic layout (LayoutEngine)
3. ✅ Safe adapter pattern (error isolation)
4. ✅ Asset preloading (AssetPreloader)
5. ✅ Error state rendering

#### B. HTML Export (Preview)
**File**: `src/utils/templateToHTMLExporter.ts`

```typescript
const exporter = new TemplateToHTMLExporter();
const html = exporter.exportToHTML(template);
```

**Features:**
- ✅ Design tokens from `index.css`
- ✅ Semantic HTML5 tags (`<header>`, `<section>`, `<footer>`)
- ✅ Responsive CSS with token mapping
- ✅ Google Fonts auto-loading
- ✅ Framework-agnostic clean code

### 3. Integration with Existing Tools

#### AssetPreloader (`assetPreloader.ts`)
```typescript
// Automatically used in useTemplateState
const assets = assetPreloader.extractAssetUrls(template);
await assetPreloader.preloadFonts(assets.fonts);
await assetPreloader.preloadImages(assets.images);
```

**Benefits:**
- ✅ Prevents "white flash" on render
- ✅ Progress callbacks for UX
- ✅ Caching for performance

#### LayoutEngine (`layoutEngine.ts`)
```typescript
// Used internally by TemplateRenderer
const layout = layoutEngine.applyLayout(section);
// Returns deterministic positions
```

**Benefits:**
- ✅ Consistent positioning
- ✅ Flexbox-based calculations
- ✅ Auto-layout support

#### HTMLSanitizer (`htmlSanitizer.ts`)
```typescript
// Applied before iframe injection
const clean = sanitizeHTML(exportedHtml);
const safeCss = sanitizeCSS(rawCss);
```

**Security:**
- ✅ DOMPurify integration
- ✅ CSP headers in iframe
- ✅ XSS prevention

### 4. Secure Iframe Preview

**File**: `src/components/SecureIframePreview.tsx`

**Security Architecture:**
```html
<iframe 
  sandbox="allow-scripts allow-pointer-lock"
  <!-- NO allow-same-origin for max isolation -->
/>
```

**Features:**
- ✅ Sandboxed execution environment
- ✅ RPC messaging layer (`rpc.ts`)
- ✅ Virtual filesystem (`vfs.ts`)
- ✅ Console/error interception
- ✅ Content Security Policy

### 5. AI Integration

**Edge Function**: `supabase/functions/generate-ai-template/index.ts`

**Model**: `google/gemini-2.5-flash` (FREE during Sept 29 - Oct 13, 2025)

**Response Format:**
```json
{
  "template": { /* AIGeneratedTemplate */ },
  "explanation": "Created a modern landing page...",
  "html": "<!DOCTYPE html>...",
  "css": "/* Design tokens applied */"
}
```

## Design Token System

**Source**: `src/index.css`

### Color Tokens (HSL)
```css
--primary: 210 100% 50%;
--secondary: 0 0% 90%;
--accent: 200 90% 55%;
```

### Spacing Scale
```css
--space-1: 0.25rem;  /* 4px */
--space-4: 1rem;     /* 16px */
--space-8: 2rem;     /* 32px */
```

### Typography
```css
--font-size-base: 1rem;
--font-size-2xl: 1.5rem;
--font-size-4xl: 2.25rem;
```

**Usage in Exports:**
```css
.component-heading {
  font-size: var(--font-size-4xl);
  color: hsl(var(--primary));
  padding: var(--space-8);
}
```

## Data Flow

### Template Generation
```
1. User: "Create a landing page"
   ↓
2. AI Assistant detects template request
   ↓
3. Edge function → Lovable AI → Structured schema
   ↓
4. useTemplateState.updateTemplate(schema)
   ↓
5. PARALLEL:
   - TemplateRenderer → Fabric Canvas
   - TemplateToHTMLExporter → HTML/CSS
   ↓
6. SecureIframePreview displays sanitized HTML
```

### Canvas Edits (Future)
```
1. User edits object on Fabric Canvas
   ↓
2. Canvas event listener detects change
   ↓
3. Update template schema
   ↓
4. Re-export HTML/CSS
   ↓
5. Update VFS → refresh iframe
```

## File Structure

```
src/
├── hooks/                              # 50+ custom React hooks
│   ├── useTemplateState.ts             # Canvas template state (source of truth)
│   ├── useWebBuilder.ts                # Web builder state management
│   ├── useWebBuilderAI.ts              # AI code generation in builder
│   ├── useVirtualFileSystem.ts         # Core VFS logic
│   ├── useVFSContext.ts                # VFS context consumers (useVFS, useVFSSafe, etc.)
│   ├── usePreviewService.ts            # Preview backend control
│   ├── usePreviewSession.ts            # Preview session lifecycle
│   ├── useSetupWizard.ts               # 7-step business setup wizard
│   ├── useCanvasHistory.ts             # Canvas undo/redo
│   ├── useCreatorPlayground.ts         # Creator mode state
│   ├── useSiteBuilder.ts               # Multi-page site building
│   ├── usePageGenerator.ts             # AI page generation
│   └── useAuth.ts                      # Authentication state
├── contexts/
│   ├── VFSContext.tsx                   # Virtual file system + preview + snapshots
│   ├── CloudContext.tsx                 # Multi-tenant orgs, teams, usage stats
│   └── CloudContextDef.ts              # Cloud context type definitions
├── schemas/
│   ├── BusinessBlueprint.ts            # Industry, page types, intents, brand tokens
│   ├── SiteBundle.ts                   # Site identity, build provenance, UTP protocol
│   └── templateSchema.ts              # Layer types (Text/Image/Shape/Group), frames
├── services/                           # 45+ business logic modules
│   ├── canonicalPipeline.ts            # Unified build pipeline
│   ├── playgroundCompiler.ts           # Playground code compilation
│   ├── playgroundHydrator.ts           # Playground state hydration
│   ├── wizardCapabilityResolver.ts     # Wizard step resolution
│   ├── wizardPlaygroundMaterializer.ts # Wizard → code materialization
│   ├── automationOrchestrator.ts       # Workflow DAG orchestration
│   ├── inngestService.ts               # Inngest event/task integration
│   ├── previewSession.ts               # Preview session lifecycle
│   └── ...                             # 35+ more services
├── runtime/                            # Universal intent system
│   ├── intentRouter.ts                 # Main orchestrator
│   ├── actionCatalog.ts                # Fixed handlers for 25+ intents
│   ├── intentResolver.ts               # Build-time resolution
│   └── intentClassifier.ts             # Intent type detection
├── sections/                           # Template sections & variants
│   ├── index.ts                        # Public API (registry, themes, compositions)
│   ├── registry.ts                     # Section registry with intelligent matching
│   ├── themes.ts                       # Design token registry
│   ├── PageRenderer.tsx                # Template composition → React renderer
│   ├── components/                     # Reusable section components
│   ├── templates/                      # Industry-specific compositions
│   ├── variants/                       # hero/, features/, cta/, footer/, navbar/...
│   └── references/                     # Industry-specific reference components
├── utils/
│   ├── templateRenderer.ts             # Fabric canvas rendering
│   ├── templateToHTMLExporter.ts       # HTML/CSS export pipeline
│   ├── sandpackFilePrep.ts             # VFS → Sandpack file compiler
│   ├── assetPreloader.ts               # Font/image preloading
│   ├── htmlSanitizer.ts                # DOMPurify security
│   └── ...                             # 95+ more utilities
├── components/
│   ├── onboarding/
│   │   ├── SystemLauncher.tsx          # 4-step wizard launcher
│   │   ├── BusinessLauncher.tsx        # Quick-start industry launcher
│   │   └── SystemsAIPanel.tsx          # AI-powered system setup
│   ├── creatives/
│   │   ├── WebBuilder.tsx              # Main playground (1000+ lines)
│   │   └── web-builder/
│   │       └── AIBuilderPanel.tsx      # AI assistant panel
│   ├── VFSPreview.tsx                  # Sandpack + Docker preview
│   ├── SimplePreview.tsx               # Lightweight srcdoc fallback
│   ├── crm/                            # CRM UI components
│   ├── ai-agent/                       # AI assistant interface
│   └── ui/                             # 50+ Radix + Shadcn primitives
├── pages/
│   ├── BusinessSettings.tsx            # Business profile management
│   ├── ProjectSetup.tsx                # 8-section contextual setup
│   ├── WebBuilderPage.tsx              # Web builder route wrapper
│   └── ...                             # 20+ route components
├── trigger/
│   └── jobs.ts                         # Trigger.dev background tasks
├── integrations/
│   └── supabase/                       # Supabase client + types
└── types/                              # TypeScript definitions
```

## Testing the Feature

1. **Navigate to Web Builder**
2. **Click "AI Assistant" button**
3. **Try a full template prompt:**
   - "Create a landing page for a SaaS product"
   - "Generate a portfolio website template"
4. **Observe dual rendering:**
   - ✅ Fabric Canvas shows editable objects
   - ✅ Preview dialog shows live HTML
5. **Edit on canvas** → changes reflected immediately

## Performance Optimizations

### Asset Preloading
- Images cached in `AssetPreloader`
- Fonts loaded before render
- Progress feedback to user

### Lazy Rendering
- Only visible sections rendered
- Virtual scrolling for large templates
- Debounced updates

### Memory Management
- Canvas disposal on unmount
- Asset cache clearing
- VFS cleanup

## Security Considerations

### Iframe Sandbox
- ✅ No `allow-same-origin` (maximum isolation)
- ✅ CSP headers restrict scripts
- ✅ RPC for controlled communication

### HTML Sanitization
- ✅ DOMPurify on all user content
- ✅ Whitelist approach for CSS
- ✅ No inline scripts allowed

### API Security
- ✅ Edge functions validate input
- ✅ Rate limiting (429 errors)
- ✅ Payment checks (402 errors)

## Next Steps (Phase 4+)

### Recently Implemented
- [x] Virtual File System (VFS) with Sandpack preview — see [VFS_PREVIEW_ARCHITECTURE.md](VFS_PREVIEW_ARCHITECTURE.md)
- [x] Three-tier preview runtime (ECS → Sandpack → Static) — see [PREVIEW_RUNTIME_ARCHITECTURE.md](PREVIEW_RUNTIME_ARCHITECTURE.md)
- [x] Universal Intent System with build-time annotation — see [UNIVERSAL_INTENT_SYSTEM.md](UNIVERSAL_INTENT_SYSTEM.md)
- [x] Inngest durable workflow orchestration — see [WORKFLOW_ORCHESTRATION_COMPARISON.md](WORKFLOW_ORCHESTRATION_COMPARISON.md)
- [x] Trigger.dev background jobs (CRM reports, batch import, data export, AI content)
- [x] Full-stack app generation (`generate-fullstack-app` edge function)
- [x] AI Agent Runner for autonomous research and code tasks
- [x] Enterprise RBAC, multi-tenancy, and audit logging — see [ENTERPRISE_HARDENING.md](ENTERPRISE_HARDENING.md)
- [x] System Launcher Wizard (4-step guided onboarding with industry/goals/template/aesthetic)
- [x] Business Setup & Project Configuration (8-section contextual guide)
- [x] Web Builder Playground with dual-mode editing (Monaco + Fabric.js + VFS)
- [x] HuggingFace Transformers local inference integration
- [x] GoHighLevel CRM synchronization
- [x] Stripe subscription management and checkout flows

### Bidirectional Sync
- [ ] Canvas edits → update template schema
- [ ] Schema changes → re-render both views
- [ ] Real-time collaboration (Supabase Realtime)

### Advanced Export
- [ ] React component generation
- [ ] Vue/Svelte templates
- [ ] Tailwind CSS option
- [ ] Component library integration

### Enhanced Preview
- [ ] Live editing in iframe
- [ ] Device frame simulation
- [ ] Network throttling
- [ ] Accessibility testing

## Troubleshooting

### Template not rendering
1. Check console for validation errors
2. Verify template schema structure
3. Check asset URLs are accessible

### Iframe shows blank
1. Check HTML sanitization didn't strip content
2. Verify CSP headers
3. Check browser console for errors

### Slow rendering
1. Check image sizes (optimize before upload)
2. Reduce number of components
3. Clear asset cache

## API Reference

See inline JSDoc comments in:
- `src/hooks/useTemplateState.ts`
- `src/utils/templateToHTMLExporter.ts`
- `src/utils/templateRenderer.ts`

---

**Framework**: React 18.3 + TypeScript 5.9 + Vite + SWC
**Status**: ✅ Phase 2 & 3 Complete | Phase 4+ Systems Active
**Active**: System Launcher Wizard, Web Builder Playground, VFS Preview, Intent System, Inngest + Trigger.dev Orchestration, Enterprise RBAC, AI Agents
**Next**: Phase 5 — Bidirectional Sync, Real-time Collaboration, Advanced Export
