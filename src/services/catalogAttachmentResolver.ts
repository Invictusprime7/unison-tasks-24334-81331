/**
 * catalogAttachmentResolver — Track B
 *
 * Turns a page's snapshot sections into a set of "catalog attachments":
 * pairings of section+slot → CatalogItemDTO[] to hydrate into rendered
 * markup at preview/publish time.
 *
 * The resolver is intentionally shape-tolerant. It walks whatever sections
 * are present and looks for well-known slot roles that speak "catalog":
 *
 *   - services-list      → kind: service
 *   - product-grid       → kind: product
 *   - menu-list          → kind: menu_item
 *   - class-schedule     → kind: class
 *   - package-cards      → kind: package
 *
 * Unknown slots are ignored. Attachments are stable-ordered by slot role
 * so downstream diff/render steps can key on them.
 */

import type { CatalogItemDTO, CatalogKind } from '@/types/catalog';
import { loadCatalog } from '@/services/catalogRuntimeService';

export interface CatalogAttachmentSpec {
  sectionId: string;
  slotRole: string;
  kind: CatalogKind;
  limit: number;
}

export interface ResolvedCatalogAttachment extends CatalogAttachmentSpec {
  items: CatalogItemDTO[];
}

const SLOT_TO_KIND: Record<string, { kind: CatalogKind; limit: number }> = {
  'services-list':  { kind: 'service',   limit: 12 },
  'services-grid':  { kind: 'service',   limit: 12 },
  'product-grid':   { kind: 'product',   limit: 12 },
  'product-list':   { kind: 'product',   limit: 12 },
  'menu-list':      { kind: 'menu_item', limit: 40 },
  'menu-grid':      { kind: 'menu_item', limit: 40 },
  'class-schedule': { kind: 'class',     limit: 20 },
  'package-cards':  { kind: 'package',   limit: 8  },
  'room-list':      { kind: 'room',      limit: 12 },
};

interface SnapshotSectionLike {
  id?: string;
  slotRole?: string;
  slot?: string;
  role?: string;
  slots?: Array<{ role?: string; id?: string; slotRole?: string }>;
}

interface SnapshotPageLike {
  sections?: SnapshotSectionLike[];
}

/**
 * Extract every catalog-shaped slot on a page snapshot.
 */
export function planCatalogAttachments(
  page: SnapshotPageLike | null | undefined,
): CatalogAttachmentSpec[] {
  if (!page || !Array.isArray(page.sections)) return [];
  const specs: CatalogAttachmentSpec[] = [];

  for (const section of page.sections) {
    const sectionId = section.id ?? `${section.slotRole ?? 'section'}-${specs.length}`;

    // Section-level role
    for (const roleField of [section.slotRole, section.slot, section.role]) {
      const key = typeof roleField === 'string' ? roleField.toLowerCase() : '';
      const hit = SLOT_TO_KIND[key];
      if (hit) {
        specs.push({ sectionId, slotRole: key, kind: hit.kind, limit: hit.limit });
        break;
      }
    }

    // Nested named slots
    if (Array.isArray(section.slots)) {
      for (const slot of section.slots) {
        const key =
          (slot.slotRole ?? slot.role ?? slot.id ?? '').toString().toLowerCase();
        const hit = SLOT_TO_KIND[key];
        if (hit) specs.push({ sectionId, slotRole: key, kind: hit.kind, limit: hit.limit });
      }
    }
  }

  // Dedupe by sectionId+slotRole, stable order.
  const seen = new Set<string>();
  return specs.filter((s) => {
    const k = `${s.sectionId}::${s.slotRole}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Hydrate every planned attachment against the live catalog. Returns one
 * entry per spec, in stable order.
 */
export async function resolveCatalogAttachments(
  businessId: string,
  page: SnapshotPageLike | null | undefined,
): Promise<ResolvedCatalogAttachment[]> {
  const specs = planCatalogAttachments(page);
  if (specs.length === 0 || !businessId) return [];

  const kinds = Array.from(new Set(specs.map((s) => s.kind)));
  const all = await loadCatalog(businessId, { kinds });

  return specs.map((spec) => {
    const items = all
      .filter((i) => i.kind === spec.kind)
      .slice(0, spec.limit);
    return { ...spec, items };
  });
}
