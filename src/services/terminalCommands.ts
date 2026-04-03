/**
 * VFS Terminal Command Engine
 * 
 * Provides an interactive command processor that operates on the Virtual File System.
 * Commands can be executed by users typing in the terminal or programmatically by the AI.
 * 
 * Supported commands:
 *   install <pkg[@ver]>  — Add a dependency to the Sandpack preview
 *   uninstall <pkg>      — Remove a dependency
 *   deps                 — List current dependencies
 *   ls [path]            — List files/folders at path
 *   tree                 — Show full file tree
 *   cat <file>           — Print file contents
 *   find <pattern>       — Search for files matching a glob pattern
 *   diagnose             — Run VFS diagnostics (broken imports, missing files)
 *   whoami               — Show current business system type
 *   clear                — Clear terminal output
 *   help                 — Show available commands
 */

import type { VirtualNode, VirtualFile, VirtualFolder } from '@/hooks/useVirtualFileSystem';
import { vfsToFileMap, getFilePaths } from '@/hooks/useVirtualFileSystem';
import { SANDPACK_DEPENDENCIES, SANDPACK_ALLOWED_IMPORTS } from '@/utils/sandpackDependencies';

// ============================================================================
// Types
// ============================================================================

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'warn';
  text: string;
  timestamp: number;
}

export interface CommandContext {
  nodes: VirtualNode[];
  currentDeps: Record<string, string>;
  businessType?: string;
  onAddDep: (pkg: string, version: string) => void;
  onRemoveDep: (pkg: string) => void;
  onRefreshPreview?: () => void;
  onWriteFile?: (path: string, content: string) => void;
}

export interface CommandResult {
  lines: TerminalLine[];
  /** If the command modified state */
  mutated?: boolean;
}

// ============================================================================
// Business system dependency presets
// ============================================================================

const BUSINESS_SYSTEM_DEPS: Record<string, Record<string, string>> = {
  salon: {
    'date-fns': 'latest',
    'react-day-picker': 'latest',
    'recharts': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-select': 'latest',
    '@radix-ui/react-tabs': 'latest',
  },
  restaurant: {
    'recharts': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-tabs': 'latest',
    '@radix-ui/react-accordion': 'latest',
    'framer-motion': 'latest',
  },
  medical: {
    'date-fns': 'latest',
    'react-day-picker': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-select': 'latest',
    '@radix-ui/react-tabs': 'latest',
    '@radix-ui/react-accordion': 'latest',
    'recharts': 'latest',
  },
  ecommerce: {
    'recharts': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-select': 'latest',
    '@radix-ui/react-tabs': 'latest',
    '@radix-ui/react-checkbox': 'latest',
    '@radix-ui/react-slider': 'latest',
    'framer-motion': 'latest',
  },
  saas: {
    'recharts': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-tabs': 'latest',
    '@radix-ui/react-switch': 'latest',
    '@radix-ui/react-tooltip': 'latest',
    '@radix-ui/react-dropdown-menu': 'latest',
    'framer-motion': 'latest',
  },
  fitness: {
    'recharts': 'latest',
    'date-fns': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-tabs': 'latest',
    '@radix-ui/react-progress': 'latest',
    'framer-motion': 'latest',
  },
  realestate: {
    'recharts': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-select': 'latest',
    '@radix-ui/react-slider': 'latest',
    '@radix-ui/react-tabs': 'latest',
    'framer-motion': 'latest',
  },
};

// ============================================================================
// ID generator
// ============================================================================

let lineId = 0;
function mkLine(type: TerminalLine['type'], text: string): TerminalLine {
  return { id: `tl_${++lineId}`, type, text, timestamp: Date.now() };
}

// ============================================================================
// Command Handlers
// ============================================================================

function cmdHelp(): CommandResult {
  return {
    lines: [
      mkLine('system', '┌─ VFS Terminal Commands ─────────────────────────────'),
      mkLine('output', '│  install <pkg[@ver]>    Add dependency to preview'),
      mkLine('output', '│  uninstall <pkg>        Remove dependency'),
      mkLine('output', '│  deps                   List current dependencies'),
      mkLine('output', '│  preset <type>          Install deps for business type'),
      mkLine('output', '│  ls [path]              List files at path'),
      mkLine('output', '│  tree                   Show full file tree'),
      mkLine('output', '│  cat <file>             Show file contents'),
      mkLine('output', '│  find <pattern>         Search files by name'),
      mkLine('output', '│  diagnose               Run VFS diagnostics'),
      mkLine('output', '│  whoami                 Show business system type'),
      mkLine('output', '│  clear                  Clear terminal'),
      mkLine('output', '│  help                   Show this help'),
      mkLine('system', '└───────────────────────────────────────────────────────'),
    ],
  };
}

