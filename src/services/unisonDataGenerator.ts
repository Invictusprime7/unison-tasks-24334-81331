/**
 * Unison Data Generator
 * --------------------------------------------------------------
 * Serializes the canonical CreatorData payload (managed by the
 * Creator Playground) into a TypeScript module that lives in the
 * VFS at `/src/unison/data.ts`.
 *
 * Generated pages, sections and widgets read from `unisonData`
 * instead of hardcoding product/service arrays. This is the
 * Phase-1 bridge between the Playground catalog and the live
 * preview / published storefront.
 */

import type { CreatorData } from "@/types/creatorData";
import { isProductInStock } from "@/types/creatorData";

export const UNISON_DATA_PATH = "/src/unison/data.ts";

/**
 * Returns the in-memory shape of unisonData. Useful for tests and
 * for non-VFS consumers (e.g. host previews) that want the same
 * derived view the generated module exposes.
 */
export function buildUnisonData(creatorData: CreatorData) {
  const products = Object.values(creatorData.products)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      ...p,
      // Derived availability — single source of truth for downstream UI.
      inStock: isProductInStock(p),
    }));

  const services = Object.values(creatorData.services).sort((a, b) => a.sortOrder - b.sortOrder);
  const testimonials = Object.values(creatorData.testimonials).sort((a, b) => a.sortOrder - b.sortOrder);
  const faqs = Object.values(creatorData.faqs).sort((a, b) => a.sortOrder - b.sortOrder);
  const gallery = Object.values(creatorData.gallery).sort((a, b) => a.sortOrder - b.sortOrder);
  const team = Object.values(creatorData.team).sort((a, b) => a.sortOrder - b.sortOrder);
  const collections = Object.values(creatorData.collections).sort((a, b) => a.sortOrder - b.sortOrder);
  const forms = Object.values(creatorData.forms).sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    businessInfo: creatorData.businessInfo,
    products,
    services,
    testimonials,
    faqs,
    gallery,
    team,
    collections,
    forms,
    overlays: Object.values(creatorData.overlays),
    componentInstances: Object.values(creatorData.componentInstances),
  };
}

/**
 * Renders the canonical TS module text written into the VFS.
 * Pages should `import { unisonData } from "@/unison/data";`.
 */
export function generateUnisonDataFile(creatorData: CreatorData): string {
  const payload = buildUnisonData(creatorData);
  const json = JSON.stringify(payload, null, 2);

  return `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source of truth: Creator Playground (CreatorData).
 * Regenerated whenever the Playground catalog, services, forms,
 * or business info change.
 */

export const unisonData = ${json} as const;

export type UnisonData = typeof unisonData;
export type UnisonProduct = UnisonData["products"][number];
export type UnisonService = UnisonData["services"][number];
export type UnisonForm = UnisonData["forms"][number];

/** Look up a product by id or slug. */
export function getProduct(idOrSlug: string): UnisonProduct | undefined {
  return unisonData.products.find(
    (p) => p.productId === idOrSlug || p.slug === idOrSlug,
  );
}

/** Featured products, ordered by sortOrder. */
export function getFeaturedProducts(): UnisonProduct[] {
  return unisonData.products.filter((p) => p.featured);
}

/** Products belonging to a named collection. */
export function getCollectionProducts(collectionId: string): UnisonProduct[] {
  const col = unisonData.collections.find((c) => c.collectionId === collectionId);
  if (!col) return [];
  const set = new Set(col.itemIds);
  return unisonData.products.filter((p) => set.has(p.productId));
}
`;
}
