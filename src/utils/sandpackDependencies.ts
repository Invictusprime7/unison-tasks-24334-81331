/**
 * Shared Sandpack dependency and import constants.
 * Single source of truth for all Sandpack preview consumers
 * (SimplePreview, VFSPreview, sandpackFilePrep, VFSCodeView).
 */

/**
 * All npm packages bundled for Sandpack preview resolution.
 * These are passed to SandpackProvider's customSetup.dependencies.
 */
export const SANDPACK_DEPENDENCIES: Record<string, string> = {
  // React core
  'react': '^18.3.1',
  'react-dom': '^18.3.1',
  'react-router-dom': '^6.20.0',
  '@swc/helpers': '^0.5.23',
  '@babel/standalone': '^7.28.4',

  // Styling utilities
  'clsx': 'latest',
  'tailwind-merge': 'latest',
  'class-variance-authority': 'latest',
  'tailwindcss': '^3.4.18',
  'postcss': '^8.4.49',
  'autoprefixer': '^10.4.20',
  'tailwindcss-animate': '^1.0.7',
  '@tailwindcss/typography': '^0.5.19',
  '@stylexjs/stylex': '^0.8.0',
  'bootstrap': '^5.3.3',
  'bulma': '^1.0.2',

  // Radix UI primitives
  '@radix-ui/react-slot': 'latest',
  '@radix-ui/react-dialog': 'latest',
  '@radix-ui/react-dropdown-menu': 'latest',
  '@radix-ui/react-tabs': 'latest',
  '@radix-ui/react-toast': 'latest',
  '@radix-ui/react-tooltip': 'latest',
  '@radix-ui/react-select': 'latest',
  '@radix-ui/react-checkbox': 'latest',
  '@radix-ui/react-switch': 'latest',
  '@radix-ui/react-label': 'latest',
  '@radix-ui/react-avatar': 'latest',
  '@radix-ui/react-popover': 'latest',
  '@radix-ui/react-separator': 'latest',
  '@radix-ui/react-scroll-area': 'latest',
  '@radix-ui/react-accordion': 'latest',
  '@radix-ui/react-collapsible': 'latest',
  '@radix-ui/react-progress': 'latest',
  '@radix-ui/react-radio-group': 'latest',
  '@radix-ui/react-slider': 'latest',
  '@radix-ui/react-toggle': 'latest',
  '@radix-ui/react-toggle-group': 'latest',
  '@radix-ui/react-alert-dialog': 'latest',
  '@radix-ui/react-aspect-ratio': 'latest',
  '@radix-ui/react-context-menu': 'latest',
  '@radix-ui/react-hover-card': 'latest',
  '@radix-ui/react-menubar': 'latest',
  '@radix-ui/react-navigation-menu': 'latest',

  // Icons
  'lucide-react': 'latest',

  // Animation
  'framer-motion': 'latest',

  // Data & utilities
  'date-fns': 'latest',
  'recharts': 'latest',
  'zod': 'latest',
  'zustand': 'latest',

  // Form handling
  'react-hook-form': 'latest',
  '@hookform/resolvers': 'latest',

  // Data fetching
  '@tanstack/react-query': 'latest',
  '@tanstack/react-table': 'latest',

  // UI components
  'sonner': 'latest',
  'cmdk': 'latest',
  'embla-carousel-react': 'latest',
  'react-day-picker': 'latest',
  'input-otp': 'latest',
  'react-resizable-panels': 'latest',
  'vaul': 'latest',
  'next-themes': 'latest',

  // Scroll & navigation
  'react-scroll': 'latest',

  // Backend/workflow
  'inngest': 'latest',
};

/**
 * Dependencies required before inspecting a site's VFS. Every other package
 * is discovered from imports by `getDependenciesForSandpack`. Supplying the
 * whole catalog to Sandpack forces an unnecessary remote install for each
 * preview and leaves otherwise valid projects stuck at "Starting".
 */
export const SANDPACK_PREVIEW_CORE_DEPENDENCIES: Record<string, string> = {
  'react': SANDPACK_DEPENDENCIES.react,
  'react-dom': SANDPACK_DEPENDENCIES['react-dom'],
  'react-router-dom': SANDPACK_DEPENDENCIES['react-router-dom'],
  '@swc/helpers': SANDPACK_DEPENDENCIES['@swc/helpers'],
};

