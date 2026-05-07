

# Full Transition: HTML to React/JS VFS System

## Overview

Complete elimination of all HTML string-based generation, scaffolding, and preview paths. The entire pipeline -- from AI generation to VFS storage to live preview -- will operate exclusively on React components (.tsx), vanilla JS, and React hooks.

## What Changes

### 1. Fix Build Error (Immediate)
**File**: `src/components/creatives/code-editor/VFSMonacoEditor.tsx` (line 15)

Remove the broken `import type { editor as MonacoEditor } from 'monaco-editor'` import. Replace with type inference from `@monaco-editor/react`'s `OnMount` callback:

```typescript
import { OnMount } from '@monaco-editor/react';
type IStandaloneCodeEditor = Parameters<OnMount>[0];
```

All references to `MonacoEditor.IStandaloneCodeEditor` throughout the file get replaced with `IStandaloneCodeEditor`.

---

### 2. Rewrite `multiPageScaffolder.ts` for React Output
**File**: `src/utils/multiPageScaffolder.ts`

Currently generates full HTML documents (`<!DOCTYPE html>...`). Will be rewritten to output React `.tsx` files:

- `extractPageTargets()` -- stays mostly the same (scans for navigation targets) but scans JSX onClick handlers and `<Link>` components in addition to `data-ut-path`
- `scaffoldMultiPageVFS()` -- output changes from `{"/products.html": "<html>..."}` to:

```text
{
  "/src/App.tsx":       // React Router setup with all routes
  "/src/pages/Home.tsx":      // Main landing page component
  "/src/pages/Products.tsx":  // Scaffolded product page
  "/src/pages/Checkout.tsx":  // Scaffolded checkout page
  "/src/components/Navbar.tsx":  // Shared nav component
  "/src/components/Footer.tsx":  // Shared footer component
  "/src/main.tsx":      // Entry point
  "/index.html":        // Minimal shell (just <div id="root">)
  "/package.json":      // Dependencies
}
```

- Page content generators (`generateProductsContent`, etc.) will output React components with hooks instead of HTML strings
- Navigation uses React Router `<Link>` and `useNavigate()` instead of `data-ut-path` attributes
- Intent wiring uses onClick handlers that call `executeIntent()` instead of `data-ut-intent` attributes

---

### 3. Update `AIBuilderPanel.tsx` Code Extraction
**File**: `src/components/creatives/web-builder/AIBuilderPanel.tsx`

The code extraction logic (lines 837-901) currently searches for `<!DOCTYPE`, `<html>`, `<body>` patterns. Will be updated to:

- Detect React/TSX output: look for `import React`, `export default`, `function App()`
- Detect JSON multi-file output: `{"files": {...}}` format from systems-build React mode
- When multi-file JSON is detected, import ALL files to VFS (not just one)
- Remove all HTML-specific detection (`<!DOCTYPE`, `<html>`, `<body>`)
- VFS edit path changes from `/index.html` to `/src/App.tsx`

---

### 4. Update `WebBuilder.tsx` Core State and Sync Logic
**File**: `src/components/creatives/WebBuilder.tsx`

Major changes across the 5000-line file:

**a) Default state** (line 643): Change `previewCode` default from HTML placeholder to a React component placeholder

**b) VFS sync logic** (lines 1232-1282): Remove HTML detection branches. All content syncs as `.tsx` files:
- Remove `isHTML` branch that syncs to `/index.html`  
- Remove the HTML wrapper fallback that wraps snippets in `<!DOCTYPE html>`
- Default sync target: `/src/App.tsx`

**c) Page management** (lines 1092-1149): 
- `handleAddPage` creates `.tsx` files instead of `.html` 
- `handleRemovePage` works on `.tsx` paths
- `activePagePath` defaults to `/src/pages/Home.tsx` instead of `/index.html`

**d) Page manifest** (lines 1040-1063): Remove the HTML-only page manifest filter (`.html` check). Build manifest from `.tsx` page files instead.

**e) `buildDynamicPagePrompt`** (lines 175-327): Rewrite to request React components instead of "Complete HTML documents". Remove all references to `<!DOCTYPE html>`, `data-ut-intent`, `data-ut-path`. Replace with React hooks and Router patterns.

