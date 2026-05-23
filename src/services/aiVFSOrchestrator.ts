/**
 * AI → VFS Orchestrator
 * 
 * Central service that bridges AI code generation with the Virtual File System
 * and live preview runtime. When the SystemsAI generates code, this orchestrator:
 * 
 * 1. Receives AI-generated files (single or multi-file)
 * 2. Extracts all npm dependencies from the generated code
 * 3. Generates/updates a dynamic package.json in the VFS
 * 4. Writes all files into the VFS atomically
 * 5. Triggers preview iframe refresh with new deps installed
 * 6. Provides iframe state query capabilities for AI context
 * 
 * This is the single integration point — all AI→VFS→Preview traffic flows here.
 */

import { extractDependencies, getDependenciesForSandpack, type ExtractedDependencies } from '@/utils/dependencyExtractor';
import { analyzeReactSite, type SiteAnalysis } from '@/utils/reactSiteAnalysis';
import { vfsEventBus } from '@/services/vfsEventBus';
import { vfsSnapshotManager } from '@/services/vfsSnapshotManager';
import { getGraphSummaryForAI } from '@/services/importGraphAnalyzer';
import { isUnisonProtectedPath } from '@/services/unisonCanonicalRegistry';
import { detectSlotBindingViolations } from '@/services/aiBindingTool';

// ============================================================================
// Types
// ============================================================================

/** Result of an AI code application to VFS */
export interface AIApplyResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Files written to VFS */
  filesWritten: string[];
  /** Dependencies detected and added */
  dependencies: ExtractedDependencies;
  /** Updated package.json content (if changed) */
  packageJson: string | null;
  /** Errors encountered */
  errors: string[];
  /** Timing info */
  timing: {
    depExtractionMs: number;
    totalMs: number;
  };
}

/** Options for applying AI output to VFS */
export interface AIApplyOptions {
  /** Preserve existing VFS files not in the AI output (default: true) */
  preserveExisting?: boolean;
  /** Auto-generate package.json from deps (default: true) */
  autoResolveDeps?: boolean;
  /** Skip dependency extraction (e.g., for HTML-only output) */
  skipDeps?: boolean;
  /** Base dependencies to always include */
  baseDependencies?: Record<string, string>;
  /** Callback after deps resolved but before VFS write */
  onDepsResolved?: (deps: ExtractedDependencies) => void;
  /** Callback after VFS write */
  onFilesWritten?: (paths: string[]) => void;
}

/** VFS interface (subset needed by this service) */
export interface VFSHandle {
  getSandpackFiles: () => Record<string, string>;
  importFiles: (files: Record<string, string>) => void;
  nodes: unknown[];
}

/** Preview handle for iframe control */
export interface PreviewHandle {
  refresh?: () => void;
  syncPageManifest?: (manifest: Record<string, string>) => void;
  getIframe?: () => HTMLIFrameElement | null;
}

// ============================================================================
// Constants
// ============================================================================

/** Base dependencies every React VFS project needs */
const BASE_REACT_DEPS: Record<string, string> = {
  'react': '^18.3.1',
  'react-dom': '^18.3.1',
};

/** Dev dependencies for the Vite/React/TS toolchain */
const BASE_DEV_DEPS: Record<string, string> = {
  '@types/react': '^18.3.12',
  '@types/react-dom': '^18.3.1',
  '@vitejs/plugin-react': '^4.3.4',
  'autoprefixer': '^10.4.20',
  'postcss': '^8.4.49',
  'tailwindcss': '^3.4.17',
  'typescript': '^5.6.3',
  'vite': '^5.4.11',
};

