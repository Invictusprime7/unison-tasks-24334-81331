/**
 * Dependency Extractor - Automatically detects and extracts npm dependencies from VFS code
 * 
 * Features:
 * - Parses import/require statements from all code files
 * - Resolves package names from import paths
 * - Reads package.json in VFS for pinned versions
 * - Handles scoped packages (@org/package)
 * - Filters out relative imports and built-in modules
 * - Merges with bundled dependencies for Sandpack
 */

// Built-in Node.js modules that shouldn't be treated as dependencies
const BUILTIN_MODULES = new Set([
  'fs', 'path', 'os', 'util', 'events', 'stream', 'http', 'https', 'url',
  'querystring', 'crypto', 'assert', 'buffer', 'child_process', 'cluster',
  'dgram', 'dns', 'domain', 'net', 'readline', 'repl', 'tls', 'tty', 'v8',
  'vm', 'zlib', 'worker_threads', 'perf_hooks', 'async_hooks', 'inspector',
  'module', 'process', 'console', 'timers', 'string_decoder'
]);

// Common dependencies with known stable versions
const KNOWN_VERSIONS: Record<string, string> = {
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  'react-router-dom': '^6.20.0',
  'lucide-react': 'latest',
  'framer-motion': 'latest',
  'clsx': 'latest',
  'tailwind-merge': 'latest',
  'class-variance-authority': 'latest',
  '@radix-ui/react-slot': 'latest',
  '@radix-ui/react-dialog': 'latest',
  '@radix-ui/react-dropdown-menu': 'latest',
  '@radix-ui/react-tabs': 'latest',
  '@radix-ui/react-tooltip': 'latest',
  '@radix-ui/react-select': 'latest',
  '@radix-ui/react-switch': 'latest',
  '@radix-ui/react-checkbox': 'latest',
  '@radix-ui/react-label': 'latest',
  '@radix-ui/react-popover': 'latest',
  '@radix-ui/react-accordion': 'latest',
  '@radix-ui/react-avatar': 'latest',
  '@radix-ui/react-scroll-area': 'latest',
  '@radix-ui/react-separator': 'latest',
  '@radix-ui/react-slider': 'latest',
  '@radix-ui/react-toggle': 'latest',
  '@radix-ui/react-toggle-group': 'latest',
  '@radix-ui/react-toast': 'latest',
  '@radix-ui/react-alert-dialog': 'latest',
  '@radix-ui/react-aspect-ratio': 'latest',
  '@radix-ui/react-collapsible': 'latest',
  '@radix-ui/react-context-menu': 'latest',
  '@radix-ui/react-hover-card': 'latest',
  '@radix-ui/react-menubar': 'latest',
  '@radix-ui/react-navigation-menu': 'latest',
  '@radix-ui/react-progress': 'latest',
  '@radix-ui/react-radio-group': 'latest',
  '@tanstack/react-query': 'latest',
  '@tanstack/react-table': 'latest',
  'recharts': 'latest',
  'date-fns': 'latest',
  'zod': 'latest',
  'axios': 'latest',
  'zustand': 'latest',
  'jotai': 'latest',
  'swr': 'latest',
  'react-hook-form': 'latest',
  '@hookform/resolvers': 'latest',
  'sonner': 'latest',
  'cmdk': 'latest',
  'vaul': 'latest',
  'embla-carousel-react': 'latest',
  'react-day-picker': 'latest',
  'react-resizable-panels': 'latest',
  'input-otp': 'latest',
  'next-themes': 'latest',
  'inngest': 'latest',
};

// Regex patterns for extracting imports
const IMPORT_PATTERNS = [
  // ES6 imports: import X from 'package'
  /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/g,
  // Dynamic imports: import('package')
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Require: require('package')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Export from: export * from 'package'
  /export\s+(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"]/g,
];

export interface ExtractedDependencies {
  /** Dependencies map: package name -> version */
  dependencies: Record<string, string>;
  /** List of packages that couldn't be resolved */
  unresolved: string[];
  /** Packages that were extracted from code */
  detected: string[];
  /** Packages from VFS package.json */
  fromPackageJson: string[];
  /** Total extraction time in ms */
  extractionTime: number;
}

/**
 * Extract npm package name from an import path
 * Handles scoped packages (@org/package) and subpaths (package/subpath)
 */
function extractPackageName(importPath: string): string | null {
  // Skip relative imports
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }

  // Skip aliases (commonly @/ or ~/)
  if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
    return null;
  }

  // Skip built-in modules
  const firstPart = importPath.split('/')[0];
  if (BUILTIN_MODULES.has(firstPart)) {
    return null;
  }

  // Handle scoped packages: @org/package/subpath -> @org/package
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  }

  // Regular packages: package/subpath -> package
  return importPath.split('/')[0];
}