function cmdInstall(args: string[], ctx: CommandContext): CommandResult {
  if (args.length === 0) {
    return { lines: [mkLine('error', 'Usage: install <package[@version]> [package2...]')] };
  }

  const lines: TerminalLine[] = [];
  let mutated = false;

  for (const raw of args) {
    const atIdx = raw.lastIndexOf('@');
    let pkg: string, version: string;

    if (atIdx > 0) {
      pkg = raw.slice(0, atIdx);
      version = raw.slice(atIdx + 1);
    } else {
      pkg = raw;
      version = 'latest';
    }

    if (ctx.currentDeps[pkg]) {
      lines.push(mkLine('warn', `⚠ ${pkg} already installed (${ctx.currentDeps[pkg]})`));
      continue;
    }

    ctx.onAddDep(pkg, version);
    lines.push(mkLine('success', `✓ ${pkg}@${version} added to dependencies`));
    mutated = true;
  }

  if (mutated) {
    lines.push(mkLine('system', '↻ Preview will reload with new dependencies'));
    ctx.onRefreshPreview?.();
  }

  return { lines, mutated };
}

function cmdUninstall(args: string[], ctx: CommandContext): CommandResult {
  if (args.length === 0) {
    return { lines: [mkLine('error', 'Usage: uninstall <package> [package2...]')] };
  }

  const lines: TerminalLine[] = [];
  let mutated = false;

  for (const pkg of args) {
    if (!ctx.currentDeps[pkg]) {
      lines.push(mkLine('warn', `⚠ ${pkg} is not installed`));
      continue;
    }

    // Protect core deps
    const coreDeps = ['react', 'react-dom', 'react-router-dom'];
    if (coreDeps.includes(pkg)) {
      lines.push(mkLine('error', `✗ Cannot remove core dependency: ${pkg}`));
      continue;
    }

    ctx.onRemoveDep(pkg);
    lines.push(mkLine('success', `✓ ${pkg} removed`));
    mutated = true;
  }

  if (mutated) {
    lines.push(mkLine('system', '↻ Preview will reload'));
    ctx.onRefreshPreview?.();
  }

  return { lines, mutated };
}

function cmdDeps(ctx: CommandContext): CommandResult {
  const deps = { ...SANDPACK_DEPENDENCIES, ...ctx.currentDeps };
  const sorted = Object.entries(deps).sort(([a], [b]) => a.localeCompare(b));

  if (sorted.length === 0) {
    return { lines: [mkLine('output', 'No dependencies installed')] };
  }

  const lines: TerminalLine[] = [
    mkLine('system', `── Dependencies (${sorted.length}) ──`),
  ];

  for (const [pkg, ver] of sorted) {
    const isCustom = ctx.currentDeps[pkg] && !SANDPACK_DEPENDENCIES[pkg];
    lines.push(mkLine('output', `  ${pkg} ${ver}${isCustom ? ' (custom)' : ''}`));
  }

  return { lines };
}

function cmdPreset(args: string[], ctx: CommandContext): CommandResult {
  const type = args[0]?.toLowerCase();
  const available = Object.keys(BUSINESS_SYSTEM_DEPS);

  if (!type || !BUSINESS_SYSTEM_DEPS[type]) {
    return {
      lines: [
        mkLine('error', `Usage: preset <type>`),
        mkLine('output', `Available: ${available.join(', ')}`),
      ],
    };
  }

  const preset = BUSINESS_SYSTEM_DEPS[type];
  const lines: TerminalLine[] = [
    mkLine('system', `Installing ${type} preset dependencies...`),
  ];
  let count = 0;

  for (const [pkg, ver] of Object.entries(preset)) {
    if (!ctx.currentDeps[pkg] && !SANDPACK_DEPENDENCIES[pkg]) {
      ctx.onAddDep(pkg, ver);
      lines.push(mkLine('success', `  ✓ ${pkg}@${ver}`));
      count++;
    } else {
      lines.push(mkLine('output', `  ─ ${pkg} (already present)`));
    }
  }

  lines.push(mkLine('system', `${count} new dependencies added for "${type}" system`));
  if (count > 0) ctx.onRefreshPreview?.();

  return { lines, mutated: count > 0 };
}

