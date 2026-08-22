/**
 * Canonical media resolver.
 *
 * Section renderers have always supported `image` / `backgroundImage` / gallery
 * `src`, but nothing in the wizard pipeline ever populated those slots, so
 * image-capable variants shipped as text blocks (which also reads as excess
 * blank space). This module is the single authority that assigns REAL,
 * high-resolution imagery to every declared media slot.
 *
 * Rules:
 *  • Deterministic — every pick is derived from the sealed generation seed via
 *    `childSeed`, never `Math.random()`. Same seed in, same imagery out across
 *    preview, publish and re-open.
 *  • Non-repeating — per-page and per-section child seeds rotate the industry
 *    pool so two sections never land on the same photo within a page.
 *  • High resolution — every URL carries explicit width/quality/format params
 *    plus intrinsic dimensions so the browser can avoid layout shift.
 */

import { childSeed, seededRotate } from './generationSeed';

export interface ResolvedMedia {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export type MediaShape = 'hero' | 'wide' | 'square' | 'portrait';

const SHAPE_DIMENSIONS: Record<MediaShape, { width: number; height: number }> = {
  hero: { width: 2400, height: 1600 },
  wide: { width: 1920, height: 1280 },
  square: { width: 1400, height: 1400 },
  portrait: { width: 1400, height: 1750 },
};

/**
 * Curated Unsplash photo ids per industry. Ids (not search URLs) keep the
 * result stable — a search endpoint would return different photos over time,
 * which is drift.
 */
const INDUSTRY_PHOTOS: Record<string, readonly string[]> = {
  salon: [
    'photo-1560066984-138dadb4c035', 'photo-1522337360788-8b13dee7a37e',
    'photo-1487412947147-5cebf100ffc2', 'photo-1595476108010-b4d1f102b1b1',
    'photo-1519415943484-9fa1873496d4', 'photo-1470259078422-826894b933aa',
    'photo-1600948836101-f9ffda59d250', 'photo-1512496015851-a90fb38ba796',
  ],
  restaurant: [
    'photo-1517248135467-4c7edcad34c4', 'photo-1414235077428-338989a2e8c0',
    'photo-1552566626-52f8b828add9', 'photo-1466978913421-dad2ebd01d17',
    'photo-1504674900247-0877df9cc836', 'photo-1559339352-11d035aa65de',
    'photo-1533777324565-a040eb52facd', 'photo-1424847651672-bf20a4b0982b',
  ],
  agency: [
    'photo-1497366754035-f200968a6e72', 'photo-1522071820081-009f0129c71c',
    'photo-1600880292203-757bb62b4baf', 'photo-1531973576160-7125cd663d86',
    'photo-1552664730-d307ca884978', 'photo-1542744173-8e7e53415bb0',
    'photo-1519389950473-47ba0277781c', 'photo-1517048676732-d65bc937f952',
  ],
  saas: [
    'photo-1551288049-bebda4e38f71', 'photo-1460925895917-afdab827c52f',
    'photo-1504384308090-c894fdcc538d', 'photo-1526628953301-3e589a6a8b74',
    'photo-1531482615713-2afd69097998', 'photo-1498050108023-c5249f4df085',
    'photo-1487058792275-0ad4aaf24ca7', 'photo-1517245386807-bb43f82c33c4',
  ],
  coaching: [
    'photo-1544027993-37dbfe43562a', 'photo-1552664730-d307ca884978',
    'photo-1507003211169-0a1dd7228f2d', 'photo-1524178232363-1fb2b075b655',
    'photo-1531482615713-2afd69097998', 'photo-1494178270175-e96de2971df9',
    'photo-1508672019048-805c876b67e2', 'photo-1519085360753-af0119f7cbe7',
  ],
  store: [
    'photo-1441986300917-64674bd600d8', 'photo-1483985988355-763728e1935b',
    'photo-1472851294608-062f824d29cc', 'photo-1523381210434-271e8be1f52b',
    'photo-1490481651871-ab68de25d43d', 'photo-1445205170230-053b83016050',
    'photo-1489987707025-afc232f7ea0f', 'photo-1595950653106-6c9ebd614d3a',
  ],
  portfolio: [
    'photo-1499750310107-5fef28a66643', 'photo-1506126613408-eca07ce68773',
    'photo-1452587925148-ce544e77e70d', 'photo-1481277542470-605612bd2d61',
    'photo-1467269204594-9661b134dd2b', 'photo-1516035069371-29a1b244cc32',
    'photo-1493397212122-2b85dda8106b', 'photo-1510936111840-65e151ad71bb',
  ],
  'local-service': [
    'photo-1581578731548-c64695cc6952', 'photo-1503387762-592deb58ef4e',
    'photo-1416879595882-3373a0480b5b', 'photo-1621905251189-08b45d6a269e',
    'photo-1558618666-fcd25c85cd64', 'photo-1523413651479-597eb2da0ad6',
    'photo-1600585154340-be6161a56a0c', 'photo-1581094794329-c8112a89af12',
  ],
  nonprofit: [
    'photo-1593113646773-028c64a8f1b8', 'photo-1521737604893-d14cc237f11d',
    'photo-1559027615-cd4628902d4a', 'photo-1469571486292-0ba58a3f068b',
    'photo-1488521787991-ed7bbaae773c', 'photo-1509099836639-18ba1795216d',
    'photo-1497486751825-1233686d5d80', 'photo-1531206715517-5c0ba140b2b8',
  ],
  fitness: [
    'photo-1534438327276-14e5300c3a48', 'photo-1517836357463-d25dfeac3438',
    'photo-1571019613454-1cb2f99b2d8b', 'photo-1540497077202-7c8a3999166f',
    'photo-1518611012118-696072aa579a', 'photo-1546483875-ad9014c88eba',
    'photo-1571902943202-507ec2618e8f', 'photo-1584735935682-2f2b69dff9d2',
  ],
};

/** Neutral, premium-looking fallback pool for unmapped industries. */
const DEFAULT_PHOTOS: readonly string[] = [
  'photo-1497366754035-f200968a6e72', 'photo-1521737604893-d14cc237f11d',
  'photo-1600880292203-757bb62b4baf', 'photo-1519389950473-47ba0277781c',
  'photo-1454165804606-c3d57bc86b40', 'photo-1522202176988-66273c2fd55f',
  'photo-1507099985932-87a4520ed1d5', 'photo-1531973576160-7125cd663d86',
];

function poolFor(industry?: string | null): readonly string[] {
  const key = (industry || '').trim().toLowerCase();
  if (!key) return DEFAULT_PHOTOS;
  if (INDUSTRY_PHOTOS[key]) return INDUSTRY_PHOTOS[key];
  const partial = Object.keys(INDUSTRY_PHOTOS).find((candidate) => key.includes(candidate) || candidate.includes(key));
  return partial ? INDUSTRY_PHOTOS[partial] : DEFAULT_PHOTOS;
}

function photoUrl(photoId: string, shape: MediaShape): string {
  const { width } = SHAPE_DIMENSIONS[shape];
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

export interface MediaResolverInput {
  /** Sealed generation seed — the ONLY source of randomness allowed here. */
  seed: string;
  industry?: string | null;
  /** Scope so the same section type on two pages does not repeat a photo. */
  pageScope?: string;
}

/**
 * A page-scoped, non-repeating media picker.
 *
 * Consecutive `next()` calls walk a seeded rotation of the industry pool, so a
 * page with hero + about + gallery gets three distinct photos, and two pages
 * with the same section mix get different rotations.
 */
export class MediaPicker {
  private readonly rotation: readonly string[];
  private cursor = 0;

  constructor(input: MediaResolverInput) {
    const scoped = childSeed(input.seed, 'media', input.pageScope || 'page');
    this.rotation = seededRotate(scoped, poolFor(input.industry));
  }

  next(shape: MediaShape, alt: string): ResolvedMedia {
    const photoId = this.rotation[this.cursor % this.rotation.length];
    this.cursor += 1;
    return {
      src: photoUrl(photoId, shape),
      alt,
      ...SHAPE_DIMENSIONS[shape],
    };
  }

  /** Deterministic batch — used by gallery / portfolio grids. */
  batch(count: number, shape: MediaShape, altPrefix: string): ResolvedMedia[] {
    return Array.from({ length: Math.max(0, count) }, (_unused, index) =>
      this.next(shape, `${altPrefix} ${index + 1}`));
  }
}

export function createMediaPicker(input: MediaResolverInput): MediaPicker {
  return new MediaPicker(input);
}

/** Section types that must ship with imagery when the variant supports it. */
export const MEDIA_REQUIRED_SECTION_TYPES = [
  'hero', 'about', 'gallery', 'portfolio', 'before-after', 'blog-preview', 'team',
] as const;

export function mediaShapeForSection(sectionType: string): MediaShape {
  switch (sectionType) {
    case 'hero': return 'hero';
    case 'gallery': return 'square';
    case 'team': return 'portrait';
    case 'portfolio':
    case 'before-after':
    case 'blog-preview': return 'wide';
    default: return 'wide';
  }
}

/**
 * Fill every empty media slot on a composition's sections in place-safe
 * (immutable) fashion. Existing author-provided URLs always win — this only
 * repairs what the wizard left empty.
 */
export function applyMediaToSections<T extends { id?: string; type: string; props?: Record<string, unknown> }>(
  sections: readonly T[],
  input: MediaResolverInput,
): T[] {
  const picker = createMediaPicker(input);
  return sections.map((section) => {
    const props = { ...(section.props || {}) } as Record<string, unknown>;
    const shape = mediaShapeForSection(section.type);
    const label = typeof props.headline === 'string' ? props.headline : section.type;

    if (section.type === 'hero') {
      const layout = typeof props.layout === 'string' ? props.layout : 'centered';
      const key = layout === 'full-bleed' ? 'backgroundImage' : 'image';
      if (!props.image && !props.backgroundImage) {
        props[key] = picker.next(shape, label).src;
      }
    } else if (section.type === 'gallery' || section.type === 'portfolio') {
      const items = Array.isArray(props.items) ? [...(props.items as Record<string, unknown>[])] : [];
      props.items = items.map((item, index) => (
        item && (item.src || item.image || item.url || item.photo)
          ? item
          : { ...item, src: picker.next(shape, `${label} ${index + 1}`).src }
      ));
    } else if (section.type === 'about' || section.type === 'blog-preview' || section.type === 'team') {
      if (section.type === 'about') {
        if (!props.image) props.image = picker.next(shape, label).src;
      } else {
        const items = Array.isArray(props.items) ? [...(props.items as Record<string, unknown>[])] : [];
        props.items = items.map((item, index) => (
          item && item.image ? item : { ...item, image: picker.next(shape, `${label} ${index + 1}`).src }
        ));
      }
    } else if (section.type === 'cta' && props.backgroundImage === '') {
      props.backgroundImage = picker.next('wide', label).src;
    } else {
      return section;
    }

    return { ...section, props } as T;
  });
}

/** Flat manifest of every URL this resolver assigned — sealed into the snapshot. */
export function collectMediaManifest(
  sections: readonly { type: string; props?: Record<string, unknown> }[],
): string[] {
  const urls: string[] = [];
  for (const section of sections) {
    const props = section.props || {};
    for (const key of ['image', 'backgroundImage'] as const) {
      const value = props[key];
      if (typeof value === 'string' && value.startsWith('http')) urls.push(value);
    }
    const items = Array.isArray(props.items) ? props.items as Record<string, unknown>[] : [];
    for (const item of items) {
      for (const key of ['src', 'image', 'before', 'after'] as const) {
        const value = item?.[key];
        if (typeof value === 'string' && value.startsWith('http')) urls.push(value);
      }
    }
  }
  return Array.from(new Set(urls));
}
