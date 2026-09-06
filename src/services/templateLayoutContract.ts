import type { TemplateComposition } from '@/sections/types';
import { getVariantIdForLayout } from '@/sections/variants';
import type { VariantId } from '@/sections/variants';

export interface TemplateLayoutSection {
  id: string;
  type: string;
  variantId?: VariantId;
  layout?: string;
  columns?: number;
  hasMedia: boolean;
  ctaVariants: string[];
}

export interface TemplateLayoutContract {
  version: '1.0';
  templateId: string;
  industry: string;
  signature: string;
  sections: TemplateLayoutSection[];
}

function collectCtaVariants(props: Record<string, unknown>): string[] {
  const candidates = [
    ...(Array.isArray(props.ctas) ? props.ctas : []),
    props.cta,
    ...(Array.isArray(props.items) ? props.items.map((item) => (
      item && typeof item === 'object' ? (item as { cta?: unknown }).cta : undefined
    )) : []),
  ];
  return Array.from(new Set(candidates
    .filter((candidate): candidate is { variant?: unknown } => Boolean(candidate && typeof candidate === 'object'))
    .map((candidate) => candidate.variant)
    .filter((variant): variant is string => typeof variant === 'string')));
}

export function buildTemplateLayoutContract(
  composition: TemplateComposition,
): TemplateLayoutContract {
  const sections = composition.sections.map((section) => {
    const props = section.props as Record<string, unknown>;
    const items = Array.isArray(props.items) ? props.items : [];
    const hasMedia = Boolean(
      props.image || props.backgroundImage ||
      items.some((item) => item && typeof item === 'object' && ('image' in item || 'src' in item)),
    );
    return {
      id: section.id,
      type: section.type,
      variantId: getVariantIdForLayout(
        section.type,
        typeof props.layout === 'string' ? props.layout : undefined,
      ),
      layout: typeof props.layout === 'string' ? props.layout : undefined,
      columns: typeof props.columns === 'number' ? props.columns : undefined,
      hasMedia,
      ctaVariants: collectCtaVariants(props),
    };
  });

  const signature = sections.map((section) => [
    section.id,
    section.type,
    section.variantId || 'unregistered',
    section.layout || 'default',
    section.columns || '-',
    section.hasMedia ? 'media' : 'text',
    section.ctaVariants.join('+') || '-',
  ].join(':')).join('|');

  return {
    version: '1.0',
    templateId: composition.id,
    industry: composition.industry,
    signature,
    sections,
  };
}

export function buildTemplateLayoutPrompt(contract: TemplateLayoutContract): string {
  const lines = [
    `TEMPLATE LAYOUT CONTRACT (LOCKED): ${contract.templateId} for ${contract.industry}.`,
    `Layout signature: ${contract.signature}.`,
    'Preserve every section in this exact order and preserve each declared layout, column count, media treatment, and CTA variant.',
    'On each section root emit the declared data-ut-section-id, data-ut-section-type, and data-ut-variant values. Interactive controls must preserve data-ut-slot and data-ut-intent independently of visual order.',
  ];
  for (const section of contract.sections) {
    const details = [
      `id=${section.id}`,
      `type=${section.type}`,
      `variantId=${section.variantId || 'unregistered'}`,
      `layout=${section.layout || 'default'}`,
      `columns=${section.columns || 'default'}`,
      `media=${section.hasMedia ? 'required' : 'none'}`,
      `ctaVariants=${section.ctaVariants.join(',') || 'none'}`,
    ];
    lines.push(`- ${details.join(' ')}`);
  }
  return lines.join('\n');
}

/** Adds a durable runtime identity without rewriting the AI-authored geometry.
 *  Stamps EVERY page in /src/pages/*.tsx (not only Home) so Lane B pages carry
 *  the template identity for the theme bridge + downstream diagnostics. */
export function stampTemplateLayoutIdentity(
  files: Record<string, string>,
  contract: TemplateLayoutContract,
): Record<string, string> {
  const next = { ...files };
  const pagePaths = Object.keys(next).filter((path) =>
    /\/src\/pages\/[^/]+\.(?:tsx|jsx)$/i.test(path),
  );
  for (const pagePath of pagePaths) {
    const source = next[pagePath];
    if (typeof source !== 'string' || source.includes('data-ut-template-id=')) continue;
    const tagged = source.replace(/<(main|section)\b([^>]*)>/i, (match, tag: string, attrs: string) => (
      `<${tag}${attrs} data-ut-template-id="${contract.templateId}" data-ut-layout-signature="${contract.signature}">`
    ));
    if (tagged !== source) next[pagePath] = tagged;
  }
  return next;
}