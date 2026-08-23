/**
 * Deterministic companion-module synthesis.
 *
 * Step 3 of the single unresolved-module ladder (see moduleClosureRepair.ts).
 * When a generated page imports a companion module that was never authored and
 * the module cannot be resolved or recovered, we derive a REAL module from the
 * way the importing file actually uses it — never an empty component.
 *
 * Hard rules:
 *  - Only runs for bindings that are genuinely used (dead imports are dropped
 *    by the ladder instead).
 *  - Renders `children` and known textual/visual props so the section stays
 *    visible instead of silently collapsing.
 *  - Every emitted module carries the SYNTHESIZED_MODULE_STAMP so the launch
 *    journey can report it as a completion gap.
 */

export const SYNTHESIZED_MODULE_STAMP = '// @unison-synthesized';

export interface SynthesizedModule {
  /** Absolute VFS path the module should be written to. */
  path: string;
  content: string;
  /** Exported bindings this module provides. */
  exports: string[];
}

export interface ImportBinding {
  /** Local identifier bound in the importing file. */
  local: string;
  /** `default`, `*`, or the imported name. */
  imported: string;
}

const TEXT_PROP_KEYS = ['title', 'heading', 'headline', 'label', 'name', 'eyebrow'];
const BODY_PROP_KEYS = ['description', 'body', 'subtitle', 'subheading', 'text', 'copy'];

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parse the import statement(s) for `specifier` into their bound locals. */
export function parseImportBindings(source: string, specifier: string): ImportBinding[] {
  const escaped = escapeForRegExp(specifier);
  const re = new RegExp(
    `import\\s+([\\s\\S]*?)\\s+from\\s+['"]${escaped}['"]`,
    'g',
  );
  const bindings: ImportBinding[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const clause = match[1].trim();
    const named = clause.match(/\{([\s\S]*?)\}/)?.[1] ?? '';
    const head = clause.replace(/\{[\s\S]*?\}/, '').replace(/,\s*$/, '').trim();

    if (head.startsWith('* as ')) {
      bindings.push({ local: head.slice(5).trim(), imported: '*' });
    } else if (head) {
      bindings.push({ local: head, imported: 'default' });
    }

    for (const part of named.split(',')) {
      const token = part.trim();
      if (!token) continue;
      const [imported, alias] = token.split(/\s+as\s+/).map((s) => s.trim());
      if (!imported) continue;
      bindings.push({ local: alias || imported, imported });
    }
  }
  return bindings;
}

/** True when the local identifier is referenced outside its import statement. */
export function isBindingUsed(source: string, local: string, specifier: string): boolean {
  const escapedSpec = escapeForRegExp(specifier);
  const withoutImports = source.replace(
    new RegExp(`import\\s+[\\s\\S]*?from\\s+['"]${escapedSpec}['"];?`, 'g'),
    '',
  );
  return new RegExp(`(?<![.\\w$])${escapeForRegExp(local)}\\b`).test(withoutImports);
}

/** True when the identifier is used as a JSX tag anywhere in the source. */
export function isUsedAsComponent(source: string, local: string): boolean {
  const escaped = escapeForRegExp(local);
  return (
    new RegExp(`<${escaped}(?![\\w$])`).test(source) ||
    new RegExp(`<${escaped}\\.`).test(source)
  );
}

/** Prop names passed at every JSX call site of `local`. */
export function collectJsxProps(source: string, local: string): string[] {
  const escaped = escapeForRegExp(local);
  const re = new RegExp(`<${escaped}(?![\\w$])([^>]*?)/?>`, 'g');
  const props = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const attrRe = /([A-Za-z_][\w$]*)\s*=/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(match[1])) !== null) props.add(attr[1]);
  }
  return [...props];
}

/** True when the JSX usage wraps children (`<X> ... </X>`). */
export function hasJsxChildren(source: string, local: string): boolean {
  const escaped = escapeForRegExp(local);
  return new RegExp(`<${escaped}(?![\\w$])[^>]*?>[\\s\\S]*?</${escaped}>`).test(source);
}

