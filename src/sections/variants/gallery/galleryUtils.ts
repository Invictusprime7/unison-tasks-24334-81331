/**
 * Gallery variant helpers — shared normalization for the gallery variant family.
 * Every variant consumes the same semantic props: src, alt, caption, category.
 */

import type { LightboxItem } from './GalleryLightbox';

export function normalizeGalleryItems(items: unknown): LightboxItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw) => {
      const item = (raw || {}) as Record<string, unknown>;
      const src = (item.src || item.image || item.url || item.photo) as string | undefined;
      if (!src) return null;
      return {
        src,
        alt: (item.alt as string) || (item.title as string) || (item.caption as string) || '',
        caption: (item.caption as string) || (item.title as string) || '',
        category: (item.category as string) || (item.tag as string) || '',
      } satisfies LightboxItem;
    })
    .filter(Boolean) as LightboxItem[];
}

export function galleryCategories(items: LightboxItem[]): string[] {
  return Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[]));
}