function cmdLs(args: string[], ctx: CommandContext): CommandResult {
  const targetPath = args[0] || '/src';
  const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;

  const children = ctx.nodes.filter(n => {
    const parentPath = n.path?.replace(/\/[^/]+$/, '') || '';
    return parentPath === normalizedTarget || (normalizedTarget === '/' && !n.parentId);
  });

  if (children.length === 0) {
    return { lines: [mkLine('warn', `No entries at ${normalizedTarget}`)] };
  }

  const lines: TerminalLine[] = [mkLine('system', `── ${normalizedTarget} ──`)];

  // Folders first, then files
  const folders = children.filter((n): n is VirtualFolder => n.type === 'folder').sort((a, b) => a.name.localeCompare(b.name));
  const files = children.filter((n): n is VirtualFile => n.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

  for (const f of folders) {
    lines.push(mkLine('output', `  📁 ${f.name}/`));
  }
  for (const f of files) {
    const size = f.content?.length ?? 0;
    const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}K` : `${size}B`;
    lines.push(mkLine('output', `  📄 ${f.name}  (${sizeStr})`));
  }

  lines.push(mkLine('system', `${folders.length} folders, ${files.length} files`));
  return { lines };
}

function cmdTree(ctx: CommandContext): CommandResult {
  const allPaths = getFilePaths(ctx.nodes).sort();
  if (allPaths.length === 0) {
    return { lines: [mkLine('warn', 'VFS is empty')] };
  }

  const lines: TerminalLine[] = [mkLine('system', `── File Tree (${allPaths.length} files) ──`)];

  for (const p of allPaths) {
    const depth = (p.match(/\//g) || []).length - 1;
    const indent = '  '.repeat(Math.max(0, depth));
    const name = p.split('/').pop() || p;
    lines.push(mkLine('output', `${indent}${name}`));
  }

  return { lines };
}

function cmdCat(args: string[], ctx: CommandContext): CommandResult {
  if (args.length === 0) {
    return { lines: [mkLine('error', 'Usage: cat <filepath>')] };
  }

  let filePath = args[0];
  if (!filePath.startsWith('/')) filePath = `/${filePath}`;

  const fileMap = vfsToFileMap(ctx.nodes);
  // Try exact match, then with /src prefix
  let content = fileMap[filePath] ?? fileMap[`/src${filePath}`];

  // Fuzzy match: find files ending with the given path
  if (content === undefined) {
    const match = Object.entries(fileMap).find(([p]) => p.endsWith(filePath) || p.endsWith(args[0]));
    if (match) content = match[1];
  }

  if (content === undefined) {
    return { lines: [mkLine('error', `File not found: ${filePath}`)] };
  }

  const preview = content.length > 2000
    ? content.slice(0, 2000) + `\n... (truncated, ${content.length} chars total)`
    : content;

  return {
    lines: [
      mkLine('system', `── ${filePath} ──`),
      ...preview.split('\n').map(line => mkLine('output', line)),
    ],
  };
}

function cmdFind(args: string[], ctx: CommandContext): CommandResult {
  if (args.length === 0) {
    return { lines: [mkLine('error', 'Usage: find <pattern>')] };
  }

  const pattern = args[0].toLowerCase();
  const allPaths = getFilePaths(ctx.nodes);
  const matches = allPaths.filter(p => p.toLowerCase().includes(pattern));

  if (matches.length === 0) {
    return { lines: [mkLine('warn', `No files matching "${pattern}"`)] };
  }

  return {
    lines: [
      mkLine('system', `── ${matches.length} matches for "${pattern}" ──`),
      ...matches.map(p => mkLine('output', `  ${p}`)),
    ],
  };
}

function cmdDiagnose(ctx: CommandContext): CommandResult {
  const fileMap = vfsToFileMap(ctx.nodes);
  const allPaths = new Set(Object.keys(fileMap));
  const lines: TerminalLine[] = [mkLine('system', '── VFS Diagnostics ──')];

  let issues = 0;

  // Check for broken relative imports
  const importRegex = /(?:import|from)\s+['"](\.\/.+?|\.\.\/.*?)['"];?/g;

  for (const [filePath, content] of Object.entries(fileMap)) {
    let match: RegExpExecArray | null;
    const fileDir = filePath.replace(/\/[^/]+$/, '');
    importRegex.lastIndex = 0;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      // Resolve relative path
      let resolved: string;
      if (importPath.startsWith('./')) {
        resolved = `${fileDir}/${importPath.slice(2)}`;
      } else if (importPath.startsWith('../')) {
        const parentDir = fileDir.replace(/\/[^/]+$/, '');
        resolved = `${parentDir}/${importPath.slice(3)}`;
      } else {
        continue;
      }

      // Check with common extensions
      const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '.css', '/index.tsx', '/index.ts'];
      const found = extensions.some(ext => allPaths.has(resolved + ext));

      if (!found) {
        lines.push(mkLine('error', `  ✗ Broken import: ${importPath} in ${filePath}`));
        issues++;
      }
    }
  }

  // Check for missing entry file
  const hasEntry = allPaths.has('/src/App.tsx') || allPaths.has('/src/App.jsx') || allPaths.has('/src/main.tsx');
  if (!hasEntry) {
    lines.push(mkLine('error', '  ✗ Missing entry file (App.tsx or main.tsx)'));
    issues++;
  }

  // Check for empty files
  for (const [path, content] of Object.entries(fileMap)) {
    if (content.trim().length === 0) {
      lines.push(mkLine('warn', `  ⚠ Empty file: ${path}`));
      issues++;
    }
  }

  // Check for duplicate default exports
  const defaultExports = new Map<string, string[]>();
  for (const [path, content] of Object.entries(fileMap)) {
    const exportMatch = content.match(/export\s+default\s+(?:function|class|const)?\s*(\w+)/);
    if (exportMatch) {
      const name = exportMatch[1];
      if (!defaultExports.has(name)) defaultExports.set(name, []);
      defaultExports.get(name)!.push(path);
    }
  }
  for (const [name, paths] of defaultExports) {
    if (paths.length > 1) {
      lines.push(mkLine('warn', `  ⚠ Duplicate default export "${name}" in: ${paths.join(', ')}`));
      issues++;
    }
  }

  if (issues === 0) {
    lines.push(mkLine('success', '  ✓ No issues found'));
  } else {
    lines.push(mkLine('system', `── ${issues} issue${issues !== 1 ? 's' : ''} found ──`));
  }

  return { lines };
}

function cmdWhoami(ctx: CommandContext): CommandResult {
  return {
    lines: [
      mkLine('output', `Business type: ${ctx.businessType || 'not set'}`),
      mkLine('output', `Files: ${getFilePaths(ctx.nodes).length}`),
      mkLine('output', `Custom deps: ${Object.keys(ctx.currentDeps).length}`),
    ],
  };
}

// ============================================================================
// Main command processor
// ============================================================================

export function processCommand(input: string, ctx: CommandContext): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [] };

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
    case '?':
      return cmdHelp();
    case 'install':
    case 'add':
    case 'i':
      return cmdInstall(args, ctx);
    case 'uninstall':
    case 'remove':
    case 'rm':
      return cmdUninstall(args, ctx);
    case 'deps':
    case 'dependencies':
    case 'packages':
      return cmdDeps(ctx);
    case 'preset':
    case 'bootstrap':
      return cmdPreset(args, ctx);
    case 'ls':
    case 'dir':
      return cmdLs(args, ctx);
    case 'tree':
      return cmdTree(ctx);
    case 'cat':
    case 'type':
    case 'show':
      return cmdCat(args, ctx);
    case 'find':
    case 'search':
    case 'grep':
      return cmdFind(args, ctx);
    case 'diagnose':
    case 'diag':
    case 'doctor':
      return cmdDiagnose(ctx);
    case 'whoami':
    case 'status':
      return cmdWhoami(ctx);
    case 'clear':
    case 'cls':
      return { lines: [mkLine('system', '__CLEAR__')] };
    default:
      return {
        lines: [
          mkLine('error', `Unknown command: ${cmd}`),
          mkLine('output', 'Type "help" for available commands'),
        ],
      };
  }
}

/** Parse an AI-generated command string (may contain multiple lines) */
export function parseAICommands(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));
}

/**
 * Execute a terminal command for AI integration
 * Wrapper around processCommand that handles both strings and parsed commands
 */
export async function executeTerminalCommand(
  input: string,
  ctx: CommandContext
): Promise<CommandResult> {
  return processCommand(input, ctx);
}

/**
 * Get structured diagnostic information for AI
 * Provides machine-readable output about VFS state, dependencies, and issues
 */
export function getDiagnosticsForAI(ctx: CommandContext): Record<string, unknown> {
  const fileMap = vfsToFileMap(ctx.nodes);
  const files = getFilePaths(ctx.nodes);

  // Analyze imports and dependencies
  const importIssues: string[] = [];
  const tsFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

  tsFiles.forEach(file => {
    const content = fileMap[file] || '';
    // Basic import validation
    const importMatches: string[] = content.match(/from ['"]([^'"]+)['"]/g) ?? [];
    importMatches.forEach(importStr => {
      const moduleName = importStr.match(/from ['"]([^'"]+)['"]/)?.[1];
      if (moduleName && !moduleName.startsWith('.') && !moduleName.startsWith('/')) {
        // Check if it's in dependencies
        if (!ctx.currentDeps[moduleName] && !SANDPACK_ALLOWED_IMPORTS.has(moduleName)) {
          importIssues.push(`${file}: Missing dependency "${moduleName}"`);
        }
      }
    });
  });

  return {
    vfs: {
      fileCount: files.length,
      files: files,
      totalSize: files.reduce((sum, f) => sum + (fileMap[f]?.length || 0), 0),
    },
    dependencies: {
      count: Object.keys(ctx.currentDeps).length,
      packages: ctx.currentDeps,
    },
    issues: {
      importIssues: importIssues,
      missingFiles: [],
      count: importIssues.length,
    },
  };
}
