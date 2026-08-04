const SECTIONING_ELEMENTS = new Set(['section', 'article', 'aside', 'header', 'main', 'footer', 'nav']);
const OPENING_ELEMENT_PATTERN = /<\s*([A-Za-z][\w.-]*)\b[^>]*>/g;
const SECTION_CLASS_PATTERN = /\bclassName=["'][^"']*(hero|section|services|features|testimonials|pricing|gallery|contact|booking|cta|footer|nav)[^"']*["']/i;

export function countWizardPageSections(source: string): number {
  return Array.from(source.matchAll(OPENING_ELEMENT_PATTERN)).filter((match) => {
    const tagName = match[1].toLowerCase();
    return SECTIONING_ELEMENTS.has(tagName) || SECTION_CLASS_PATTERN.test(match[0]);
  }).length;
}