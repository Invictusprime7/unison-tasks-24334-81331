# Fix: undefined lucide icons in generated pages (`CalendarPlus is not defined`)

## What's happening

Generated pages reference lucide icons that were never imported (here `<Icon icon={CalendarPlus} />` in `/pages/Home.tsx`). The preview compiler already has a repair pass that injects safe lucide lookups for missing icon identifiers — but it only recognizes a hardcoded list of ~180 "common" icon names. `CalendarPlus` (and most compound icon names) are not in that list, so nothing is injected and Sandpack throws at runtime.

The project already ships the full lucide icon dictionary (1,600+ names) used by the local-import rewriter, so the fix is to make the injection pass use the same source of truth.

A second contributor: the duplicate-declaration deduper can strip a colliding import binding (e.g. `Home`) and leave the identifier undefined; the injection pass runs after it and will now cover those cases too once it knows all icon names.

## Changes

### 1. Use the canonical icon dictionary (`src/utils/sandpackFilePrep.ts`)
- Delete the local `COMMON_LUCIDE_ICONS` set inside `processCode`.
- Match candidate identifiers with `isLucideIconName()` from `src/utils/lucideIconNames.ts` (already imported in this file).
- Keep the existing injection shape unchanged: namespace import + `__LucideFallback` declaration + `const <Icon> = __LucideIcons['<Icon>'] || __LucideFallback;`, inserted after the fallback declaration so no TDZ error can occur.

### 2. Tighten identifier detection
- Also scan attribute-expression positions (`icon={X}`, `Icon={X}`, `as={X}`) so icons passed as props — not rendered as JSX tags — are detected even when the crude "strip declaration lines" pre-filter removes their line.
- Skip identifiers that are declared anywhere in the file (import, const/let, function, class) — unchanged behavior, so real local components named like an icon are never shadowed.

### 3. Apply the same repair before persistence
- Run the icon-injection repair inside `src/services/runFullPreflight.ts` (next to `rewriteLucideIconLocalImports`) by exporting a small `injectMissingLucideIcons(code)` helper from `sandpackFilePrep.ts` and calling it per `.tsx`/`.jsx` file. This means the sealed snapshot committed by the wizard is already valid, instead of relying only on preview-time repair.

### 4. Tests
- Extend `src/test/lucideIconImportRepair.test.ts` with cases for `CalendarPlus` used via `icon={...}` and as a JSX tag, plus a negative case proving a locally declared component with an icon-like name is not rewritten.
- Run the full suite and typecheck.

## Notes
No pipeline, router, or chrome behavior changes — this is a repair-pass correctness fix only.
