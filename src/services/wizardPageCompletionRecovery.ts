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

interface FaqIndustryLanguage {
  offering: string;
  decision: string;
  preparation: string;
  timing: string;
  changePolicy: string;
  trust: string;
  vocabulary: readonly string[];
}

const FAQ_INDUSTRY_LANGUAGE: Record<string, FaqIndustryLanguage> = {
  agency: {
    offering: 'strategy, creative, and delivery engagements',
    decision: 'the right engagement scope and proposal',
    preparation: 'your goals, audience, current challenges, and any useful brand or performance context',
    timing: 'after a consultation confirms scope, priorities, and the team required',
    changePolicy: 'Scope or timing changes are reviewed together and documented before delivery continues',
    trust: 'clear strategy, accountable communication, and measurable client results',
    vocabulary: ['strategy', 'proposal', 'consultation'],
  },
  salon: {
    offering: 'salon services, treatments, and appointments',
    decision: 'the right stylist, service, and appointment length',
    preparation: 'your hair goals, service history, inspiration, and any timing constraints',
    timing: 'when an available stylist and appointment time are confirmed',
    changePolicy: 'Appointment changes should be requested as early as possible so the time can be offered to another guest',
    trust: 'thoughtful consultations, experienced stylists, and transparent service recommendations',
    vocabulary: ['salon', 'stylist', 'appointment'],
  },
  coaching: {
    offering: 'coaching programs, sessions, and support',
    decision: 'the program or session format that best fits your goals',
    preparation: 'the outcome you want, obstacles you are facing, and what meaningful progress would look like',
    timing: 'after a discovery call confirms fit, focus, and session availability',
    changePolicy: 'Session changes follow the booking policy shared when your coaching program is confirmed',
    trust: 'a practical framework, focused sessions, and progress grounded in your goals',
    vocabulary: ['coaching', 'session', 'discovery call'],
  },
  restaurant: {
    offering: 'dining, menu, and reservation experiences',
    decision: 'the right reservation time, table, and menu accommodations',
    preparation: 'your party size, preferred time, dietary needs, and any special occasion details',
    timing: 'when the restaurant confirms table availability for your party',
    changePolicy: 'Reservation changes depend on dining-room availability and should be requested before arrival',
    trust: 'careful hospitality, a considered menu, and clear reservation guidance',
    vocabulary: ['menu', 'reservation', 'dining'],
  },
  saas: {
    offering: 'platform features, integrations, workflows, and plans',
    decision: 'the right product plan, workflow, and integration approach',
    preparation: 'your team size, current workflow, required integrations, security needs, and desired outcome',
    timing: 'after the product requirements, plan, and onboarding path are confirmed',
    changePolicy: 'Plan and account changes follow the billing and subscription terms shown before confirmation',
    trust: 'clear product guidance, transparent pricing, and practical onboarding support',
    vocabulary: ['platform', 'integration', 'workflow'],
  },
  ecommerce: {
    offering: 'products, orders, shipping, and returns',
    decision: 'the right product, option, and delivery method',
    preparation: 'the product details, sizing or compatibility needs, and delivery destination',
    timing: 'after checkout is complete and the order is confirmed for fulfillment',
    changePolicy: 'Order changes, cancellations, and returns follow the policy shown during checkout',
    trust: 'clear product information, secure checkout, and visible shipping and returns guidance',
    vocabulary: ['product', 'checkout', 'returns'],
  },
  store: {
    offering: 'products, orders, shipping, and returns',
    decision: 'the right product, option, and delivery method',
    preparation: 'the product details, sizing or compatibility needs, and delivery destination',
    timing: 'after checkout is complete and the order is confirmed for fulfillment',
    changePolicy: 'Order changes, cancellations, and returns follow the policy shown during checkout',
    trust: 'clear product information, secure checkout, and visible shipping and returns guidance',
    vocabulary: ['product', 'checkout', 'returns'],
  },
  nonprofit: {
    offering: 'programs, donations, volunteering, and community support',
    decision: 'the most useful way to support the mission or participate in a program',
    preparation: 'the program, cause, volunteer opportunity, or donation question you want to discuss',
    timing: 'when the appropriate program or community team member confirms the next step',
    changePolicy: 'Donation and volunteer changes are handled according to the confirmation details you receive',
    trust: 'transparent impact, responsible stewardship, and direct community communication',
    vocabulary: ['mission', 'donation', 'volunteer'],
  },
  portfolio: {
    offering: 'creative projects, commissions, and collaborations',
    decision: 'the right project scope, creative direction, and collaboration format',
    preparation: 'your brief, intended audience, references, timing, and expected deliverables',
    timing: 'after an inquiry confirms creative fit, availability, and project scope',
    changePolicy: 'Creative or delivery changes are reviewed against the agreed project scope before work continues',
    trust: 'a clear process, considered craft, and open collaboration from inquiry through delivery',
    vocabulary: ['project', 'portfolio', 'inquiry'],
  },
  photography: {
    offering: 'photography sessions, packages, galleries, and delivery',
    decision: 'the right session, package, location, and coverage',
    preparation: 'your date, location, preferred style, group size, and the moments that matter most',
    timing: 'when the photographer confirms session availability and package details',
    changePolicy: 'Session changes depend on availability, location, and the booking terms in your confirmation',
    trust: 'careful preparation, experienced direction, and a clear gallery delivery process',
    vocabulary: ['photography', 'session', 'gallery'],
  },
  'real-estate': {
    offering: 'property searches, listings, valuations, and showings',
    decision: 'the right property strategy, showing plan, or listing approach',
    preparation: 'your preferred neighborhoods, budget, timeline, property needs, or current listing details',
    timing: 'when the agent confirms availability, property access, and the appropriate next step',
    changePolicy: 'Showing and consultation changes depend on agent and property availability',
    trust: 'local market knowledge, responsive guidance, and transparent property communication',
    vocabulary: ['property', 'listing', 'showing'],
  },
  'local-service': {
    offering: 'local services, estimates, repairs, and installations',
    decision: 'the right service, estimate, and visit window',
    preparation: 'the issue, property location, relevant measurements or photos, and your preferred timing',
    timing: 'after the service area, scope, technician availability, and estimate are confirmed',
    changePolicy: 'Visit changes depend on technician availability and should be requested before dispatch',
    trust: 'clear estimates, qualified service, and direct communication before work begins',
    vocabulary: ['estimate', 'service area', 'technician'],
  },
  contractor: {
    offering: 'construction, remodeling, repair, and installation projects',
    decision: 'the right project scope, estimate, crew, and schedule',
    preparation: 'your project goals, property details, measurements, photos, budget range, and desired timeline',
    timing: 'after an inspection or consultation confirms scope, materials, permits, and crew availability',
    changePolicy: 'Project changes are documented and approved before they affect the estimate or schedule',
    trust: 'clear estimates, qualified crews, and accountable project communication',
    vocabulary: ['project', 'estimate', 'inspection'],
  },
};

