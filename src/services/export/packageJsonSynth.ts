/**
 * Synthesize a package.json + companion Vite/TS/Tailwind config files for a
 * source-project export. Inputs are the prepared VFS + optional RuntimeManifest.
 *
 * The output is intentionally "drop-in for `npm i && npm run dev`" — no
 * platform-specific tokens leak in.
 */

import type { RuntimeManifest } from '@/types/runtimeManifest';

const BASE_DEPS: Record<string, string> = {
  react: '^18.3.1',
  'react-dom': '^18.3.1',
  'react-router-dom': '^6.26.2',
  'lucide-react': '^0.462.0',
  'framer-motion': '^11.11.11',
  clsx: '^2.1.1',
  'tailwind-merge': '^2.5.4',
};

const BASE_DEV_DEPS: Record<string, string> = {
  '@types/react': '^18.3.12',
  '@types/react-dom': '^18.3.1',
  '@vitejs/plugin-react': '^4.3.3',
  autoprefixer: '^10.4.20',
  postcss: '^8.4.47',
  tailwindcss: '^3.4.14',
  typescript: '^5.6.3',
  vite: '^5.4.10',
};

const DEP_BLOCKLIST = new Set([
  '@/', 'react', 'react-dom', // stripped/base
]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unison-site';
}

function scanImports(files: Record<string, string>): Set<string> {
  const out = new Set<string>();
  const rx = /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const rxRequire = /require\(['"]([^'"]+)['"]\)/g;
  for (const [path, code] of Object.entries(files)) {
    if (!/\.(tsx?|jsx?|mjs|cjs)$/i.test(path)) continue;
    if (typeof code !== 'string') continue;
    for (const m of code.matchAll(rx)) out.add(m[1]);
    for (const m of code.matchAll(rxRequire)) out.add(m[1]);
  }
  return out;
}

function extractPkgName(spec: string): string | null {
  if (!spec || spec.startsWith('.') || spec.startsWith('/')) return null;
  if (spec.startsWith('@/')) return null;
  if (spec.startsWith('@')) {
    const [scope, name] = spec.split('/');
    return name ? `${scope}/${name}` : null;
  }
  return spec.split('/')[0];
}

export interface SynthesizeOptions {
  projectName: string;
  manifest?: RuntimeManifest;
}

export interface SynthesizedProject {
  packageJson: string;
  viteConfig: string;
  tsConfig: string;
  tsConfigNode: string;
  tailwindConfig: string;
  postcssConfig: string;
  indexHtml: string;
  envExample: string;
  readme: string;
  gitignore: string;
}

export function synthesizeProjectFiles(
  files: Record<string, string>,
  { projectName, manifest }: SynthesizeOptions,
): SynthesizedProject {
  const slug = slugify(projectName);

  // Merge scanned deps with manifest deps (manifest wins on version).
  const scanned = scanImports(files);
  const dependencies: Record<string, string> = { ...BASE_DEPS };
  for (const spec of scanned) {
    const pkg = extractPkgName(spec);
    if (!pkg || DEP_BLOCKLIST.has(pkg)) continue;
    if (!dependencies[pkg]) dependencies[pkg] = 'latest';
  }
  if (manifest?.dependencies) {
    for (const [k, v] of Object.entries(manifest.dependencies)) {
      if (k === 'react' || k === 'react-dom') continue;
      dependencies[k] = v || dependencies[k] || 'latest';
    }
  }

  const packageJson = JSON.stringify(
    {
      name: slug,
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies,
      devDependencies: BASE_DEV_DEPS,
    },
    null,
    2,
  ) + '\n';

  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 5173, open: true },
});
`;

  const tsConfig = JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: false,
        baseUrl: '.',
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    },
    null,
    2,
  ) + '\n';

  const tsConfigNode = JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
      },
      include: ['vite.config.ts'],
    },
    null,
    2,
  ) + '\n';

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
`;

  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

  const entry = manifest?.entryPoint?.replace(/^\/+/, '') || 'src/main.tsx';
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entry.startsWith('src/') ? entry : 'src/main.tsx'}"></script>
  </body>
</html>
`;

  const envExample = (manifest?.envRequirements || [])
    .map((k) => `${k}=`)
    .join('\n') + '\n';

  const backendNote = manifest?.backendRequired
    ? `\n## Backend\n\nThis site was generated with backend intents (auth/DB/booking/cart). ` +
      `The frontend ships as-is, but backend endpoints are NOT included. ` +
      `Wire your own handlers to the \`data-ut-intent="..."\` attributes on interactive elements.\n` +
      (manifest.envRequirements?.length
        ? `\nRequired env vars: ${manifest.envRequirements.map((e) => `\`${e}\``).join(', ')}\n`
        : '')
    : '';

  const readme = `# ${projectName}

Exported from Unison. Drop-in Vite + React + Tailwind project.

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open http://localhost:5173.

## Build for production

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Deploy

The \`dist/\` output is a static SPA — deploy to any static host (Vercel,
Netlify, Cloudflare Pages, S3, GitHub Pages). SPA fallback files are included
in the project root under \`_redirects\`, \`vercel.json\`, and \`netlify.toml\`.
${backendNote}
`;

  const gitignore = `node_modules
dist
.env
.env.local
.DS_Store
*.log
`;

  return {
    packageJson,
    viteConfig,
    tsConfig,
    tsConfigNode,
    tailwindConfig,
    postcssConfig,
    indexHtml,
    envExample,
    readme,
    gitignore,
  };
}