**f) Code validation** (lines 437-504): Update `validateAICodeChange` to check for React component structure (export default, return JSX) instead of `<section>`, `<header>`, `<footer>` HTML tags.

**g) DOM manipulation functions** (`applyElementHtmlUpdate`, `applyElementDelete`, `applyElementDuplicate`, `preserveStyleBlocks`, `preserveInlineClasses`): These are HTML DOMParser-based. They will be replaced with AST-aware or string-based equivalents that operate on JSX/TSX source.

**h) `onCodeGenerated` handler**: Update to detect React output and import as `/src/App.tsx` or multi-file JSON.

---

### 5. Update `templateToVFS.ts`
**File**: `src/utils/templateToVFS.ts`

- Remove `htmlToReactComponent()` converter (no longer needed -- AI outputs React directly)
- `templateToVFSFiles()` simplifies: React format is the only path
- `detectTemplateFormat()` always returns `'react'`
- Keep `elementToVFSPatch()` but update for JSX manipulation

---

### 6. Update Preview Pipeline
**File**: `src/components/SimplePreview.tsx`

- Remove `isVanillaHtml()` detection (line 64)
- Remove `srcdoc` HTML injection path
- Route all preview through Sandpack/VFS bundling (already supported)
- The preview will use `VFSPreview` component (Sandpack-based) as the sole preview engine

---

### 7. Update Edge Functions (AI Prompts)

**a) `supabase/functions/systems-build/index.ts`**:
- Set `outputFormat` default to `"react"` (already defaults to react on line 129)
- Remove the entire HTML output mode section (lines 625+) including `generateFallbackHTML`
- All generation routes through the React fullstack path

**b) `supabase/functions/ai-code-assistant/index.ts`**:
- Update system prompts to always output React components
- Remove HTML-specific instructions
- Output format: single `.tsx` component for edits, JSON multi-file for full generation

---

### 8. Update Intent Wiring

Replace `data-ut-intent` attribute scanning with React-native patterns:

- `src/runtime/autoBinder.ts`: Scan JSX `onClick` props instead of HTML attributes
- `src/runtime/intentResolver.ts`: Resolve intents from React event handlers
- `src/utils/ctaContract.ts`: `normalizeTemplateForCtaContract` operates on JSX AST instead of HTML DOM

Create a new `IntentButton` React component:
```tsx
// src/components/IntentButton.tsx
export function IntentButton({ intent, payload, children, ...props }) {
  const handleClick = () => executeIntent(intent, payload);
  return <button onClick={handleClick} {...props}>{children}</button>;
}
```

---

### 9. Remove Dead HTML Code

After migration, delete/clean:
- HTML-specific page generators in `multiPageScaffolder.ts` (all `generateXxxContent` functions that return HTML strings)
- `extractDesignFromMain()` (HTML regex-based design token extraction)
- `preserveStyleBlocks()`, `preserveInlineClasses()` in WebBuilder.tsx
- `buildDynamicPagePrompt()` HTML-specific sections
- `escapeCSSSelector()`, `safeFindElement()` in WebBuilder.tsx (HTML DOM manipulation)
- HTML fallback in `systems-build` edge function

---

## Migration Summary

| System | Before | After |
|--------|--------|-------|
| AI Output | HTML strings | React .tsx components |
| VFS Files | `/index.html`, `/about.html` | `/src/App.tsx`, `/src/pages/About.tsx` |
| Navigation | `data-ut-path` + `href` | React Router `<Link>` |
| Intent Wiring | `data-ut-intent` attributes | `onClick={() => executeIntent()}` |
| Preview | srcdoc HTML injection | Sandpack bundling |
| Scaffolding | HTML page generators | React component generators |
| Code Extraction | Regex for `<!DOCTYPE` | Regex for `export default` + JSON |
| Multi-page | `.html` file manifest | React Router routes |

## Execution Order

1. Fix Monaco build error (unblocks everything)
2. Rewrite `multiPageScaffolder.ts` for React output
3. Update `AIBuilderPanel.tsx` code extraction
4. Update `WebBuilder.tsx` state, sync, and page management
5. Update `templateToVFS.ts` (simplify)
6. Update preview pipeline (remove HTML path)
7. Update edge function prompts (React-only)
8. Update intent wiring system
9. Clean up dead HTML code

