/**
 * Web Builder — AI code helpers.
 *
 * Extracted from WebBuilder.tsx (Pass 5 decomposition). Pure functions only:
 *  - HTML/JSX style-block preservation and inline class restoration used to
 *    guard AI-generated edits from silently rewriting template visual identity.
 *  - validateAICodeChange severity heuristics used by the AI apply pipeline.
 *
 * Also owns the small VFS route-state helpers (hasNonEmptyVfsFiles,
 * mergeRouteStatePreservingFiles) that were inline in WebBuilder.
 */

export interface CodeValidationResult {
  isValid: boolean;
  warnings: string[];
  severity: 'ok' | 'warning' | 'critical';
  sectionDiff: number;
  contentLoss: number;
}

/** Extract all <style> blocks from HTML source. */
export function extractStyleBlocks(html: string): string[] {
  const regex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  return html.match(regex) || [];
}

/**
 * Preserve the original template's <style> blocks in the AI-generated output.
 * Prevents the AI from silently rewriting CSS custom properties, color
 * palettes, font stacks, and animation keyframes that define the template's
 * visual identity.
 */
export function preserveStyleBlocks(originalCode: string, aiCode: string): string {
  const origStyles = extractStyleBlocks(originalCode);
  const aiStyles = extractStyleBlocks(aiCode);

  if (origStyles.length === 0) return aiCode;

  let result = aiCode;
  if (aiStyles.length === origStyles.length) {
    for (let i = 0; i < origStyles.length; i++) {
      result = result.replace(aiStyles[i], origStyles[i]);
    }
  } else if (aiStyles.length < origStyles.length) {
    for (let i = 0; i < aiStyles.length; i++) {
      result = result.replace(aiStyles[i], origStyles[i]);
    }
    const remaining = origStyles.slice(aiStyles.length).join('\n');
    const headClose = result.indexOf('</head>');
    if (headClose !== -1) {
      result = result.slice(0, headClose) + '\n' + remaining + '\n' + result.slice(headClose);
    }
  } else {
    for (let i = 0; i < origStyles.length; i++) {
      result = result.replace(aiStyles[i], origStyles[i]);
    }
    for (let i = origStyles.length; i < aiStyles.length; i++) {
      if (!aiStyles[i].includes('ai-style-overrides')) {
        result = result.replace(aiStyles[i], '');
      }
    }
  }

  return result;
}

/**
 * Preserve inline class attributes from the original template on elements
 * the AI should not have modified. Compares by tag + id/data-section and
 * restores the original class attribute when the AI changed it without a
 * corresponding structural change.
 */
export function preserveInlineClasses(originalCode: string, aiCode: string): string {
  const classMap = new Map<string, string>();
  const classRegex = /<(\w+)\s+[^>]*?((?:id|data-section)="[^"]*")[^>]*?class="([^"]*)"/gi;
  let match: RegExpExecArray | null;

  while ((match = classRegex.exec(originalCode)) !== null) {
    const key = `${match[1].toLowerCase()}|${match[2]}`;
    classMap.set(key, match[3]);
  }

  if (classMap.size === 0) return aiCode;

  let result = aiCode;
  const aiClassRegex = /<(\w+)\s+[^>]*?((?:id|data-section)="[^"]*")[^>]*?class="([^"]*)"/gi;
  const replacements: Array<{ from: string; to: string }> = [];

  while ((match = aiClassRegex.exec(aiCode)) !== null) {
    const key = `${match[1].toLowerCase()}|${match[2]}`;
    const origClass = classMap.get(key);
    if (origClass && origClass !== match[3]) {
      replacements.push({
        from: match[0],
        to: match[0].replace(`class="${match[3]}"`, `class="${origClass}"`),
      });
    }
  }

  for (const rep of replacements) {
    result = result.replace(rep.from, rep.to);
  }

  return result;
}

/** Structural severity heuristics for AI diffs applied to template source. */
export function validateAICodeChange(originalCode: string, newCode: string): CodeValidationResult {
  const warnings: string[] = [];

  if (!originalCode || !newCode) {
    return { isValid: true, warnings: [], severity: 'ok', sectionDiff: 0, contentLoss: 0 };
  }

  const origSections = (originalCode.match(/<section/gi) || []).length;
  const newSections = (newCode.match(/<section/gi) || []).length;
  const sectionDiff = origSections - newSections;

  if (sectionDiff > 0) {
    warnings.push(`${sectionDiff} section(s) removed from template`);
  }

  const origHasHeader = /<header/i.test(originalCode);
  const newHasHeader = /<header/i.test(newCode);
  const origHasFooter = /<footer/i.test(originalCode);
  const newHasFooter = /<footer/i.test(newCode);

  if (origHasHeader && !newHasHeader) warnings.push('Header section was removed');
  if (origHasFooter && !newHasFooter) warnings.push('Footer section was removed');

  const origLength = originalCode.length;
  const newLength = newCode.length;
  const contentLoss = origLength > 0 ? Math.round(((origLength - newLength) / origLength) * 100) : 0;

  if (contentLoss > 30) {
    warnings.push(`Template content reduced by ${contentLoss}% - possible data loss`);
  }

  const origScripts = (originalCode.match(/<script/gi) || []).length;
  const newScripts = (newCode.match(/<script/gi) || []).length;
  if (origScripts > newScripts) {
    warnings.push(`${origScripts - newScripts} script block(s) removed - functionality may be broken`);
  }

  const origStyles = (originalCode.match(/<style/gi) || []).length;
  const newStyles = (newCode.match(/<style/gi) || []).length;
  if (origStyles > newStyles) {
    warnings.push(`${origStyles - newStyles} style block(s) removed - styling may be affected`);
  }

  let severity: 'ok' | 'warning' | 'critical' = 'ok';
  if (warnings.length > 0) severity = 'warning';
  if (
    sectionDiff > 2 ||
    contentLoss > 50 ||
    (!newHasHeader && origHasHeader) ||
    (!newHasFooter && origHasFooter)
  ) {
    severity = 'critical';
  }

  return { isValid: severity !== 'critical', warnings, severity, sectionDiff, contentLoss };
}

/** True when the VFS file map contains at least one entry. */
export function hasNonEmptyVfsFiles(files?: Record<string, string>): boolean {
  return !!files && Object.keys(files).length > 0;
}

/**
 * Merge multiple route-state fragments while preserving the last non-empty
 * vfsFiles map. Later states override earlier ones for every field except
 * vfsFiles, where the most recent non-empty snapshot wins.
 */
export function mergeRouteStatePreservingFiles<T extends { vfsFiles?: Record<string, string> }>(
  ...states: Array<T | null | undefined>
): T | null {
  const present = states.filter(Boolean) as T[];
  if (present.length === 0) return null;
  const merged = Object.assign({}, ...present) as T;
  for (let i = present.length - 1; i >= 0; i--) {
    if (hasNonEmptyVfsFiles(present[i].vfsFiles)) {
      merged.vfsFiles = present[i].vfsFiles;
      break;
    }
  }
  return merged;
}
