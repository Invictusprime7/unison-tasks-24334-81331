import { INDUSTRY_INTENT_PROFILES } from '@/platform/core/industryIntentProfiles';

const INTENT_LEVEL_RANK = {
  required: 0,
  primary: 1,
  secondary: 2,
  optional: 3,
  forbidden: 4,
} as const;

const PAGE_ROLE_ALIASES: Record<string, string> = {
  service: 'services',
  plans: 'pricing',
  plan: 'pricing',
  questions: 'faq',
};

function normalizePageRole(pageRole: string | undefined): string {
  const normalized = (pageRole || '').trim().toLowerCase();
  return PAGE_ROLE_ALIASES[normalized] || normalized;
}

/** Pick one canonical, non-forbidden industry action for an isolated page. */
export function selectIndustryIntentForIsolatedPage(
  industry: string | undefined,
  pageRole: string | undefined,
): string | undefined {
  if (!industry) return undefined;
  const profile = INDUSTRY_INTENT_PROFILES[industry];
  if (!profile) return undefined;

  const normalizedRole = normalizePageRole(pageRole);
  const candidates = Object.entries(profile.intents || {})
    .filter(([intent, spec]) => intent !== 'nav.goto' && spec && spec.level !== 'forbidden')
    .sort(([, left], [, right]) => (
      INTENT_LEVEL_RANK[left!.level] - INTENT_LEVEL_RANK[right!.level]
    ));

  const roleMatch = candidates.find(([, spec]) =>
    spec!.synthesize?.some((placement) => normalizePageRole(placement.pageRole) === normalizedRole),
  );
  if (roleMatch) return roleMatch[0];

  return candidates.find(([, spec]) => spec!.level === 'required')?.[0]
    || candidates.find(([, spec]) => spec!.level === 'primary')?.[0]
    || candidates[0]?.[0];
}

/** Malformed TSX must not become repair context for the next model response. */
export function isSyntaxCompletionFailure(reason: string | undefined): boolean {
  return Boolean(reason && /Unexpected token|Unterminated|SyntaxError|parse|expected ["']?[,)}\]]/i.test(reason));
}