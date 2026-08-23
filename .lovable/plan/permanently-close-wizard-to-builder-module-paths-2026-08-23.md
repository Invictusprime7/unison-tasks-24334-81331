# Permanently close Wizard-to-Builder module paths

## Goal
Make every fresh Wizard artifact use one canonical source-path contract before commit, handoff, persistence, and Sandpack compilation, so companion modules cannot be dropped or relocated away from their imports.

## Implementation
1. **Canonicalize the whole generated source tree.** Add one shared path normalizer for all generated source modules and assets—not only `pages`, `components`, and `styles`. Root Sandpack paths such as `/lib/*`, `/hooks/*`, `/data/*`, `/site-runtime.ts`, and `/assets/*` will map to `/src/*`; metadata, public assets, and project config stay at their proper roots. Detect conflicting duplicates instead of silently overwriting them.
2. **Use that contract at both boundaries.** Apply the same normalizer in launcher VFS normalization and compact Wizard-to-Builder handoff persistence so the live navigation payload and refresh recovery payload cannot diverge.
3. **Validate the exact handoff artifact.** Before redirect, verify local-import closure against the canonical committed VFS/snapshot pair—not an earlier pre-commit file set. Block only a genuinely incomplete artifact; never cache or hand off raw/mixed paths.
4. **Repair runtime page identity safely.** When older draft metadata has no active page path, derive it deterministically from the snapshot home page (then router/first registered page) and persist/use that value instead of throwing during Builder hydration.
5. **Regression coverage.** Add tests for nested root companions, root sibling modules, mixed `/src` + Sandpack paths, collision rejection, exact handoff import closure, and missing active-page metadata recovery.

## Technical constraints
- Keep SiteBundleSnapshot as canonical truth and preserve Lane A → Lane B → Stage 4b authority.
- Do not synthesize placeholder modules or reintroduce scaffold fallback.
- Keep Sandpack’s final `/src/*` → root overlay flattening as a compile-only transformation.
