# Copilot Instructions for Unison Tasks

## Project Overview

**Unison Tasks** is an AI-powered web builder platform that enables businesses to launch custom websites through a guided wizard system. The architecture emphasizes composability, extensibility, and type safety across three main domains:

1. **Launch System** — Wizard-driven site generation with business blueprint
2. **Web Builder** — React-based visual editor with AI enhancement capabilities  
3. **Automation Pipeline** — Intent-driven business workflows via Inngest

---

## Core Architectural Principles

### 1. Three-Layer Launch Model
Every website configuration follows this structure:

- **SystemBlueprint** — Business type (booking, agency, store, saas, portfolio, content), intents, workflows, pages, CTA contracts
- **TemplateStructure** — Section order, layout density, nav/footer style, column arrangement
- **ThemeSkin** — Visual identity (color palette, typography scale, corner radius, shadows, gradients, motion)

**Key Contract:** `template structure → intent wiring → theme override → build`

Theme ONLY controls presentation tokens, never layout structure or intent bindings.

### 2. React/TSX-Only Pipeline
TypeScript/React is the canonical format throughout:

- AI generates **React/TSX**, never HTML
- Preview pipeline expects React components via Sandpack
- HTML documents are **rejected with error messages**, not converted
- CSS is delivered via Tailwind CDN + CSS custom properties for theme colors

### 3. Unified VFS (Virtual File System)
Single shared VFS instance per WebBuilder instance:

- Created in `VFSProvider` wrapper (WebBuilderPage.tsx)
- Used by all consumers (VFSPreview, useSitePreview, useAIVFS, AI callbacks)
- File paths preserve `/src/` prefix: `/src/App.tsx`, `/src/index.tsx`, `/src/index.css`
- Sandpack rendered at ROOT level (legacy Sandpack template expects `/App.tsx`, not `/src/App.tsx`)

### 4. Fixed Intent System
Intents are a **closed enumeration** defined in `src/coreIntents.ts`:

- Categories: NAV_INTENTS, PAY_INTENTS, ACTION_INTENTS, AUTOMATION_INTENTS
- Examples: `booking.create`, `contact.submit`, `newsletter.subscribe`, `cart.add`
- **User templates CANNOT create arbitrary intents** — only use pre-defined intents
- Intent wiring happens at BUILD TIME (cached on button), never at runtime
- Runtime execution uses fixed handlers in `src/runtime/actionCatalog.ts`

**Universal Intent System (2-step deterministic):**
1. **Event Delegation** — Single listener on canvas root
2. **Intent Resolution** — AI resolves intent at build time (cached)
3. **Action Execution** — Runtime executes from fixed handler catalog

### 5. StyleX Design Tokens
Visual identity is managed through compiled, type-safe CSS:

- Token definitions in `src/themes/tokens.stylex.ts` (color, typography, shape, surface, motion, spacing)
- Theme identities in `src/themes/identities.stylex.ts`: modern, editorial, bold, futuristic, organic
- Each identity uses `stylex.createTheme()` for compile-time validation
- CSS custom properties emitted at runtime (StyleX compile won't work in Sandpack)
- **IDENTITY_TOKENS** object mirrors all identities for runtime use

---

## Key Services & File Organization

### Suite Structure

```
src/
├── components/          # UI components
│   ├── onboarding/     # SystemLauncher wizard (7 steps)
│   ├── WebBuilder.tsx  # Main editor component
│   └── VFSPreview.tsx  # Multi-backend preview (Sandpack/Docker/HTML)
├── contexts/           # React Context providers
│   └── VFSContext.ts   # Unified VFS provider
├── services/           # Business logic (40+ services)
│   ├── aiLaunchService.ts         # LaunchConfig → AI template generation
│   ├── automationOrchestrator.ts  # Intent → recipe → Inngest bridge
│   ├── recipeManagerService.ts    # Recipe pack management
│   ├── buildPipelineService.ts    # 8-stage build orchestrator
│   ├── inngestService.ts          # Frontend Inngest event sender
│   └── [19+ others]               # Design compiler, template provisioner, etc.
├── runtime/            # Intent execution + preview
│   ├── intentExecutor.ts           # Main intent entry point
│   ├── intentResolver.ts           # Rules + AI-fallback resolution
│   ├── universalIntentRouter.ts    # Event delegation
│   └── actionCatalog.ts            # Fixed action handlers
├── lib/                # Library integrations
│   ├── inngest.ts      # Event schema definitions
│   └── inngest-workflows.ts  # Durable workflow functions
├── themes/             # StyleX tokens and identities
│   ├── tokens.stylex.ts
│   └── identities.stylex.ts
├── data/               # Configuration & data
│   ├── industries.ts         # 20 industries × 6 system types
│   ├── templateFamilies.ts   # 4 families (luxe, clean, editorial, bold) × 3 variants
│   ├── blueprintBuilder.ts   # SystemBlueprint from wizard
│   └── [other registries]
├── types/              # TypeScript definitions
│   └── launchConfig.ts # SystemBlueprint, TemplateStructure, ThemeSkin types
└── utils/              # Utilities
    ├── siteGenerator.ts       # LaunchConfig → VFS files (19 section generators)
    └── sandpackFilePrep.ts    # File validation for preview

api/                   # Backend Edge Functions (Supabase)
├── inngest.ts
└── cron/
    └── [scheduled tasks]

supabase/             # Supabase infrastructure
├── functions/
│   ├── ai-code-assistant/    # NLP → template/component/code (modes: template-react, design, web, component)
│   ├── systems-build/        # Theme + industry → concrete HTML/React
│   └── [other functions]
└── migrations/        # Database schema
```

### Template Families
- **Luxe** — Premium, spacious, image-forward
- **Clean** — Minimal, grid-based, content-first  
- **Editorial** — Asymmetric, type-heavy, magazine-like
- **Bold** — Dense, high-impact, conversion-focused

### Theme Identities
- **Modern** — Clean grids, medium radius, cool neutrals, crisp borders
- **Editorial** — Serif headlines, asymmetric, large type contrast
- **Bold** — Heavy contrast, large CTAs, color blocking
- **Futuristic** — Dark-first, electric accents, glow edges, gradients
- **Organic** — Warm tones, soft corners, breathable spacing

---

## Data Flow Patterns

### Launch → WebBuilder Pipeline

```
SystemLauncher Wizard
  ↓ (7-step form: business type → industry → family → variant → theme → build mode → generate)
LaunchConfig { blueprint, structure, skin }
  ↓
[Fast Launch] → siteGenerator.generateSiteVFS() → VFS files
[AI Enhanced] → aiLaunchService.generateAILaunchSite() → supabase:ai-code-assistant → VFS files
  ↓
navigate('/web-builder', { state: { launchVFS, launchSystemType, launchBusinessName } })
  ↓
WebBuilder.tsx { useVFS, launchVFSLoadedRef guard }
  ↓
VFSPreview (Sandpack/Docker/HTML with error boundary)
```

### Intent Execution Flow

```
User clicks button with data-ut-intent="booking.create"
  ↓
universalIntentRouter (body event listener)
  ↓
intentResolver (rules-first, then AI-fallback for unknowns)
  ↓
intentExecutor (cached handler)
  ↓
actionCatalog (fixed runtime action)
  ↓ (if automation recipe bound)
automationOrchestrator (normalize industry, map intent → recipe)
  ↓
inngestService.sendInngestEvent()
  ↓
Inngest Edge Function → durable workflow
```

### AI Template Generation

```
User prompt in SystemLauncher or AIPanel
  ↓
buildLaunchConfigFromChip() → 3-layer LaunchConfig
  ↓
aiLaunchService.generateAILaunchSite()
  ↓
supabase:ai-code-assistant (mode: "template-react")
  {
    systemType (business context)
    systemsBuildContext (blueprint + brand + palette)
    design tokens + aesthetic directives
    siteElementsLibraryContext (pre-built components)
    userDesignProfile (learned style)
  }
  ↓
AI returns React/TSX components + CSS
  ↓
sandpackFilePrep.ts (validate, inject theme vars, structure files)
  ↓
VFSPreview renders preview with error boundary
```

---

## Naming Conventions

### Type Names
- **LaunchConfig** — Top-level 3-layer config object
- **SystemBlueprint** — Business + intent + workflow definition
- **TemplateStructure** — Layout structure (sections, columns, density)
- **ThemeSkin** — Visual identity (tokens, identities, overrides)
- **IntentDefinition** — Single intent schema (namespace.action)
- **RecipeStep** — Individual workflow step
- **VFSContext** — Virtual file system interface

### Function Names
- **generate\*** — Create new content (generateSiteVFS, generateApp, generateCSS)
- **resolve\*** — Look up or compute value (resolveTokens, resolveIntentHandler)
- **build\*** — Orchestrate multi-step creation (buildPipeline, buildContext)
- **prepare\*** — Validate & transform input (sandpackFilePrep, prepareFiles)
- **normalize\*** — Standardize format (normalizeIndustry, normalizeIntent)

### File Naming
- Services: `*Service.ts` (aiLaunchService, automationOrchestrator, recipeManagerService)
- Components: PascalCase + component type (SystemLauncher, VFSPreview, WebBuilder, AIBuilderPanel)
- Utilities: camelCase with domain (siteGenerator, sandpackFilePrep)
- Types: `launchConfig.ts`, `intentConfig.ts`, PascalCase for exported types
- StyleX: `*.stylex.ts`

---

## Common Patterns

### Adding a New Intent
1. Define in `src/coreIntents.ts` with category
2. Add handler to `src/runtime/actionCatalog.ts`
3. Map recipe in `automationOrchestrator.INTENT_EVENT_MAP` if automation-bound
4. Add template binding in manifest if needed

**Never** create arbitrary intents outside coreIntents.ts.

### Adding a New Template Section
1. Create section generator function in `src/utils/siteGenerator.ts`
2. Add to templateFamilies variant definition in `src/data/templateFamilies.ts`
3. Export JSX component for wizard preview
4. Declare requirements in template manifest (tables, workflows, intents)

### Extending Recipe Packs
1. Define new recipe in Supabase `ai_recipe_registry`
2. Add to `installed_recipe_packs` per business
3. Create workflow steps in `src/services/recipeExecutor.ts`
4. Wire through `automationOrchestrator.normalizeIndustry()`
5. Toggle via `ai_plugin_state` per business

### AI Code Generation
1. Call `aiLaunchService.generateAILaunchSite(config, userPrompt?)` or `ai-code-assistant` directly
2. AI must output React/TSX (enforced in system prompt)
3. HTML documents → reject with error + toast
4. Use `sandpackFilePrep.ts` to validate generated files
5. Apply theme tokens before Sandpack render

### Error Handling in Preview
- Wrap generated component with React ErrorBoundary in sandpackFilePrep
- VFSPreview SandpackErrorBoundary retries up to 3 times
- Show categorized error UI (🔧 Babel, 📦 missing modules, ⚠️ other)
- Graceful degradation: show error instead of crashing

---

## Code Examples

### Generate a Site from LaunchConfig
```typescript
import { siteGenerator } from '@/utils/siteGenerator';
import { aiLaunchService } from '@/services/aiLaunchService';

// Fast launch (deterministic)
const fastVFS = siteGenerator.generateSiteVFS(launchConfig);

// AI enhanced (with user prompt)
const aiVFS = await aiLaunchService.generateAILaunchSite(launchConfig, userPrompt);
// Returns: { files, aiGenerated, businessName, error?, runtimeManifest? }
```

### Wire an Intent Button
```typescript
// In generated component
<button
  data-ut-intent="booking.create"
  data-intent-params={JSON.stringify({ duration: 60 })}
>
  Book Now
</button>

// Intent routing via universalIntentRouter → intentExecutor → actionCatalog
```

### Access VFS from Component
```typescript
import { useVFS } from '@/contexts/VFSContext';

const MyComponent = () => {
  const vfs = useVFS(); // Single shared instance
  const code = vfs.getFile('/src/App.tsx');
  vfs.updateFile('/src/App.tsx', newCode);
};
```

### Create an AI Code Generation Prompt
```typescript
const systemPrompt = `You are an ELITE web template generator. 
Generate ONLY valid React/TSX components.
Use provided design tokens from IDENTITY_TOKENS.
Apply provided layout directives from systemsBuildContext.
Output MUST be syntactically valid React.`;

const userPrompt = `Create a luxury hotel booking site hero section...`;
```

---

## What NOT to Do

❌ **Do NOT:**
- Create custom intents outside `coreIntents.ts`
- Return HTML documents from AI services (reject with error)
- Add new action handlers outside `actionCatalog.ts`
- Use multiple VFS instances in one WebBuilder (always use VFSContext)
- Convert HTML to React (reject instead)
- Make layout decisions based on theme (theme is visual only)
- Hardcode template structure (use templateFamilies registry)
- Run intent resolution at runtime (resolve at BUILD time)

---

## Build & Testing

**Build:** `npm run build` (Vite plugin for StyleX + Babel)  
**Lint:** ESLint config in `eslint.config.js`  
**TypeScript:** `tsconfig.app.json` for app code, `tsconfig.node.json` for Vite

**Common Build Issues:**
- StyleX YAML syntax errors in tokens/identities → check closing braces, colons
- Unused variable warnings → import from tree-shaking or suppress
- Large bundle chunks → use dynamic imports for preview/builder modules

---

## Key Dependencies

- **Vite** — Build + Dev server
- **React** — Component framework
- **TypeScript** — Type safety
- **StyleX** — Compiled CSS-in-JS (theme + design system)
- **Sandpack** — Browser-based code editor + preview (npm packages bundled)
- **Inngest** — Durable workflow orchestration (Supabase edge integration)
- **Supabase** — Auth, DB, edge functions
- **Tailwind CDN** — Layout utilities (CSS, not compiled)
- **Monaco Editor** — Code editor in builder
- **Fabric.js** — Canvas rendering (DesignStudio)

---

## When to Ask for Help

- Uncertain about intent semantics or automation recipe wiring
- Need guidance on theme vs. blueprint separation
- Questions about VFS consistency across components
- Want to extend recipe system or add new industries
- Debugging Sandpack preview failures or error boundaries
- TypeScript type issues with LaunchConfig or intent resolution

---

## Further Reading

- `src/components/onboarding/SystemLauncher.tsx` — Entry point for wizard
- `src/utils/siteGenerator.ts` — Complete site generation with 19 section types
- `src/services/automationOrchestrator.ts` — Intent → recipe orchestration
- `src/runtime/intentResolver.ts` — Deterministic vs. AI-fallback resolution
- `supabase/functions/ai-code-assistant/index.ts` — AI generation logic
- Memory files in `/memories/repo/` for recent architectural decisions
