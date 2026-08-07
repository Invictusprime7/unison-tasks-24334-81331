import type { TemplateLayoutContract } from '@/services/templateLayoutContract';

export interface WizardPresentationGuardResult {
  files: Record<string, string>;
  restored: boolean;
  reason?: string;
}

function quote(value: string): string {
  return `["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`;
}

export function assessTemplateVisualFidelity(
  pageSource: string,
  contract: TemplateLayoutContract,
): string | null {
  for (const section of contract.sections) {
    if (!new RegExp(`data-ut-section-id=${quote(section.id)}`).test(pageSource)) {
      return `missing template section identity "${section.id}"`;
    }
    if (!new RegExp(`data-ut-section-type=${quote(section.type)}`).test(pageSource)) {
      return `missing template section type "${section.type}"`;
    }
    if (section.variantId && !new RegExp(`data-ut-variant=${quote(section.variantId)}`).test(pageSource)) {
      return `missing visual variant "${section.variantId}"`;
    }
    if (section.layout && !new RegExp(`data-ut-layout=${quote(section.layout)}`).test(pageSource)) {
      return `missing layout "${section.layout}" for ${section.id}`;
    }
  }

  if (contract.sections.some((section) => section.hasMedia) && !/(<img\b|backgroundImage\s*=|background-image\s*:)/i.test(pageSource)) {
    return 'missing required template media';
  }
  return null;
}

export function preserveCanonicalHomePresentation(input: {
  aiFiles: Record<string, string>;
  canonicalFiles: Record<string, string>;
  homePath: string;
  contract: TemplateLayoutContract;
}): WizardPresentationGuardResult {
  const homePath = input.homePath.startsWith('/') ? input.homePath : `/${input.homePath}`;
  const generatedHome = input.aiFiles[homePath] || input.aiFiles[homePath.slice(1)] || '';
  const canonicalHome = input.canonicalFiles[homePath] || input.canonicalFiles[homePath.slice(1)];
  const reason = assessTemplateVisualFidelity(generatedHome, input.contract);
  if (!reason || !canonicalHome) return { files: input.aiFiles, restored: false, reason };

  const files = { ...input.aiFiles, [homePath]: canonicalHome };
  for (const [path, source] of Object.entries(input.canonicalFiles)) {
    if (/^\/?src\/components\//.test(path) || path === homePath.replace(/\.(tsx|jsx)$/i, '.sections.ts')) {
      files[path.startsWith('/') ? path : `/${path}`] = source;
    }
  }
  return { files, restored: true, reason };
}