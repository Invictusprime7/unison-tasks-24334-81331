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
  'react': '^19.2.0',
  'react-dom': '^19.2.0',
  'react-router-dom': '^6.20.0',
  '@swc/helpers': '0.5.23',
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

  // Experience layer (3D / WebGL) — reachable only through @/unison/experience
  'three': '^0.180.0',
  '@react-three/fiber': '^9.3.0',
  '@react-three/drei': '^10.7.0',

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

// These versions mirror the compatible Radix/Motion graph installed by the
// builder. Sandpack cannot safely resolve a generated facade against `latest`
// because the Radix internals are separately published packages.
const SANDPACK_RUNTIME_PACKAGE_VERSIONS: Record<string, string> = {
  '@radix-ui/react-accordion': '1.2.12',
  '@radix-ui/react-alert-dialog': '1.1.15',
  '@radix-ui/react-aspect-ratio': '1.1.8',
  '@radix-ui/react-avatar': '1.1.11',
  '@radix-ui/react-checkbox': '1.3.3',
  '@radix-ui/react-collapsible': '1.1.12',
  '@radix-ui/react-context-menu': '2.2.16',
  '@radix-ui/react-dialog': '1.1.15',
  '@radix-ui/react-dropdown-menu': '2.1.16',
  '@radix-ui/react-hover-card': '1.1.15',
  '@radix-ui/react-label': '2.1.8',
  '@radix-ui/react-menubar': '1.1.16',
  '@radix-ui/react-navigation-menu': '1.2.14',
  '@radix-ui/react-popover': '1.1.15',
  '@radix-ui/react-progress': '1.1.8',
  '@radix-ui/react-radio-group': '1.3.8',
  '@radix-ui/react-scroll-area': '1.2.10',
  '@radix-ui/react-select': '2.2.6',
  '@radix-ui/react-separator': '1.1.8',
  '@radix-ui/react-slider': '1.3.6',
  '@radix-ui/react-slot': '1.2.4',
  '@radix-ui/react-switch': '1.2.6',
  '@radix-ui/react-tabs': '1.1.13',
  '@radix-ui/react-toast': '1.2.15',
  '@radix-ui/react-toggle': '1.1.10',
  '@radix-ui/react-toggle-group': '1.1.11',
  '@radix-ui/react-tooltip': '1.2.8',
  'framer-motion': '12.29.2',
};

/**
 * Sandpack only installs the packages passed to customSetup. It does not
 * reliably discover nested dependencies from generated Radix and Motion
 * facades, so previews that reach those libraries need this explicit closure.
 */
export const SANDPACK_TRANSITIVE_RUNTIME_DEPENDENCIES: Record<string, string> = {
  '@radix-ui/number': '1.1.1',
  '@radix-ui/primitive': '1.1.3',
  '@radix-ui/rect': '1.1.1',
  '@radix-ui/react-arrow': '1.1.7',
  '@radix-ui/react-collection': '1.1.7',
  '@radix-ui/react-compose-refs': '1.1.2',
  '@radix-ui/react-context': '1.1.2',
  '@radix-ui/react-direction': '1.1.1',
  '@radix-ui/react-dismissable-layer': '1.1.11',
  '@radix-ui/react-focus-guards': '1.1.3',
  '@radix-ui/react-focus-scope': '1.1.7',
  '@radix-ui/react-id': '1.1.1',
  '@radix-ui/react-menu': '2.1.16',
  '@radix-ui/react-popper': '1.2.8',
  '@radix-ui/react-portal': '1.1.9',
  '@radix-ui/react-presence': '1.1.5',
  '@radix-ui/react-primitive': '2.1.3',
  '@radix-ui/react-roving-focus': '1.1.11',
  '@radix-ui/react-use-callback-ref': '1.1.1',
  '@radix-ui/react-use-controllable-state': '1.2.2',
  '@radix-ui/react-use-effect-event': '0.0.2',
  '@radix-ui/react-use-escape-keydown': '1.1.1',
  '@radix-ui/react-use-is-hydrated': '0.1.0',
  '@radix-ui/react-use-layout-effect': '1.1.1',
  '@radix-ui/react-use-previous': '1.1.1',
  '@radix-ui/react-use-rect': '1.1.1',
  '@radix-ui/react-use-size': '1.1.1',
  '@radix-ui/react-visually-hidden': '1.2.3',
  '@floating-ui/react-dom': '2.1.6',
  '@floating-ui/dom': '1.7.4',
  'aria-hidden': '1.2.6',
  'react-remove-scroll': '2.7.2',
  'react-remove-scroll-bar': '2.3.7',
  'react-style-singleton': '2.2.3',
  'use-callback-ref': '1.3.3',
  'use-sidecar': '1.1.3',
  'motion-dom': '12.29.2',
  'motion-utils': '12.29.2',
  'tslib': '2.8.1',
};

/**
 * React Three Fiber and drei resolve a handful of nested runtime packages that
 * Sandpack does not discover on its own. They are installed only when a
 * preview actually reaches the experience layer.
 */
export const SANDPACK_EXPERIENCE_RUNTIME_DEPENDENCIES: Record<string, string> = {
  'scheduler': '0.27.0',
  'react-reconciler': '0.32.0',
  'its-fine': '2.0.0',
  'suspend-react': '0.1.3',
  'zustand': '5.0.8',
  'use-sync-external-store': '1.5.0',
  '@use-gesture/react': '10.3.1',
  'maath': '0.10.8',
  'three-stdlib': '2.36.0',
  'detect-gpu': '5.0.70',
  '@babel/runtime': '7.28.4',
};

/** Add nested package requirements only when the active preview reaches them. */
export function expandSandpackRuntimeDependencies(
  dependencies: Record<string, string>,
): Record<string, string> {
  const compatibleDependencies = Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => [
      name,
      SANDPACK_RUNTIME_PACKAGE_VERSIONS[name] || version,
    ]),
  );
  const importsRadix = Object.keys(compatibleDependencies).some((name) => name.startsWith('@radix-ui/react-'));
  const importsMotion = Boolean(compatibleDependencies['framer-motion']);
  const importsExperience = Boolean(
    compatibleDependencies['@react-three/fiber'] || compatibleDependencies['three'],
  );

  if (!importsRadix && !importsMotion && !importsExperience) return compatibleDependencies;

  const runtimeDependencies: Record<string, string> = {};
  if (importsRadix) {
    for (const [name, version] of Object.entries(SANDPACK_TRANSITIVE_RUNTIME_DEPENDENCIES)) {
      if (name === 'motion-dom' || name === 'motion-utils') continue;
      runtimeDependencies[name] = version;
    }
  }
  if (importsMotion) {
    runtimeDependencies['motion-dom'] = SANDPACK_TRANSITIVE_RUNTIME_DEPENDENCIES['motion-dom'];
    runtimeDependencies['motion-utils'] = SANDPACK_TRANSITIVE_RUNTIME_DEPENDENCIES['motion-utils'];
  }

  if (importsExperience) {
    Object.assign(runtimeDependencies, SANDPACK_EXPERIENCE_RUNTIME_DEPENDENCIES);
  }

  return { ...runtimeDependencies, ...compatibleDependencies };
}

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
  experience3d: dependencyGroup('three', '@react-three/fiber', '@react-three/drei'),
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
  'three/webgpu',
  'three/tsl',
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
