/**
 * aiCodeValidation — preserve template invariants when AI rewrites HTML.
 *
 * Extracted from WebBuilder.tsx (Phase C). Pure functions, no React deps.
 * Used after an AI code patch returns to:
 *   1. Restore the original <style> blocks (visual identity guard).
 *   2. Restore inline class attributes on identifiable elements.
 *   3. Surface destructive-change warnings (sections / header / footer / scripts).
 */

export interface CodeValidationResult {
  isValid: boolean;
  warnings: string[];
  severity: 'ok' | 'warning' | 'critical';
  sectionDiff: number;
  contentLoss: number;
}

export function extractStyleBlocks(html: string): string[] {
  const regex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  return html.match(regex) || [];
}

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

export function validateAICodeChange(
  originalCode: string,
  newCode: string,
): CodeValidationResult {
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
    warnings.push(
      `${origScripts - newScripts} script block(s) removed - functionality may be broken`,
    );
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

  return {
    isValid: severity !== 'critical',
    warnings,
    severity,
    sectionDiff,
    contentLoss,
  };
}