function componentBody(displayName: string, props: string[], withChildren: boolean): string {
  const textProp = props.find((p) => TEXT_PROP_KEYS.includes(p));
  const bodyProp = props.find((p) => BODY_PROP_KEYS.includes(p));
  const rest = props.filter((p) => p !== textProp && p !== bodyProp && p !== 'children' && p !== 'className');

  const lines: string[] = [];
  lines.push(`      {${textProp ? `props.${textProp} ?? ` : ''}undefined ? null : null}`);

  const rendered: string[] = [];
  if (textProp) {
    rendered.push(
      `      {props.${textProp} ? <h2 className="text-2xl font-semibold tracking-tight">{props.${textProp}}</h2> : null}`,
    );
  }
  if (bodyProp) {
    rendered.push(
      `      {props.${bodyProp} ? <p className="text-muted-foreground max-w-prose">{props.${bodyProp}}</p> : null}`,
    );
  }
  for (const prop of rest) {
    rendered.push(
      `      {typeof props.${prop} === 'string' || typeof props.${prop} === 'number' ? <span className="text-sm text-muted-foreground">{props.${prop}}</span> : null}`,
    );
  }
  if (withChildren) rendered.push('      {props.children}');
  if (rendered.length === 0) rendered.push('      {props.children ?? null}');

  return [
    `export function ${displayName}(props: ${displayName}Props) {`,
    `  return (`,
    `    <div className="flex flex-col gap-3" data-unison-synthesized="${displayName}">`,
    ...rendered,
    `    </div>`,
    `  );`,
    `}`,
  ].join('\n');
}

export interface SynthesisRequest {
  /** File that imports the missing module. */
  importerPath: string;
  importerSource: string;
  /** The unresolved relative specifier as written. */
  specifier: string;
  /** Absolute path the synthesized module should occupy. */
  targetPath: string;
}

/**
 * Build a module that satisfies every used binding of an unresolved import.
 * Returns null when nothing is actually used (the ladder drops that import).
 */
export function synthesizeCompanionModule(request: SynthesisRequest): SynthesizedModule | null {
  const { importerSource, specifier, targetPath } = request;
  const bindings = parseImportBindings(importerSource, specifier).filter((b) =>
    isBindingUsed(importerSource, b.local, specifier),
  );
  if (bindings.length === 0) return null;

  const isTsx = /\.(tsx|jsx)$/i.test(targetPath);
  const header = [
    SYNTHESIZED_MODULE_STAMP,
    `// Derived from usage in ${request.importerPath} ("${specifier}").`,
    '// Replace with authored content — regeneration is safe.',
  ];

  const parts: string[] = [];
  const exportNames: string[] = [];
  let usesReactNode = false;

  for (const binding of bindings) {
    const asComponent = isTsx && isUsedAsComponent(importerSource, binding.local);
    const exportName = binding.imported === 'default' || binding.imported === '*'
      ? binding.local
      : binding.imported;

    if (asComponent) {
      const props = collectJsxProps(importerSource, binding.local);
      const withChildren = hasJsxChildren(importerSource, binding.local);
      usesReactNode = true;
      const propLines = [
        ...props
          .filter((p) => p !== 'children' && p !== 'className')
          .map((p) => `  ${p}?: unknown;`),
        '  className?: string;',
        '  children?: ReactNode;',
      ];
      parts.push(
        `export interface ${exportName}Props {\n${propLines.join('\n')}\n  [key: string]: unknown;\n}`,
      );
      parts.push(componentBody(exportName, props, withChildren));
    } else {
      // Non-component export: emit an empty-safe, typed value.
      const looksLikeCollection = new RegExp(
        `${escapeForRegExp(binding.local)}\\s*(?:\\.map\\b|\\.length\\b|\\[)`,
      ).test(importerSource);
      const looksLikeFunction = new RegExp(`${escapeForRegExp(binding.local)}\\s*\\(`).test(
        importerSource,
      );
      if (looksLikeFunction) {
        parts.push(`export function ${exportName}(..._args: unknown[]): undefined {\n  return undefined;\n}`);
      } else if (looksLikeCollection) {
        parts.push(`export const ${exportName}: unknown[] = [];`);
      } else {
        parts.push(`export const ${exportName}: Record<string, unknown> = {};`);
      }
    }

    exportNames.push(exportName);

    if (binding.imported === 'default') {
      parts.push(`export default ${exportName};`);
      exportNames.push('default');
    }
  }

  const imports = usesReactNode ? [`import type { ReactNode } from 'react';`] : [];
  const content = [...header, '', ...imports, imports.length ? '' : null, ...parts, '']
    .filter((line): line is string => line !== null)
    .join('\n');

  return { path: targetPath, content, exports: exportNames };
}
