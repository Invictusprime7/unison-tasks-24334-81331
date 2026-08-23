import { parseImportStatements, resolveCandidateModule } from './compileSafeGate';

const CODE_FILE = /\.(tsx|jsx|ts|js|mjs|cjs)$/;
const JSX_FILE = /\.(tsx|jsx)$/;

export type ComponentContractCode =
  | 'MISSING_DEFAULT_COMPONENT_EXPORT'
  | 'MISSING_NAMED_COMPONENT_EXPORT'
  | 'MISSING_NAMESPACE_COMPONENT_EXPORT'
  | 'NON_RENDERABLE_COMPONENT_EXPORT';

export interface ComponentContractDiagnostic {
  importerPath: string;
  localName: string;
  specifier: string;
  targetPath: string;
  exportName: string;
  availableExports: string[];
  code: ComponentContractCode;
  message: string;
}

export interface ComponentContractResult {
  files: Record<string, string>;
  repaired: string[];
  diagnostics: ComponentContractDiagnostic[];
}

interface ModuleExports {
  defaultLocal: string | null;
  values: Set<string>;
  types: Set<string>;
  reExports: Array<{ imported: string; exported: string; source: string }>;
  starSources: string[];
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inspectExports(source: string): ModuleExports {
  const values = new Set<string>();
  const types = new Set<string>();
  const reExports: ModuleExports['reExports'] = [];
  const starSources: string[] = [];

  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    values.add(match[1]);
  }
  for (const match of source.matchAll(/export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/g)) {
    types.add(match[1]);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}(?:\s+from\s+['"]([^'"]+)['"])?/g)) {
    for (const rawPart of match[1].split(',').map((part) => part.trim()).filter(Boolean)) {
      const typeOnly = /^type\s+/.test(rawPart);
      const part = rawPart.replace(/^type\s+/, '');
      const [imported, alias] = part.split(/\s+as\s+/).map((token) => token.trim());
      if (!imported) continue;
      const exported = alias || imported;
      if (match[2]) reExports.push({ imported, exported, source: match[2] });
      else if (typeOnly) types.add(exported);
      else values.add(exported);
    }
  }
  for (const match of source.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)) {
    starSources.push(match[1]);
  }

  const defaultLocal =
    source.match(/export\s+default\s+(?:function|class)\s+([A-Za-z_$][\w$]*)/)?.[1] ??
    source.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/)?.[1] ??
    (source.match(/export\s+default\s+(?:function|class)\b/) ? 'default' : null);
  return { defaultLocal, values, types, reExports, starSources };
}

function jsxUses(source: string, local: string): boolean {
  return new RegExp(`<${escapeRe(local)}(?:[.\\s/>])`).test(source);
}

function namespaceMembers(source: string, local: string): string[] {
  const names = new Set<string>();
  const pattern = new RegExp(`<${escapeRe(local)}\\.([A-Z][A-Za-z0-9_$]*)(?:\\s|/|>)`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) names.add(match[1]);
  return [...names];
}

