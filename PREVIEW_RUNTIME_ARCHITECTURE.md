# Preview Runtime Architecture

> **Stack**: React 18 + TypeScript 5.9 | VFSContext + useVFSPreview hooks | Sandpack (CodeSandbox) + Docker Vite | @babel/standalone for runtime JSX

## Overview

Unison Tasks uses a **single canonical preview pipeline** with `prepareSandpackFiles()` as the sole compiler from source VFS to Sandpack overlay.

## Core Principle: One Preview Truth

```
Source VFS (/src/*)  →  prepareSandpackFiles()  →  Sandpack Overlay (/*.tsx)
     ↑                                                    ↓
SiteBundle  →  compileSiteBundleToVFS()              Sandpack Preview
```

There is **ONE** answer to each question:

| Question | Answer |
|----------|--------|
| What is the preview source of truth? | Source VFS (`/src/*` files) |
| What compiles VFS to preview? | `prepareSandpackFiles()` in `sandpackFilePrep.ts` |
| What is the entry file? | `/index.tsx` (Sandpack react-ts standard) |
| How does SiteBundle become preview? | `compileSiteBundleToVFS()` → `prepareSandpackFiles()` |
| What mounts routing? | `HashRouter` in preview, `BrowserRouter` in production |

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│              SystemLauncher / BusinessLauncher           │
│  - Industry/theme selection                             │
│  - Calls systems-build edge function                    │
│  - Output: Source VFS (/src/* files)                    │
│  - Uses normalizeLauncherFiles() for cleanup            │
└──────────────────────┬──────────────────────────────────┘
                       │ Source VFS
                       ▼
┌─────────────────────────────────────────────────────────┐
│              WebBuilder (VFS Context)                    │
│  - Stores source VFS as canonical truth                 │
│  - Editor modifies source VFS directly                  │
│  - AI generates into source VFS                         │
└──────────────────────┬──────────────────────────────────┘
                       │ Source VFS
                       ▼
┌─────────────────────────────────────────────────────────┐
│        prepareSandpackFiles() — THE Compiler            │
│  - Flattens /src/ → root                                │
│  - Renames /main.tsx → /index.tsx                        │
│  - Processes imports (@/ → relative)                     │
│  - Injects hooks shim, nav bridge, CSS tokens           │
│  - Synthesizes missing components (contextual)           │
│  - Enforces default exports on all .tsx files            │
│  - Repairs broken image URLs                             │
│  - Enforces contrast in CSS variables                    │
└──────────────────────┬──────────────────────────────────┘
                       │ Sandpack Overlay
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Sandpack Preview (react-ts)                 │
│  - Entry: /index.tsx                                     │
│  - Tailwind CDN with semantic tokens                     │
│  - Navigation bridge for sub-page generation             │
│  - Intent bridge for button/form handling                 │
└─────────────────────────────────────────────────────────┘
```

## Key Files

| File | Role |
|------|------|
| `src/utils/sandpackFilePrep.ts` | **THE** canonical preview compiler |
| `src/components/VFSPreview.tsx` | Sandpack preview component (uses prepareSandpackFiles) |
| `src/components/creatives/code-editor/VFSCodeView.tsx` | Code editor preview (uses prepareSandpackFiles) |
| `src/contexts/VFSContext.tsx` | Source VFS state management |

## SiteBundle Integration

For SiteBundle-based workflows, use `compileSiteBundleToVFS()`:

```typescript
import { compileSiteBundleToVFS, prepareSandpackFiles } from '@/utils/sandpackFilePrep';

// Step 1: Convert SiteBundle to standard source VFS
const sourceVFS = compileSiteBundleToVFS({
  siteBundle: mySiteBundle,
  entryPath: '/',
});

// Step 2: Compile to Sandpack overlay (same pipeline as everything else)
const sandpackFiles = prepareSandpackFiles(sourceVFS);
```

## Intent System

The preview injects an intent bridge via the nav bridge IIFE in `index.tsx`:
- Intercepts clicks on `[data-ut-intent]` elements
- Resolves `href` attributes to navigation intents
- Posts `NAV_PAGE_GENERATE` messages for sub-page generation
- Posts `INTENT_TRIGGER` messages for form/button actions

## Contextual Component Synthesis

When AI-generated code imports components that don't exist in the VFS, the compiler auto-synthesizes them:
- 40+ industry-specific generators (restaurant, salon, medical, SaaS, etc.)
- 100+ component name aliases
- Dual export pattern (named + default) for reliable resolution
- Up to 3 recursive passes for transitive dependencies

## What Fabric.js Is For

Fabric.js is used **exclusively** for the Design Studio canvas editor (image/graphic design). It is NOT part of the website preview pipeline:

| Fabric Usage | File |
|-------------|------|
| Design Studio canvas | `src/components/creatives/DesignStudio.tsx` |
| Template rendering (design) | `src/utils/fabricTemplateRenderer.ts` |
| AI design generation | `src/hooks/useWebBuilderAI.ts` (canvas mode only) |

Fabric has **zero** involvement in website preview rendering.