const dependencyGroup = (...names: string[]): Record<string, string> =>
  Object.fromEntries(names.map((name) => [name, SANDPACK_DEPENDENCIES[name]]));

/**
 * Named groups shown by the existing bottom-left Sandpack installation
 * surface. These are also exported for diagnostics; keeping the export and
 * runtime map together prevents UI/runtime version drift.
 */
export const WIZARD_RUNTIME_DEPENDENCY_GROUPS = {
  react: dependencyGroup('react', 'react-dom', 'react-router-dom', '@swc/helpers'),
  babel: dependencyGroup('@babel/standalone'),
  radix: dependencyGroup(
    '@radix-ui/react-slot',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
    '@radix-ui/react-tooltip',
    '@radix-ui/react-select',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-switch',
    '@radix-ui/react-label',
    '@radix-ui/react-avatar',
    '@radix-ui/react-popover',
    '@radix-ui/react-separator',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-accordion',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-progress',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-slider',
    '@radix-ui/react-toggle',
    '@radix-ui/react-toggle-group',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-aspect-ratio',
    '@radix-ui/react-context-menu',
    '@radix-ui/react-hover-card',
    '@radix-ui/react-menubar',
    '@radix-ui/react-navigation-menu',
  ),
  styling: dependencyGroup(
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'tailwindcss-animate',
    '@tailwindcss/typography',
    '@stylexjs/stylex',
    'bootstrap',
  ),
  experience: dependencyGroup('framer-motion', 'lucide-react'),
} as const;

/** Full Wizard runtime installed by the sole Sandpack preview instance. */
export const WIZARD_PREVIEW_RUNTIME_DEPENDENCIES: Record<string, string> =
  Object.assign({}, ...Object.values(WIZARD_RUNTIME_DEPENDENCY_GROUPS));

/**
 * Set of all npm import specifiers that Sandpack can resolve.
 * Imports NOT in this set get stubbed to prevent crashes.
 * Derived from SANDPACK_DEPENDENCIES keys + sub-path entries.
 */
export const SANDPACK_ALLOWED_IMPORTS: Set<string> = new Set([
  // All dependency keys
  ...Object.keys(SANDPACK_DEPENDENCIES),
  // Common sub-path imports
  'react-dom/client',
  'lucide-react',
  'date-fns/format',
  'date-fns/formatDistance',
  'date-fns/subDays',
  'date-fns/addDays',
  'date-fns/isAfter',
  'date-fns/isBefore',
  'date-fns/parseISO',
  'zod/v4',
  'framer-motion/dom',
  'react-router-dom/dist',
]);

/** Returns whether a package import can be installed by the Sandpack runtime. */
export function isSandpackAllowedImport(modulePath: string): boolean {
  if (SANDPACK_ALLOWED_IMPORTS.has(modulePath)) return true;

  const segments = modulePath.split('/');
  const packageName = modulePath.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];

  return SANDPACK_ALLOWED_IMPORTS.has(packageName);
}

const UNISON_VFS_RUNTIME_IMPORTS: Record<string, string> = {
  'lucide-react': '@/unison/ui/icons',
  'zod': '@/unison/ui/zod',
  'zod/v4': '@/unison/ui/zod',
  'react-hook-form': '@/unison/ui/forms',
  '@hookform/resolvers/zod': '@/unison/ui/forms',
  'framer-motion': '@/unison/ui/animation',
  'tailwindcss/tailwind.css': '@/unison/ui/tailwind.css',
};

/** Returns the generated VFS facade for a supported UI runtime import. */
export function getUnisonVfsFacadeImport(modulePath: string): string | null {
  const directFacade = UNISON_VFS_RUNTIME_IMPORTS[modulePath];
  if (directFacade) return directFacade;

  const radixMatch = modulePath.match(/^@radix-ui\/react-([a-z-]+)$/);
  if (radixMatch && Object.prototype.hasOwnProperty.call(SANDPACK_DEPENDENCIES, modulePath)) {
    return `@/unison/ui/radix/${radixMatch[1]}`;
  }

  return null;
}
