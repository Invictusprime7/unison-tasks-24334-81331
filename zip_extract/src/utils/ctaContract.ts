import type { SystemContract } from '@/data/templates/contracts';
import { getSystemContract } from '@/data/templates/contracts';
import type { BusinessSystemType } from '@/data/templates/types';
import { matchLabelToIntent, type TemplateCategory } from '@/runtime/templateIntentConfig';

export type CTASlot =
  | 'cta.primary'
  | 'cta.secondary'
  | 'cta.nav'
  | 'cta.hero'
  | 'cta.section'
  | 'cta.footer';

export interface TemplateCtaAnalysis {
  intents: string[];
  slots: string[];
  hadUtAttributes: boolean;
}

export interface NormalizeTemplateResult {
  code: string;
  analysis: TemplateCtaAnalysis;
}

function isHtmlDocument(code: string): boolean {
  const s = code.trim();
  return s.startsWith('<!DOCTYPE') || s.startsWith('<html') || /<head[\s>]/i.test(s);
}

function safeText(el: Element): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function setAttr(el: Element, name: string, value: string) {
  if (!el.getAttribute(name)) el.setAttribute(name, value);
}

function inferIntentForElement(el: Element, category?: TemplateCategory): string | null {
  // Prefer explicit intent attributes
  const utIntent = el.getAttribute('data-ut-intent');
  if (utIntent) return utIntent;
  const legacy = el.getAttribute('data-intent');
  if (legacy) return legacy;

  // Otherwise infer from label
  const label = el.getAttribute('data-ut-label') || el.getAttribute('aria-label') || safeText(el);
  const match = matchLabelToIntent(label, category);
  return match?.intent || null;
}

function chooseSlot(el: Element, fallback: CTASlot): CTASlot {
  const tag = el.tagName.toLowerCase();
  if (el.closest('nav')) return 'cta.nav';
  if (el.closest('footer')) return 'cta.footer';
  if (tag === 'form') return fallback;

  // Hero-ish heuristics
  if (el.closest('#hero, [data-section="hero"], header')) return 'cta.hero';
  return fallback;
}

function autoMigrateCTAs(doc: Document, contract: SystemContract | undefined, category?: TemplateCategory): TemplateCtaAnalysis {
  const candidates = Array.from(
    doc.querySelectorAll('button, a, [role="button"], form')
  ).filter((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      // ignore external links
      if (/^https?:\/\//i.test(href) || href.startsWith('//')) return false;
    }
    return true;
  });

  const hadUtAttributes = doc.querySelector('[data-ut-intent], [data-ut-cta]') !== null;

  // 1) First, try to bind required intents to obvious elements
  const requiredIntents = contract?.requiredIntents || [];
  const usedEls = new Set<Element>();
  const bound: Array<{ el: Element; intent: string }> = [];

  for (const required of requiredIntents) {
    const matchEl = candidates.find((el) => {
      if (usedEls.has(el)) return false;
      const inferred = inferIntentForElement(el, category);
      return inferred === required;
    });
    if (matchEl) {
      usedEls.add(matchEl);
      bound.push({ el: matchEl, intent: required });
    }
  }

  // 2) If we still don't have a primary CTA, pick the strongest-looking button
  const hasPrimary = bound.some((b) => b.el.getAttribute('data-ut-cta') === 'cta.primary');
  if (!hasPrimary) {
    const best = candidates.find((el) => {
      if (usedEls.has(el)) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'form') return false;
      const text = safeText(el);
      return text.length > 0;
    });
    if (best) {
      const inferred = inferIntentForElement(best, category) || requiredIntents[0] || 'contact.submit';
      usedEls.add(best);
      bound.unshift({ el: best, intent: inferred });
    }
  }

  // 3) Apply slot + intent attributes in a stable order
  const slotOrder: CTASlot[] = ['cta.primary', 'cta.secondary', 'cta.section'];
  bound.forEach(({ el, intent }, idx) => {
    const fallbackSlot = slotOrder[Math.min(idx, slotOrder.length - 1)];
    const slot = chooseSlot(el, fallbackSlot);
    setAttr(el, 'data-ut-cta', slot);
    setAttr(el, 'data-ut-intent', intent);
    setAttr(el, 'data-intent', intent); // backwards compatibility with existing listeners
    setAttr(el, 'data-ut-label', el.getAttribute('data-ut-label') || safeText(el) || intent);
  });

  // 4) Ensure nav/footer slots exist if contract requires them
  const requiredSlots = contract?.requiredSlots || [];
  if (requiredSlots.includes('cta.nav')) {
    const navCandidate = doc.querySelector('nav button, nav a, nav [role="button"]');
    if (navCandidate) {
      setAttr(navCandidate, 'data-ut-cta', 'cta.nav');
      const inferred = inferIntentForElement(navCandidate, category) || 'contact.submit';
      setAttr(navCandidate, 'data-ut-intent', inferred);
      setAttr(navCandidate, 'data-intent', inferred);
      setAttr(navCandidate, 'data-ut-label', safeText(navCandidate) || inferred);
    }
  }
  if (requiredSlots.includes('cta.footer')) {
    const footerCandidate = doc.querySelector('footer button, footer a, footer [role="button"]');
    if (footerCandidate) {
      setAttr(footerCandidate, 'data-ut-cta', 'cta.footer');
      const inferred = inferIntentForElement(footerCandidate, category) || 'contact.submit';
      setAttr(footerCandidate, 'data-ut-intent', inferred);
      setAttr(footerCandidate, 'data-intent', inferred);
      setAttr(footerCandidate, 'data-ut-label', safeText(footerCandidate) || inferred);
    }
  }

  // Collect analysis (post-mutation)
  const intents = new Set<string>();
  const slots = new Set<string>();

  doc.querySelectorAll('[data-ut-intent],[data-intent]').forEach((el) => {
    const intent = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
    if (intent) intents.add(intent);
  });
  doc.querySelectorAll('[data-ut-cta]').forEach((el) => {
    const slot = el.getAttribute('data-ut-cta');
    if (slot) slots.add(slot);
  });

  return {
    intents: Array.from(intents),
    slots: Array.from(slots),
    hadUtAttributes,
  };
}

export function normalizeTemplateForCtaContract(opts: {
  code: string;
  systemType?: BusinessSystemType | null;
  category?: TemplateCategory;
}): NormalizeTemplateResult {
  const { code, systemType, category } = opts;

  if (!isHtmlDocument(code) || typeof window === 'undefined') {
    return {
      code,
      analysis: { intents: [], slots: [], hadUtAttributes: false },
    };
  }

  const contract = systemType ? getSystemContract(systemType) : undefined;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'text/html');
    const analysis = autoMigrateCTAs(doc, contract, category);
    const normalized = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    return { code: normalized, analysis };
  } catch {
    return {
      code,
      analysis: { intents: [], slots: [], hadUtAttributes: false },
    };
  }
}