const DEFAULT_FAQ_LANGUAGE: FaqIndustryLanguage = {
  offering: 'services, options, scheduling, and support',
  decision: 'the right option and next step for your needs',
  preparation: 'your goals, questions, preferred timing, and any context that can help the team guide you',
  timing: 'after the team confirms fit, availability, and the next step',
  changePolicy: 'Changes are reviewed according to the confirmation and policy details provided to you',
  trust: 'clear recommendations, transparent expectations, and responsive support',
  vocabulary: ['service', 'consultation', 'support'],
};

export interface StructuredWizardFaqPageInput {
  filePath: string;
  businessName: string;
  industry: string;
  intent: string;
}

export interface StructuredWizardFaqPageResult {
  filePath: string;
  source: string;
}

function normalizePageRole(pageRole: string | undefined): string {
  const normalized = (pageRole || '').trim().toLowerCase();
  return PAGE_ROLE_ALIASES[normalized] || normalized;
}

function normalizeIndustry(industry: string): string {
  const normalized = industry.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (normalized === 'realestate') return 'real-estate';
  return normalized;
}

function componentNameFromFilePath(filePath: string): string {
  const baseName = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.[^.]+$/, '') || 'Faq';
  const componentName = baseName
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
  return /^[A-Za-z]/.test(componentName) ? componentName : `Page${componentName}`;
}

function assertStructuredFaqInput(input: StructuredWizardFaqPageInput): void {
  if (!/\.(tsx|jsx)$/i.test(input.filePath)) {
    throw new Error(`Structured FAQ requires a TSX/JSX file path: ${input.filePath}`);
  }
  if (!input.businessName.trim()) {
    throw new Error('Structured FAQ requires a business name');
  }
  if (!/^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/i.test(input.intent)) {
    throw new Error(`Structured FAQ received an invalid canonical intent: ${input.intent}`);
  }
}

