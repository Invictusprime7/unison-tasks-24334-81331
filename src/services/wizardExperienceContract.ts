import type { ThemePreset } from '@/components/onboarding/themePresets';
import type { TemplateLayoutContract } from '@/services/templateLayoutContract';

export interface WizardExperienceContract {
  version: '1.2';
  stylePresetId: string;
  templateId: string;
  layoutSignature: string;
  referenceSources: string[];
  directives: string[];
}

/**
 * Reusable visual-quality rules inspired by premium, image-led launches.
 * Content stays industry-specific; the selected template and style cards still
 * own structure and visual tokens respectively.
 */
export function buildWizardExperienceContract(
  preset: ThemePreset,
  layout: TemplateLayoutContract,
): WizardExperienceContract {
  return {
    version: '1.2',
    stylePresetId: preset.id,
    templateId: layout.templateId,
    layoutSignature: layout.signature,
    referenceSources: [
      'image-led launch composition study',
      'Bright Site editorial interaction study',
      'Flix fixed-navigation hierarchy study',
    ],
    directives: [
      `Apply the selected ${preset.label} Style card faithfully; use its semantic tokens, typography, and geometry rather than inventing another aesthetic.`,
      'Create an image-led first viewport with one clear conversion action, a relevant inspectable industry image, and content that remains readable over the image.',
      'Use a deliberate editorial rhythm: a bounded content frame, generous section spacing, a clear heading/body scale, and a paired primary/secondary action treatment where the selected template calls for it.',
      'Use token-driven surface layering where it supports the selected Style card: a readable translucent or blurred navigation treatment, restrained elevated cards, and thin semantic borders. Do not force glass effects into every theme.',
      'Keep navigation compact and purposeful: preserve a clear brand anchor, group the highest-value actions, and use a fixed or sticky header only when the selected template supports it. On small screens, retain the primary action and prevent navigation controls from crowding or disappearing.',
      'Use 3-6 restrained Framer Motion entrances across the page: fade/reveal or staggered reveal on meaningful groups only. Respect prefers-reduced-motion and avoid perpetual decorative animation.',
      'Make repeated content items feel tactile with accessible hover, focus, and press states: modest lift or border/surface emphasis, image zoom only inside clipped media, and stable card dimensions.',
      'Use stylized but functional components: an editorial content rhythm, proof or feature cards, trust signals, and a decisive final CTA appropriate to the selected industry.',
      'Treat the Bright Site and Flix references as behavior-only inspiration: do not copy their fonts, palette, CSS utility class names, routes, business copy, or imagery. The selected Style card remains the sole visual-token authority.',
      'Adapt all copy, imagery, labels, proof, and CTAs to the selected business and industry. Do not reuse another launch\'s brands, sports, products, people, statistics, or domain vocabulary.',
      'Generate fresh authored content for every canonical page. Existing VFS context is structural reference only; replace placeholder or prior-business copy instead of echoing it.',
    ],
  };
}

export function formatWizardExperienceContract(contract: WizardExperienceContract): string {
  return [
    `Reference studies: ${contract.referenceSources.join('; ')}.`,
    ...contract.directives.map((directive, index) => `${index + 1}. ${directive}`),
  ].join('\n');
}