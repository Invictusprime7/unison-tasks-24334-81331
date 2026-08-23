# Prevent undefined React components in VFS previews

## Goal
Make synchronized VFS pages render reliably by repairing safe component import/export mismatches before acceptance and rejecting only contracts that cannot be repaired deterministically. Do not hide the problem with the disabled global React monkey-patch.

## Confirmed gaps
- The compile-safe gate reports default and named export mismatches only as warnings, so a bundle can be accepted while a JSX binding is invalid.
- The preview smoke gate checks missing default exports, but not missing named JSX exports or whether a syntactically present export resolves to a renderable value.
- Import/export reconciliation is regex-based and primarily covers direct relative imports. Barrel re-exports, aliases, namespace-member JSX, circular/self-referential bindings, and some dynamic component selections can still resolve to `undefined` at render time.
- Sandpack preparation still repeats mutating repair passes after the shared preflight tail, so the validated VFS can differ from the exact projected bundle that React executes.

## Implementation
1. **Create one component-contract analyzer**
   - Parse imports, exports, aliases, and re-export chains across the candidate module graph.
   - Track JSX-used bindings, including default imports, named aliases, namespace members, and common dynamic component-map selections.
   - Detect missing exports, non-value/type-only exports, re-export gaps, self/circular resolution that yields an uninitialized binding, and exports that are clearly not renderable components.

2. **Repair before canonical acceptance**
   - Run the analyzer in `runModuleClosureAndCompileSafe` after module closure and before compile-safe acceptance.
   - Prefer, in order: correct an import to an existing matching export; follow and correct a barrel re-export; add a default alias for an existing same-name component; synthesize a stamped companion component only when no authored component exists.
   - Preserve authored page content, routes, section topology, props, children, and intent metadata.
   - Record repaired and unresolved component contracts in the shared stage report.

3. **Make unresolved JSX contracts blocking**
   - Extend compile diagnostics with explicit component-contract codes and mark unresolved JSX value imports as errors rather than warnings.
   - Keep type-only imports and non-JSX data imports outside this rule.
   - Include importer path, local JSX name, source module, resolved target, and available exports in the diagnostic.

4. **Validate the exact Sandpack projection**
   - Extend the preview smoke gate to check default, named, aliased, namespace, and re-exported JSX bindings over the reachable entry graph.
   - Run this read-only check after `/src` flattening and all runtime shims are present.
   - Remove duplicate module-shape mutation from `sandpackFilePrep`; retain projection, collision checks, entry assertions, and final read-only contract assertions only.

5. **Improve runtime provenance without masking failures**
   - Keep the error boundary, but surface the failing page/component and import source from the contract diagnostic when available.
   - Do not enable the global `createElement`/JSX runtime patch as the permanent solution; it can conceal broken contracts and interfere with Router and animation libraries.

## Regression coverage
- Default import from named-only module.
- Named import missing from the target module.
- Aliased named import used in JSX.
- Barrel and multi-hop re-export chains.
- Namespace member JSX (`<UI.Card />`).
- Self-import and circular component imports.
- Type-only imports are ignored.
- Dynamic component map with a missing key is diagnosed when statically knowable.
- The same VFS passes launcher acceptance, builder commit, projection, and preview smoke checks without further mutation.
- Previously saved drafts are repaired through the same shared path and remain openable.

## Expected result
A page either reaches Sandpack with every reachable JSX component bound to a valid renderable export, or it fails earlier with an exact importer/export diagnostic. Safe mismatches recover automatically instead of showing React’s generic “Element type is invalid” screen.