/**
 * Parse package.json from VFS and extract dependencies
 */
function parsePackageJson(content: string): Record<string, string> {
  try {
    const pkg = JSON.parse(content);
    return {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
  } catch {
    return {};
  }
}

/**
 * Extract all dependencies from VFS files
 * 
 * @param files - VFS file map (path -> content)
 * @returns Extracted dependencies info
 */
export function extractDependencies(files: Record<string, string>): ExtractedDependencies {
  const startTime = performance.now();
  const detected = new Set<string>();
  const fromPackageJson = new Set<string>();
  const unresolved: string[] = [];

  // First, check for package.json in VFS
  let packageJsonDeps: Record<string, string> = {};
  const packageJsonContent = files['/package.json'] || files['package.json'];
  if (packageJsonContent) {
    packageJsonDeps = parsePackageJson(packageJsonContent);
    Object.keys(packageJsonDeps).forEach(pkg => fromPackageJson.add(pkg));
  }

  // Scan all code files for imports
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  
  for (const [filePath, content] of Object.entries(files)) {
    // Only scan code files
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    if (!codeExtensions.includes(ext)) continue;
    
    // Apply all import patterns
    for (const pattern of IMPORT_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const packageName = extractPackageName(importPath);
        
        if (packageName) {
          detected.add(packageName);
        }
      }
    }
  }

  // Build final dependencies map
  const dependencies: Record<string, string> = {};
  
  for (const pkg of detected) {
    // Priority: package.json > known versions > 'latest'
    if (packageJsonDeps[pkg]) {
      dependencies[pkg] = packageJsonDeps[pkg];
    } else if (KNOWN_VERSIONS[pkg]) {
      dependencies[pkg] = KNOWN_VERSIONS[pkg];
    } else {
      dependencies[pkg] = 'latest';
      // Track truly unknown packages
      if (!KNOWN_VERSIONS[pkg]) {
        unresolved.push(pkg);
      }
    }
  }

  // Ensure React is always included
  if (!dependencies['react']) {
    dependencies['react'] = KNOWN_VERSIONS['react'];
  }
  if (!dependencies['react-dom']) {
    dependencies['react-dom'] = KNOWN_VERSIONS['react-dom'];
  }

  return {
    dependencies,
    unresolved,
    detected: Array.from(detected),
    fromPackageJson: Array.from(fromPackageJson),
    extractionTime: performance.now() - startTime,
  };
}

/**
 * Merge extracted dependencies with base Sandpack dependencies
 * Returns a combined dependency map safe for Sandpack customSetup
 */
export function mergeDependencies(
  extracted: Record<string, string>,
  base: Record<string, string> = {}
): Record<string, string> {
  // Base dependencies take precedence (they're known to work)
  return {
    ...extracted,
    ...base,
  };
}

/**
 * Get all dependencies needed for Sandpack from VFS files
 * This is the main entry point for SimplePreview integration
 */
export function getDependenciesForSandpack(
  files: Record<string, string>,
  baseDependencies: Record<string, string> = {}
): {
  dependencies: Record<string, string>;
  extractionInfo: ExtractedDependencies;
} {
  const extractionInfo = extractDependencies(files);
  const dependencies = mergeDependencies(extractionInfo.dependencies, baseDependencies);
  
  // Log for debugging
  if (extractionInfo.unresolved.length > 0) {
    console.warn('[DependencyExtractor] Unresolved packages (using latest):', extractionInfo.unresolved);
  }
  
  console.log('[DependencyExtractor] Extracted dependencies:', {
    total: Object.keys(dependencies).length,
    detected: extractionInfo.detected.length,
    fromPackageJson: extractionInfo.fromPackageJson.length,
    unresolved: extractionInfo.unresolved.length,
    time: `${extractionInfo.extractionTime.toFixed(2)}ms`,
  });
  
  return { dependencies, extractionInfo };
}

export default {
  extractDependencies,
  mergeDependencies,
  getDependenciesForSandpack,
  KNOWN_VERSIONS,
};