function hasRenderableDeclaration(source: string, name: string): boolean {
  if (name === 'default') return true;
  const escaped = escapeRe(name);
  if (new RegExp(`(?:function|class)\\s+${escaped}\\b`).test(source)) return true;
  const initializer = source.match(new RegExp(`(?:const|let|var)\\s+${escaped}(?:\\s*:[^=;\\n]+)?\\s*=\\s*([^;\\n]+)`))?.[1]?.trim();
  // A value export may be produced by a wrapper, HOC, imported alias, or
  // factory that static analysis cannot prove. Reject only values that are
  // unambiguously invalid React element types; leave opaque values to runtime.
  if (!initializer) return true;
  if (/^(?:undefined|null|false|true|['"`]|-?\d|\[|\{)/.test(initializer)) return false;
  return true;
}

function resolveExport(
  files: Record<string, string>,
  targetPath: string,
  exportName: string,
  seen = new Set<string>(),
): { found: boolean; renderable: boolean; available: string[] } {
  const key = `${targetPath}#${exportName}`;
  if (seen.has(key)) return { found: false, renderable: false, available: [] };
  seen.add(key);
  const source = files[targetPath];
  if (typeof source !== 'string') return { found: false, renderable: false, available: [] };
  const info = inspectExports(source);
  const available = [...info.values, ...(info.defaultLocal ? ['default'] : [])];

  if (exportName === 'default' && info.defaultLocal) {
    return { found: true, renderable: hasRenderableDeclaration(source, info.defaultLocal), available };
  }
  if (info.values.has(exportName)) {
    return { found: true, renderable: hasRenderableDeclaration(source, exportName), available };
  }
  const paths = new Set(Object.keys(files));
  for (const forwarded of info.reExports.filter((item) => item.exported === exportName)) {
    const next = resolveCandidateModule(targetPath, forwarded.source, paths);
    // Package re-exports are opaque to the VFS graph but are real runtime
    // values (Radix/Lucide/framer facades rely on this pattern).
    if (!next && !forwarded.source.startsWith('.') && !forwarded.source.startsWith('/') && !forwarded.source.startsWith('@/')) {
      return { found: true, renderable: true, available };
    }
    if (!next) continue;
    const result = resolveExport(files, next, forwarded.imported, seen);
    if (result.found) return { ...result, available };
  }
  for (const sourcePath of info.starSources) {
    const next = resolveCandidateModule(targetPath, sourcePath, paths);
    if (!next && !sourcePath.startsWith('.') && !sourcePath.startsWith('/') && !sourcePath.startsWith('@/')) {
      return { found: true, renderable: true, available };
    }
    if (!next) continue;
    const result = resolveExport(files, next, exportName, seen);
    if (result.found) return { ...result, available };
  }
  return { found: false, renderable: false, available };
}

function appendComponentExport(source: string, exportName: string, asDefault: boolean): string {
  const safeName = /^[A-Za-z_$][\w$]*$/.test(exportName) ? exportName : 'RecoveredComponent';
  const declaration = `function ${safeName}(props: any) {\n  const { children, asChild: _asChild, ...rest } = props || {};\n  return <div {...rest}>{children}</div>;\n}`;
  const exported = asDefault ? `export default ${declaration}` : `export ${declaration}`;
  return `${source.trimEnd()}\n\n// @unison-synthesized component-contract repair\n${exported}\n`;
}

export function analyzeComponentContracts(
  inputFiles: Record<string, string>,
  options: { repair?: boolean; importerPaths?: Set<string> } = {},
): ComponentContractResult {
  const files = { ...inputFiles };
  const repaired = new Set<string>();

  if (options.repair) {
    const paths = new Set(Object.keys(files));
    for (const [importerPath, source] of Object.entries({ ...files })) {
      if (!JSX_FILE.test(importerPath) || (options.importerPaths && !options.importerPaths.has(importerPath))) continue;
      for (const imported of parseImportStatements(source)) {
        if (imported.typeOnly || !(imported.source.startsWith('.') || imported.source.startsWith('/') || imported.source.startsWith('@/'))) continue;
        const targetPath = resolveCandidateModule(importerPath, imported.source, paths);
        if (!targetPath || !JSX_FILE.test(targetPath)) continue;

        if (imported.defaultName && jsxUses(source, imported.defaultName)) {
          const contract = resolveExport(files, targetPath, 'default');
          if (!contract.found) {
            const target = files[targetPath];
            const exports = inspectExports(target);
            if (exports.values.has(imported.defaultName) && hasRenderableDeclaration(target, imported.defaultName)) {
              files[targetPath] = `${target.trimEnd()}\n\nexport default ${imported.defaultName};\n`;
            } else {
              files[targetPath] = appendComponentExport(target, imported.defaultName, true);
            }
            repaired.add(targetPath);
          }
        }
        for (const named of imported.named) {
          if (named.typeOnly || !jsxUses(source, named.local)) continue;
          const contract = resolveExport(files, targetPath, named.imported);
          if (!contract.found) {
            files[targetPath] = appendComponentExport(files[targetPath], named.imported, false);
            repaired.add(targetPath);
          }
        }
        if (imported.namespaceName) {
          for (const member of namespaceMembers(source, imported.namespaceName)) {
            const contract = resolveExport(files, targetPath, member);
            if (!contract.found) {
              files[targetPath] = appendComponentExport(files[targetPath], member, false);
              repaired.add(targetPath);
            }
          }
        }
      }
    }
  }

  const diagnostics: ComponentContractDiagnostic[] = [];
  const paths = new Set(Object.keys(files));
  for (const [importerPath, source] of Object.entries(files)) {
    if (!JSX_FILE.test(importerPath) || (options.importerPaths && !options.importerPaths.has(importerPath))) continue;
    for (const imported of parseImportStatements(source)) {
      if (imported.typeOnly || !(imported.source.startsWith('.') || imported.source.startsWith('/') || imported.source.startsWith('@/'))) continue;
      const targetPath = resolveCandidateModule(importerPath, imported.source, paths);
      if (!targetPath || !CODE_FILE.test(targetPath)) continue;
      const checks: Array<{ local: string; exported: string; code: ComponentContractCode }> = [];
      if (imported.defaultName && jsxUses(source, imported.defaultName)) {
        checks.push({ local: imported.defaultName, exported: 'default', code: 'MISSING_DEFAULT_COMPONENT_EXPORT' });
      }
      for (const named of imported.named) {
        if (!named.typeOnly && jsxUses(source, named.local)) {
          checks.push({ local: named.local, exported: named.imported, code: 'MISSING_NAMED_COMPONENT_EXPORT' });
        }
      }
      if (imported.namespaceName) {
        for (const member of namespaceMembers(source, imported.namespaceName)) {
          checks.push({ local: `${imported.namespaceName}.${member}`, exported: member, code: 'MISSING_NAMESPACE_COMPONENT_EXPORT' });
        }
      }
      for (const check of checks) {
        const contract = resolveExport(files, targetPath, check.exported);
        if (contract.found && contract.renderable) continue;
        const code = contract.found ? 'NON_RENDERABLE_COMPONENT_EXPORT' : check.code;
        diagnostics.push({
          importerPath,
          localName: check.local,
          specifier: imported.source,
          targetPath,
          exportName: check.exported,
          availableExports: contract.available,
          code,
          message: `${importerPath} renders <${check.local}> from '${imported.source}', but ${targetPath} ${contract.found ? `exports '${check.exported}' as a non-renderable value` : `does not provide the '${check.exported}' value export`} (available: ${contract.available.join(', ') || 'none'}).`,
        });
      }
    }
  }

  return { files, repaired: [...repaired], diagnostics };
}