import { selectIndustryIntentForIsolatedPage } from '@/services/wizardPageCompletionRecovery';
import { getWizardPageRoleInstruction, normalizeWizardPageRole } from '@/services/wizardPageQuality';

export interface WizardFirstAttemptPage {
  path: string;
  title?: string;
  role?: string;
  route?: string;
}

interface WizardSeedWithCanonicalPages {
  canonical: {
    pages: ReadonlyArray<{ path: string; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function normalizeFilePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Scope the authoritative WizardSeed to the files requested by one Lane B
 * authoring turn. This keeps the system-level "one file per canonical page"
 * instruction consistent with the user-level batch instruction.
 */
export function scopeWizardSeedToPageFiles<T extends WizardSeedWithCanonicalPages>(
  wizardSeed: T,
  targetPaths: readonly string[],
): T {
  const targets = new Set(targetPaths.map(normalizeFilePath));
  return {
    ...wizardSeed,
    canonical: {
      ...wizardSeed.canonical,
      pages: wizardSeed.canonical.pages.filter((page) => targets.has(normalizeFilePath(page.path))),
    },
  } as T;
}

/**
 * Render the exact client-side acceptance rules into the first model turn.
 * The authoring prompt and deterministic validator must never disagree about
 * page count, body-region minimums, imports, or industry intent wiring.
 */
export function buildWizardFirstAttemptContract(input: {
  pages: readonly WizardFirstAttemptPage[];
  industry: string;
  homeSectionOrder: readonly string[];
  approvedLocalImports: readonly string[];
}): string {
  const exactPaths = input.pages.map((page) => normalizeFilePath(page.path));
  const pageMatrix = input.pages.map((page) => {
    const normalizedRole = normalizeWizardPageRole(page.role);
    const minimumRegions = normalizedRole === 'home' ? 5 : 4;
    const roleRequirement = getWizardPageRoleInstruction(normalizedRole);
    const industryIntent = selectIndustryIntentForIsolatedPage(input.industry, normalizedRole);
    return [
      `- ${normalizeFilePath(page.path)} | ${page.title || 'Page'} | role=${normalizedRole}`,
      `  Minimum: ${minimumRegions} literal body regions using <section>, <article>, or <aside>; 1200+ authored TSX characters.`,
      normalizedRole === 'home' && input.homeSectionOrder.length > 0
        ? `  Home-only section order: ${input.homeSectionOrder.join(' -> ')}.`
        : '',
      roleRequirement ? `  Role evidence: ${roleRequirement}` : '',
      industryIntent
        ? `  Required real action: data-ut-intent="${industryIntent}" on an appropriate interactive control.`
        : '  Required real action: use an appropriate canonical data-ut-intent.',
    ].filter(Boolean).join('\n');
  });

  return [
    '── LANE B FIRST-PASS COMPILATION CONTRACT (HARD) ──',
    `Return exactly these file keys and no others: ${exactPaths.join(', ')}.`,
    'Every value must be a complete standalone React TypeScript page that parses as TSX before it is returned.',
    'Balance every JSX tag, brace, bracket, parenthesis, quote, and template literal. Do not use JavaScript regular-expression literals in generated pages.',
    'This is Vite + React Router. Never import from next, next/*, gatsby, remix, or another application framework; use plain <img alt="..."> for images.',
    'Every @/unison/ui import must exactly match one of the snapshot-approved local modules. Form controls come from @/unison/ui/form-fields or @/unison/ui, and Radix primitives come only from @/unison/ui/radix/<primitive>.',
    `Snapshot-approved local modules: ${input.approvedLocalImports.join(', ')}.`,
    'Do not emit App.tsx, shared navigation/footer chrome, index.css, configuration, package files, or snapshot-owned UI foundation files.',
    'Before returning JSON, silently self-check each requested key for parseable TSX, approved imports, accessible image alt text, four-or-more role-valid body regions (five for Home), and canonical intent wiring.',
    '',
    'PAGE ACCEPTANCE MATRIX:',
    ...pageMatrix,
  ].join('\n');
}