export function compileStructuredWizardFaqPage(
  input: StructuredWizardFaqPageInput,
): StructuredWizardFaqPageResult {
  assertStructuredFaqInput(input);
  const filePath = input.filePath.startsWith('/') ? input.filePath : `/${input.filePath}`;
  const businessName = input.businessName.trim();
  const language = FAQ_INDUSTRY_LANGUAGE[normalizeIndustry(input.industry)] || DEFAULT_FAQ_LANGUAGE;
  const pageData = {
    businessName,
    eyebrow: 'Questions and guidance',
    title: `Answers from ${businessName}`,
    introduction: `Explore practical answers about ${language.offering}. These details explain what to expect, how to prepare, and how to choose ${language.decision}.`,
    items: [
      {
        question: `What can I expect from ${businessName}?`,
        answer: `${businessName} begins with context, then recommends a clear next step. Expect ${language.trust}, with important decisions explained before you commit.`,
      },
      {
        question: 'How do I get started?',
        answer: `Use the action below to share what you need. The team will review your request and follow up ${language.timing}.`,
      },
      {
        question: 'What information should I provide?',
        answer: `The most useful starting details are ${language.preparation}. You do not need a perfect brief; the first conversation will clarify anything that is missing.`,
      },
      {
        question: 'How will I know which option is right for me?',
        answer: `The recommendation is based on your priorities, timing, and desired outcome. ${businessName} will explain tradeoffs so you can choose ${language.decision} without guessing.`,
      },
      {
        question: 'When will timing and availability be confirmed?',
        answer: `Timing is confirmed ${language.timing}. Any dependencies, lead times, or availability constraints will be shared before the next step is finalized.`,
      },
      {
        question: 'What happens if my plans change?',
        answer: `${language.changePolicy}. Contact the team promptly so available options can be reviewed with you.`,
      },
    ],
    process: [
      { step: '01', title: 'Share your needs', detail: `Tell ${businessName} what you are trying to accomplish and when you would like to begin.` },
      { step: '02', title: 'Review the recommendation', detail: `Receive guidance on ${language.decision}, including expectations and the next decision.` },
      { step: '03', title: 'Confirm the next step', detail: 'Approve the recommended direction only after timing, responsibilities, and important details are clear.' },
    ],
    assuranceTitle: 'Clarity before commitment',
    assurance: `${businessName} uses ${language.vocabulary.join(', ')}, and direct communication to keep expectations visible. If your question is not covered here, send it with your request and the team will answer it directly.`,
    ctaTitle: 'Still have a question?',
    ctaBody: `Tell ${businessName} what you need help with. A focused request makes it easier to provide an accurate, useful response.`,
    ctaLabel: 'Ask the team',
  };
  const serializedPageData = JSON.stringify(pageData, null, 2);
  const componentName = componentNameFromFilePath(filePath);
  const source = `const page = ${serializedPageData} as const;

export default function ${componentName}() {
  return (
    <main className="bg-background text-foreground">
      <section data-ut-section="faq-intro" className="border-b border-border bg-muted/40 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">{page.eyebrow}</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">{page.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{page.introduction}</p>
        </div>
      </section>

      <section data-ut-section="faq" className="py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Frequently asked</p>
            <h2 className="mt-3 text-3xl font-semibold">Useful details, without the runaround</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Open any question for a direct answer. These guidelines establish the normal process; your confirmation will contain the details specific to your request.</p>
          </div>
          <div className="space-y-3">
            {page.items.map((item, index) => (
              <details key={item.question} className="group rounded-[var(--radius)] border border-border bg-card p-5 text-card-foreground">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold">
                  <span>{item.question}</span>
                  <span className="text-xl text-primary" aria-hidden="true">+</span>
                </summary>
                <p className="mt-4 border-t border-border pt-4 leading-7 text-muted-foreground">{item.answer}</p>
                <span className="sr-only">Question {index + 1} of {page.items.length}</span>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section data-ut-section="process" className="border-y border-border bg-muted/30 py-20">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">What happens next</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold">A simple path from question to confident decision</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {page.process.map((item) => (
              <article key={item.step} className="rounded-[var(--radius)] border border-border bg-card p-6 text-card-foreground">
                <p className="text-sm font-semibold text-primary">{item.step}</p>
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside data-ut-section="assurance" className="py-16">
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-8">
          <div className="rounded-[var(--radius)] border border-border bg-card p-8 text-card-foreground sm:p-10">
            <h2 className="text-2xl font-semibold">{page.assuranceTitle}</h2>
            <p className="mt-4 leading-7 text-muted-foreground">{page.assurance}</p>
          </div>
        </div>
      </aside>

      <section data-ut-section="cta" className="pb-20 pt-8 sm:pb-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-8 px-6 sm:px-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold">{page.ctaTitle}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{page.ctaBody}</p>
          </div>
          <button type="button" data-ut-intent="${input.intent}" className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] bg-primary px-6 py-3 font-semibold text-primary-foreground">
            {page.ctaLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
`;

  return { filePath, source };
}

/**
 * Pick one canonical, non-forbidden industry action for an isolated page.
 * Role-specific synthesis coordinates win; otherwise use the industry's
 * highest-priority required/primary action. `nav.goto` is excluded because
 * isolated body pages must expose a real conversion action, not shared nav.
 */
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

/** Invalid TSX must never become attempt context: models tend to reproduce the
 * same parser location verbatim when asked to improve malformed source. */
export function isSyntaxCompletionFailure(reason: string | undefined): boolean {
  return Boolean(reason && /Unexpected token|Unterminated|SyntaxError|parse|expected ["']?[,)}\]]/i.test(reason));
}
