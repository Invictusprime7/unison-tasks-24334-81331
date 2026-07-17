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

/**
 * Wizard previews always support motion, icons, and the Radix primitives used
 * by the canonical interaction layer. Broader CSS frameworks remain opt-in:
 * generated source must import Bootstrap, Bulma, or StyleX before Sandpack
 * installs them, avoiding a conflicting global CSS reset and startup bloat.
 */
export const WIZARD_PREVIEW_RUNTIME_DEPENDENCIES: Record<string, string> = {
  'framer-motion': SANDPACK_DEPENDENCIES['framer-motion'],
  'lucide-react': SANDPACK_DEPENDENCIES['lucide-react'],
  '@radix-ui/react-dialog': SANDPACK_DEPENDENCIES['@radix-ui/react-dialog'],
  '@radix-ui/react-dropdown-menu': SANDPACK_DEPENDENCIES['@radix-ui/react-dropdown-menu'],
  '@radix-ui/react-popover': SANDPACK_DEPENDENCIES['@radix-ui/react-popover'],
  '@radix-ui/react-tabs': SANDPACK_DEPENDENCIES['@radix-ui/react-tabs'],
  '@radix-ui/react-tooltip': SANDPACK_DEPENDENCIES['@radix-ui/react-tooltip'],
};

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