function getExistingContent(files: Record<string, string>, path: string): string | undefined {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return files[path] ?? files[normalized] ?? files[normalized.replace(/^\/src\//, '/')];
}

function validateAIFileEdits(
  aiFiles: Record<string, string>,
  currentFiles: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const [path, nextContent] of Object.entries(aiFiles)) {
    if (isUnisonProtectedPath(path)) {
      errors.push(
        `AI edit blocked for auto-generated file ${path}. ` +
          `Edit CreatorData/Creator Playground inputs; Unison files are regenerated canonically.`,
      );
      continue;
    }
    const previousContent = getExistingContent(currentFiles, path);
    for (const violation of detectSlotBindingViolations(previousContent, nextContent)) {
      errors.push(`[${path}] ${violation.reason}`);
    }
  }
  return errors;
}

// ============================================================================
// Core Orchestrator
// ============================================================================

/**
 * Apply AI-generated files to the VFS with automatic dependency resolution.
 * 
 * This is the main entry point. Call it whenever the AI produces code.
 * It will:
 * - Merge AI files with existing VFS content
 * - Scan all code for import statements
 * - Generate a dynamic package.json
 * - Import everything atomically into the VFS
 */
export function applyAIOutputToVFS(
  aiFiles: Record<string, string>,
  vfs: VFSHandle,
  options: AIApplyOptions = {}
): AIApplyResult {
  const startTime = performance.now();
  const {
    preserveExisting = true,
    autoResolveDeps = true,
    skipDeps = false,
    baseDependencies = BASE_REACT_DEPS,
    onDepsResolved,
    onFilesWritten,
  } = options;

  const errors: string[] = [];
  let depExtraction: ExtractedDependencies | null = null;
  let depExtractionMs = 0;

  // Emit AI apply start event
  vfsEventBus.emit('ai:apply:start', { files: Object.keys(aiFiles) });

  try {
    // 0. Snapshot current state for undo
    const currentFiles = preserveExisting ? vfs.getSandpackFiles() : {};
    const validationErrors = validateAIFileEdits(aiFiles, currentFiles);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      vfsEventBus.emit('ai:apply:error', { message: validationErrors.join('\n') });
      return {
        success: false,
        filesWritten: [],
        dependencies: createEmptyDeps(),
        packageJson: null,
        errors,
        timing: {
          depExtractionMs: 0,
          totalMs: performance.now() - startTime,
        },
      };
    }
    vfsSnapshotManager.createSnapshot(currentFiles, `Before AI edit (${Object.keys(aiFiles).length} files)`, 'ai');

    // 1. Merge AI output with existing files
    const mergedFiles: Record<string, string> = {
      ...currentFiles,
      ...aiFiles,
    };

    // 2. Extract dependencies from ALL files (existing + new)
    if (!skipDeps && autoResolveDeps) {
      const depStart = performance.now();
      const { dependencies, extractionInfo } = getDependenciesForSandpack(mergedFiles, baseDependencies);
      depExtraction = extractionInfo;
      depExtractionMs = performance.now() - depStart;

      onDepsResolved?.(extractionInfo);

      // Emit deps resolved event
      const prevDeps = Object.keys((currentFiles['/package.json'] ? JSON.parse(currentFiles['/package.json'] || '{}').dependencies : {}) || {});
      const newDeps = Object.keys(dependencies).filter(d => !prevDeps.includes(d));
      vfsEventBus.emit('deps:resolved', { dependencies, newDeps, removedDeps: [] });

      // 3. Generate dynamic package.json
      const packageJson = generatePackageJson(dependencies, mergedFiles);
      mergedFiles['/package.json'] = packageJson;

      console.log('[AIVFSOrchestrator] Dependencies resolved:', {
        total: Object.keys(dependencies).length,
        detected: extractionInfo.detected.length,
        unresolved: extractionInfo.unresolved,
        time: `${depExtractionMs.toFixed(1)}ms`,
      });
    }

    // 4. Import all files into VFS atomically
    liveVFSCommit.writeFiles(mergedFiles, 'ai-builder', vfs.importFiles);

    const filesWritten = Object.keys(aiFiles);
    onFilesWritten?.(filesWritten);

    // Emit AI apply complete event
    vfsEventBus.emit('ai:apply:complete', { filesWritten });
    vfsEventBus.emit('build:success', {});

    console.log('[AIVFSOrchestrator] Applied AI output:', {
      newFiles: filesWritten.length,
      totalFiles: Object.keys(mergedFiles).length,
      totalMs: (performance.now() - startTime).toFixed(1),
    });

    return {
      success: true,
      filesWritten,
      dependencies: depExtraction || createEmptyDeps(),
      packageJson: mergedFiles['/package.json'] || null,
      errors,
      timing: {
        depExtractionMs,
        totalMs: performance.now() - startTime,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    console.error('[AIVFSOrchestrator] Error applying AI output:', msg);

    // Emit error events
    vfsEventBus.emit('ai:apply:error', { message: msg });
    vfsEventBus.emit('build:error', { message: msg });

    return {
      success: false,
      filesWritten: [],
      dependencies: depExtraction || createEmptyDeps(),
      packageJson: null,
      errors,
      timing: {
        depExtractionMs,
        totalMs: performance.now() - startTime,
      },
    };
  }
}

/**
 * Generate a complete package.json from resolved dependencies.
 * Merges with any existing package.json in the VFS.
 */
export function generatePackageJson(
  dependencies: Record<string, string>,
  files: Record<string, string>
): string {
  // Check for existing package.json to preserve user overrides
  let existingPkg: Record<string, unknown> = {};
  let existingDeps: Record<string, string> = {};
  let existingDevDeps: Record<string, string> = {};
  const existingContent = files['/package.json'] || files['package.json'];

  if (existingContent) {
    try {
      existingPkg = JSON.parse(existingContent);
      existingDeps = (existingPkg.dependencies as Record<string, string>) || {};
      existingDevDeps = (existingPkg.devDependencies as Record<string, string>) || {};
    } catch { /* ignore malformed JSON */ }
  }

  const mergedDeps: Record<string, string> = {
    ...BASE_REACT_DEPS,
    ...dependencies,
    ...existingDeps,  // user-specified always wins
  };

  const mergedDevDeps: Record<string, string> = {
    ...BASE_DEV_DEPS,
    ...existingDevDeps,
  };

  const pkg = {
    name: (existingPkg.name as string) || 'unison-preview',
    private: true,
    version: (existingPkg.version as string) || '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite --host 0.0.0.0 --port 4173',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: mergedDeps,
    devDependencies: mergedDevDeps,
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * Query the current iframe state for AI context.
 * Returns structured information about what's currently rendered.
 */
export function queryIframeState(previewHandle: PreviewHandle): {
  available: boolean;
  url: string | null;
  title: string | null;
  bodyText: string | null;
  elementCount: number;
  visibleComponents: string[];
  errors: string[];
} {
  const result = {
    available: false,
    url: null as string | null,
    title: null as string | null,
    bodyText: null as string | null,
    elementCount: 0,
    visibleComponents: [] as string[],
    errors: [] as string[],
  };

  try {
    const iframe = previewHandle.getIframe?.();
    if (!iframe) return result;

    const doc = iframe.contentDocument;
    if (!doc) return result;

    result.available = true;
    result.url = iframe.contentWindow?.location.href || null;
    result.title = doc.title || null;
    result.bodyText = doc.body?.innerText?.slice(0, 2000) || null;
    result.elementCount = doc.querySelectorAll('*').length;

    // Detect visible React-like component boundaries
    const components = doc.querySelectorAll('[data-component], [class*="Component"], section, main, header, footer, nav');
    result.visibleComponents = Array.from(components).map(el => {
      const tag = el.tagName.toLowerCase();
      const dataComponent = el.getAttribute('data-component');
      const className = el.className?.toString().split(' ')[0] || '';
      return dataComponent || `${tag}.${className}`;
    }).slice(0, 20);

  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}

// ============================================================================
// Component Behavior Snapshot
// ============================================================================

/** A single interactive element's behavioral metadata */
export interface ComponentBehaviorEntry {
  /** CSS selector path to locate this element */
  selector: string;
  /** HTML tag name */
  tagName: string;
  /** Visible text content (truncated) */
  textContent: string;
  /** Which VFS file renders this element (best guess) */
  sourceFile: string | null;
  /** Current event handler names detected on the element */
  handlers: string[];
  /** data-ut-intent value if present */
  intent: string | null;
  /** data-ut-cta value if present */
  ctaLabel: string | null;
  /** Key aria/role attributes */
  role: string | null;
  /** Whether element has existing onClick/onSubmit/onChange */
  hasInteraction: boolean;
}

/** Full behavior snapshot of the live preview */
export interface ComponentBehaviorMap {
  /** Interactive elements discovered in the DOM */
  elements: ComponentBehaviorEntry[];
  /** React state hooks found in VFS source files: { file -> [stateVarName, ...] } */
  stateByFile: Record<string, string[]>;
  /** React effect hooks found: { file -> count } */
  effectsByFile: Record<string, number>;
  /** Custom hooks used: { file -> [hookName, ...] } */
  hooksByFile: Record<string, string[]>;
  /** Timestamp of snapshot */
  snapshotAt: number;
}

/**
 * Build a deep behavioral snapshot combining DOM inspection and VFS source parsing.
 * This gives the AI full awareness of what interactive elements exist and their current wiring.
 */
export function buildComponentBehaviorMap(
  previewHandle: PreviewHandle,
  vfsFiles: Record<string, string>,
): ComponentBehaviorMap {
  const elements: ComponentBehaviorEntry[] = [];
  const stateByFile: Record<string, string[]> = {};
  const effectsByFile: Record<string, number> = {};
  const hooksByFile: Record<string, string[]> = {};

  // ── DOM Inspection ──
  try {
    const iframe = previewHandle.getIframe?.();
    const doc = iframe?.contentDocument;
    if (doc) {
      const interactiveSelectors = 'button, a, [onclick], [data-ut-intent], [role="button"], input, textarea, select, form, [data-editable], [contenteditable]';
      const els = doc.querySelectorAll(interactiveSelectors);

      els.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const handlers: string[] = [];

        // Detect inline handlers
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith('on') || attr.name === 'data-onclick') {
            handlers.push(attr.name);
          }
        }

        // Check for React event props via __reactProps (React 18+)
        const reactPropsKey = Object.keys(htmlEl).find(k => k.startsWith('__reactProps'));
        if (reactPropsKey) {
          const props = (htmlEl as any)[reactPropsKey];
          if (props) {
            for (const key of Object.keys(props)) {
              if (/^on[A-Z]/.test(key) && typeof props[key] === 'function') {
                handlers.push(key);
              }
            }
          }
        }

        // Build selector
        let selector = htmlEl.tagName.toLowerCase();
        if (htmlEl.id) selector += `#${htmlEl.id}`;
        else if (htmlEl.className && typeof htmlEl.className === 'string') {
          const cls = htmlEl.className.split(' ').filter(Boolean).slice(0, 2).join('.');
          if (cls) selector += `.${cls}`;
        }

        elements.push({
          selector,
          tagName: htmlEl.tagName.toLowerCase(),
          textContent: (htmlEl.textContent || '').trim().slice(0, 80),
          sourceFile: null, // resolved below via VFS matching
          handlers,
          intent: el.getAttribute('data-ut-intent'),
          ctaLabel: el.getAttribute('data-ut-cta'),
          role: el.getAttribute('role'),
          hasInteraction: handlers.length > 0 || !!el.getAttribute('data-ut-intent'),
        });
      });
    }
  } catch { /* DOM inspection is best-effort */ }

  // ── VFS Source Parsing ──
  const stateRegex = /\buse(?:State|Reducer)\s*[<(]/g;
  const stateNameRegex = /(?:const|let)\s+\[(\w+)/g;
  const effectRegex = /\buseEffect\s*\(/g;
  const hookRegex = /\buse[A-Z]\w+\s*\(/g;
  const componentNameRegex = /(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)/;

  for (const [filePath, content] of Object.entries(vfsFiles)) {
    if (!/\.(tsx|jsx)$/.test(filePath)) continue;

    // Extract state variable names
    const stateVars: string[] = [];
    let match: RegExpExecArray | null;
    const contentLines = content;

    while ((match = stateNameRegex.exec(contentLines)) !== null) {
      // Only count if preceded by useState/useReducer on similar line
      const lineStart = contentLines.lastIndexOf('\n', match.index);
      const line = contentLines.slice(lineStart, match.index + match[0].length + 100);
      if (/useState|useReducer/.test(line)) {
        stateVars.push(match[1]);
      }
    }
    if (stateVars.length) stateByFile[filePath] = stateVars;

    // Count effects
    const effects = (contentLines.match(effectRegex) || []).length;
    if (effects) effectsByFile[filePath] = effects;

    // Detect custom hooks (use* calls that aren't built-in)
    const builtIn = new Set(['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue', 'useDeferredValue', 'useTransition', 'useId', 'useSyncExternalStore', 'useInsertionEffect']);
    const hooks: string[] = [];
    while ((match = hookRegex.exec(contentLines)) !== null) {
      const hookName = match[0].replace(/\s*\($/, '');
      if (!builtIn.has(hookName) && !hooks.includes(hookName)) {
        hooks.push(hookName);
      }
    }
    if (hooks.length) hooksByFile[filePath] = hooks;

    // Try to map DOM elements to this file by matching text content or component names
    const compMatch = componentNameRegex.exec(content);
    const componentName = compMatch?.[1];
    if (componentName) {
      for (const entry of elements) {
        if (!entry.sourceFile) {
          // Match by data-component attribute or by text content presence in source
          if (content.includes(`data-component="${componentName}"`) ||
              (entry.textContent.length > 5 && content.includes(entry.textContent.slice(0, 30)))) {
            entry.sourceFile = filePath;
          }
        }
      }
    }
  }

  return {
    elements: elements.slice(0, 40), // cap for prompt budget
    stateByFile,
    effectsByFile,
    hooksByFile,
    snapshotAt: Date.now(),
  };
}

/**
 * Format the behavior map as a compact string for AI prompt context.
 */
export function formatBehaviorMapForPrompt(map: ComponentBehaviorMap): string {
  if (map.elements.length === 0 && Object.keys(map.stateByFile).length === 0) {
    return '';
  }

  const lines: string[] = ['[Component Behavior Map]'];

  // Interactive elements
  if (map.elements.length > 0) {
    lines.push('Interactive elements:');
    for (const el of map.elements) {
      const parts = [`  ${el.selector}`];
      if (el.textContent) parts.push(`"${el.textContent.slice(0, 40)}"`);
      if (el.intent) parts.push(`intent=${el.intent}`);
      if (el.handlers.length) parts.push(`handlers=[${el.handlers.join(',')}]`);
      if (el.sourceFile) parts.push(`→ ${el.sourceFile}`);
      if (!el.hasInteraction) parts.push('(no handler)');
      lines.push(parts.join(' '));
    }
  }

  // State by file
  if (Object.keys(map.stateByFile).length) {
    lines.push('State hooks:');
    for (const [file, vars] of Object.entries(map.stateByFile)) {
      lines.push(`  ${file}: ${vars.join(', ')}`);
    }
  }

  // Custom hooks
  if (Object.keys(map.hooksByFile).length) {
    lines.push('Custom hooks:');
    for (const [file, hooks] of Object.entries(map.hooksByFile)) {
      lines.push(`  ${file}: ${hooks.join(', ')}`);
    }
  }

  // Effects summary
  if (Object.keys(map.effectsByFile).length) {
    lines.push('Effects: ' + Object.entries(map.effectsByFile).map(([f, n]) => `${f}(${n})`).join(', '));
  }

  return lines.join('\n');
}

/**
 * Read all current VFS files and format them as context for the AI prompt.
 * This gives the AI full visibility into the current project state,
 * including a structural analysis of React components and sections.
 */
export function getVFSContextForAI(vfs: VFSHandle): {
  fileList: string[];
  fileContents: Record<string, string>;
  packageDeps: string[];
  summary: string;
  siteAnalysis: SiteAnalysis | null;
  importGraph: string;
} {
  const files = vfs.getSandpackFiles();
  const fileList = Object.keys(files).sort();

  // Parse package.json deps
  let packageDeps: string[] = [];
  const pkgContent = files['/package.json'] || files['package.json'];
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      packageDeps = Object.keys(pkg.dependencies || {});
    } catch { /* ignore */ }
  }

  // Analyze React component structure
  let siteAnalysis: SiteAnalysis | null = null;
  try {
    siteAnalysis = analyzeReactSite(files);
  } catch { /* ignore — analysis is optional */ }

  // Analyze import graph
  let importGraph = '';
  try {
    importGraph = getGraphSummaryForAI(files);
  } catch { /* ignore */ }

  // Build summary with site structure + graph
  const codeFiles = fileList.filter(f => /\.(tsx?|jsx?|css|html)$/.test(f));
  const summaryLines = [
    `Project has ${fileList.length} files (${codeFiles.length} code files).`,
    packageDeps.length > 0 ? `Dependencies: ${packageDeps.join(', ')}` : 'No package.json found.',
    `Code files: ${codeFiles.join(', ')}`,
  ];

  if (siteAnalysis?.sectionMap) {
    summaryLines.push('', 'Site Structure:', siteAnalysis.sectionMap);
  }

  if (importGraph) {
    summaryLines.push('', importGraph);
  }

  const summary = summaryLines.join('\n');

  return { fileList, fileContents: files, packageDeps, summary, siteAnalysis, importGraph };
}

/**
 * Post a message to the preview iframe to manipulate its state.
 * The iframe must have a message listener that handles these commands.
 */
export function postToIframe(
  previewHandle: PreviewHandle,
  message: {
    type: string;
    [key: string]: unknown;
  }
): boolean {
  try {
    const iframe = previewHandle.getIframe?.();
    if (!iframe?.contentWindow) return false;

    iframe.contentWindow.postMessage(message, '*');
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function createEmptyDeps(): ExtractedDependencies {
  return {
    dependencies: {},
    unresolved: [],
    detected: [],
    fromPackageJson: [],
    extractionTime: 0,
  };
}
