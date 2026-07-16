## Goal

Let creators export any generated site as a **self-contained .zip** that runs on any static host (Vercel, Netlify, Cloudflare Pages, S3, GitHub Pages) — or, when dropped into another Vite/React project, works as a portable module. Reuse today's canonical VFS state; no new generation pipeline.

## Is this possible with current VFS state? — Yes

The pieces already exist:
- `SiteBundleSnapshot` + `builder_drafts` hold the authoritative VFS (`/src/**`, themed `/src/index.css`, deterministic `/src/App.tsx`).
- `src/utils/webBuilderArtifacts.ts` (`buildCanonicalArtifacts`) already emits `index.html`, `styles.css`, `script.js` for a legacy single-file deploy.
- `src/utils/sandpackFilePrep.ts` normalizes `@/` aliases, injects deps, and produces a compile-ready `/src/` tree.
- `runtimeManifest.ts` already knows dependencies, routes, and `backendRequired`.

What's missing is a **portable export packager** and a **drop-in adapter** — both are additive; no changes to generation, theme injection, or intent wiring.

## Recommendation: ship two export modes

### Mode A — Static Site .zip (default, 90% of users)
Pre-built, deploy-anywhere bundle. Zero toolchain required on the receiving side.

Contents:
```text
site.zip
├── index.html            # hydrated shell, hashed asset refs
├── assets/
│   ├── app-[hash].js     # bundled React app (esbuild)
│   ├── app-[hash].css    # themed tokens from /src/index.css
│   └── media/…           # copied public/ + inline data URIs extracted
├── 404.html              # SPA fallback for HashRouter → BrowserRouter hosts
├── _redirects            # Netlify SPA fallback
├── vercel.json           # Vercel SPA rewrite
├── robots.txt, sitemap.xml (from routeInventory)
└── README.md             # "drop into any static host" instructions
```

### Mode B — Source Project .zip (for devs / handoff)
The raw VFS as a runnable Vite project. Drop into any folder → `npm i && npm run dev` works.

Contents:
```text
project.zip
├── src/                  # verbatim from prepared VFS (already /src/ shaped)
├── public/               # extracted assets
├── package.json          # from runtimeManifest.dependencies + scripts
├── vite.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.js, index.html
├── .env.example          # from runtimeManifest.envRequirements (no secrets)
└── README.md
```

## Architecture

```text
WebBuilder "Export" dialog
        │
        ├─ Mode A (Static) ──► exportStaticBundle()
        │                        1. resolveSnapshot() → canonical VFS
        │                        2. prepareSandpackFiles()  (reuse)
        │                        3. esbuild.build() in-browser (esbuild-wasm)
        │                           - bundle /src/main.tsx
        │                           - emit hashed js/css
        │                        4. inline themed /src/index.css
        │                        5. write host adapters (_redirects, vercel.json)
        │                        6. JSZip → download
        │
        └─ Mode B (Source) ──►  exportSourceProject()
                                 1. resolveSnapshot() → canonical VFS
                                 2. add scaffold configs from runtimeManifest
                                 3. synthesize package.json (deps + scripts)
                                 4. JSZip → download
```

New files (small, additive):
- `src/services/export/exportStaticBundle.ts` — Mode A
- `src/services/export/exportSourceProject.ts` — Mode B
- `src/services/export/packageJsonSynth.ts` — deps → package.json from `runtimeManifest`
- `src/services/export/hostAdapters.ts` — `_redirects`, `vercel.json`, `netlify.toml`, `404.html`
- `src/components/creatives/web-builder/ExportDialog.tsx` — mode picker + progress
- Wire an "Export" button in the WebBuilder topbar next to Publish

Deps to add: `jszip`, `esbuild-wasm` (Mode A only; loaded on demand).

## Drop-in reuse across platforms

| Target | Mode | Notes |
|---|---|---|
| Vercel / Netlify / Cloudflare Pages | A | Adapters included; drag-drop upload works |
| S3 + CloudFront / GitHub Pages | A | `HashRouter` avoids server rewrites; `404.html` for BrowserRouter fallback |
| Another Vite/React repo | B | `src/` copies in cleanly (already `/src/` shaped) |
| WordPress / Webflow embed | A | Ship `index.html` iframe or `<script src="assets/app-*.js">` snippet in README |

## Constraints and honest caveats

- **Backend-required sites** (`runtimeManifest.backendRequired === true`) export as **frontend-only** by default; the README lists the intents that need re-wiring (`data-ut-intent="cart.checkout"`, `booking.create`, etc.) and points to `envRequirements`. We do not export Supabase RLS/edge functions — that's not portable.
- **Themed CSS is preserved** via the existing Stage 4b guard in `mergeGeneratedVfsWithCanonicalSnapshot` — export reads the same canonical `/src/index.css`, so themes travel with the zip.
- **Intent handlers**: Mode A ships the runtime intent bridge stub so buttons don't throw; they emit `data-ut-intent` events the receiving platform can hook. Mode B keeps the full runtime.
- **Assets**: `public/` + inline base64 assets get extracted into `assets/media/`.

## Rollout

1. Ship Mode B first (10× simpler, no wasm) — unblocks dev handoff immediately.
2. Add Mode A behind an "Export as static site (beta)" toggle.
3. Add per-host presets (Vercel / Netlify / GitHub Pages) that pick the right adapter set.

## Out of scope for v1

- Multi-tenant SaaS export, custom-domain provisioning, server-rendered exports (SSR/SSG), and exporting Supabase schema. All can be later phases if needed.
