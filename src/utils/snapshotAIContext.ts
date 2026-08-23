/**
 * snapshotAIContext — renders the sealed SiteBundleSnapshot into a prompt block
 * so in-builder AI edits stay snapshot-aware.
 *
 * A surgical edit must inherit the wizard's art direction (industry copy,
 * themePresetId, sealed artDirectionPackId, generation seed, geometry tokens)
 * instead of inventing new CSS. Without this block the AI edits a generated
 * Lane A/Lane B page with no knowledge of the contract that produced it.
 */

import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

const GEOMETRY_TOKEN_CONTRACT = [
  'Geometry + color come from Stage 4b `--ut-*` CSS variables and semantic Tailwind tokens.',
  'Never hardcode hex colors, `text-white`/`bg-black`, or raw pixel geometry — use the existing token classes.',
  'Never redefine tokens inline; /src/index.css is owned by Stage 4b.',
].join(' ');

export function renderSnapshotContextForPrompt(
  snapshot: SiteBundleSnapshot | null | undefined,
  opts?: { maxPages?: number },
): string {
  if (!snapshot) return '';
  const meta = snapshot.meta || ({} as SiteBundleSnapshot['meta']);
  const lines: string[] = ['[Generated site runtime — sealed snapshot, hard contract]'];

  lines.push(`Business: ${snapshot.businessName || 'unknown'}`);
  lines.push(`Industry: ${(meta.industry || snapshot.industry || 'unknown').replace(/_/g, ' ')}`);
  if (meta.themePresetId) lines.push(`Style card (themePresetId): ${meta.themePresetId}`);
  if (meta.templateId) lines.push(`Template card: ${meta.templateId}`);
  if (meta.artDirectionPackId) lines.push(`Sealed art-direction pack: ${meta.artDirectionPackId}`);
  if (meta.generationSeed) lines.push(`Generation seed: ${meta.generationSeed}`);
  if (meta.seal?.sealedAt) lines.push(`Sealed revision: ${meta.seal.sealedAt} (by ${meta.seal.sealedBy})`);

  const pages = Object.values(snapshot.pageRegistry?.pages || {}) as Array<{
    name?: string;
    path?: string;
    filePath?: string;
  }>;
  const max = opts?.maxPages ?? 24;
  if (pages.length) {
    lines.push(
      `Registered pages (${pages.length}): ` +
        pages
          .slice(0, max)
          .map((p) => `${p.path || '/'} → ${p.filePath || '?'}`)
          .join(', '),
    );
    lines.push('Editing an existing page file is a surgical edit. Adding, removing, or renaming a page changes the registry and must be requested explicitly.');
  }

  lines.push(`Router: ${snapshot.routerFile?.path || '/src/App.tsx'} is deterministically generated — never rewrite it.`);
  lines.push(GEOMETRY_TOKEN_CONTRACT);
  lines.push('Return complete modified files; do not drop sections, intents (`data-ut-intent`), or accessible labels that already exist.');

  return lines.join('\n');
}
