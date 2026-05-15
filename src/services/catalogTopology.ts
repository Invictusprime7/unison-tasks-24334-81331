/**
 * Catalog Topology — Resolves where each product/service is rendered across
 * the site (component instance bindings + raw VFS scans). Used by the
 * Playground Catalog to render a real visual topology, not stateless cards.
 */

import type { CreatorData, CreatorProduct, CreatorService } from "@/types/creatorData";
import type { PageRegistry } from "@/types/pageRegistry";

export type CatalogSurfaceKind = "direct" | "collection" | "featured" | "all" | "vfs_static";

export interface CatalogSurface {
  /** Stable id for React keys */
  id: string;
  pageId: string | null;          // null when only VFS file matched (no registry page)
  pageLabel: string;
  pageSlug: string;
  filePath?: string;
  componentType: string;          // ProductGrid | ProductCard | ServiceCard | <inline> | …
  kind: CatalogSurfaceKind;
  source?: string;                // "all" | "featured" | "collection"
  collectionId?: string;
  collectionName?: string;
  componentInstanceId?: string;
}

function findPageByFile(filePath: string, registry: PageRegistry): { pageId: string | null; label: string; slug: string } {
  for (const [pid, p] of Object.entries(registry.pages)) {
    const src = (p as { source?: { content?: string }; filePath?: string }).filePath;
    if (src && src === filePath) return { pageId: pid, label: p.title || pid, slug: p.path || pid };
  }
  // heuristic: match basename → page title
  const base = filePath.split("/").pop()?.replace(/\.(tsx|jsx)$/i, "")?.toLowerCase() || "";
  for (const [pid, p] of Object.entries(registry.pages)) {
    if ((p.title || "").toLowerCase() === base || (p.path || "").toLowerCase().endsWith(`/${base}`)) {
      return { pageId: pid, label: p.title || pid, slug: p.path || pid };
    }
  }
  return { pageId: null, label: base || filePath, slug: filePath };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find every surface that renders a given product.
 */
export function getProductSurfaces(
  product: CreatorProduct,
  creatorData: CreatorData,
  pageRegistry: PageRegistry,
  vfsFiles: Record<string, string>,
): CatalogSurface[] {
  const surfaces: CatalogSurface[] = [];
  const seen = new Set<string>();

  const collections = Object.values(creatorData.collections).filter((c) => c.type === "products");
  const memberCollectionIds = new Set(
    collections.filter((c) => c.itemIds.includes(product.productId)).map((c) => c.collectionId),
  );

  // 1–3. Component instance bindings
  for (const ci of Object.values(creatorData.componentInstances)) {
    const bindings = ci.bindings || {};
    const propsSource = (ci.props as Record<string, unknown> | undefined)?.source as string | undefined;
    const source = (bindings.source ?? propsSource) as string | undefined;

    let kind: CatalogSurfaceKind | null = null;
    let collectionId: string | undefined;

    if (bindings.productId === product.productId) {
      kind = "direct";
    } else if (bindings.collectionId && memberCollectionIds.has(bindings.collectionId)) {
      kind = "collection";
      collectionId = bindings.collectionId;
    } else if (source === "featured" && product.featured) {
      kind = "featured";
    } else if (source === "all") {
      kind = "all";
    }
    if (!kind) continue;

    const pages = ci.usedOnPages?.length ? ci.usedOnPages : [null];
    for (const pid of pages) {
      const page = pid ? pageRegistry.pages[pid] : null;
      const surfaceId = `ci_${ci.instanceId}_${pid || "_"}`;
      if (seen.has(surfaceId)) continue;
      seen.add(surfaceId);
      surfaces.push({
        id: surfaceId,
        pageId: pid,
        pageLabel: page?.title || (pid ? pid : "Unattached"),
        pageSlug: page?.path || "",
        componentType: ci.componentType || ci.componentSlug || "Component",
        kind,
        source,
        collectionId,
        collectionName: collectionId ? creatorData.collections[collectionId]?.name : undefined,
        componentInstanceId: ci.instanceId,
      });
    }
  }

  // 4. VFS static scan: <UnisonProductCard productId="..."/>, <ProductCard productId="..."/>,
  //    or any .tsx that mentions the product name verbatim in JSX text.
  const idRe = new RegExp(
    `<(UnisonProductCard|ProductCard)\\b[^>]*productId=["']${escapeRegex(product.productId)}["']`,
    "i",
  );
  const nameRe = product.name && product.name.length > 2
    ? new RegExp(`>\\s*${escapeRegex(product.name)}\\s*<`, "i")
    : null;
  const skuRe = product.sku ? new RegExp(escapeRegex(product.sku), "i") : null;

  for (const [filePath, content] of Object.entries(vfsFiles)) {
    if (!/\.(tsx|jsx)$/i.test(filePath)) continue;
    if (filePath.endsWith("/App.tsx")) continue;
    let matched: { kind: CatalogSurfaceKind; componentType: string } | null = null;
    if (idRe.test(content)) matched = { kind: "direct", componentType: "ProductCard" };
    else if (nameRe && nameRe.test(content)) matched = { kind: "vfs_static", componentType: "<inline>" };
    else if (skuRe && skuRe.test(content)) matched = { kind: "vfs_static", componentType: "<inline>" };
    if (!matched) continue;

    const { pageId, label, slug } = findPageByFile(filePath, pageRegistry);
    const surfaceId = `vfs_${filePath}_${product.productId}`;
    if (seen.has(surfaceId)) continue;
    seen.add(surfaceId);
    surfaces.push({
      id: surfaceId,
      pageId,
      pageLabel: label,
      pageSlug: slug,
      filePath,
      componentType: matched.componentType,
      kind: matched.kind,
    });
  }

  return surfaces;
}

/**
 * Find every surface that renders a given service.
 */
export function getServiceSurfaces(
  service: CreatorService,
  creatorData: CreatorData,
  pageRegistry: PageRegistry,
  vfsFiles: Record<string, string>,
): CatalogSurface[] {
  const surfaces: CatalogSurface[] = [];
  const seen = new Set<string>();

  for (const ci of Object.values(creatorData.componentInstances)) {
    const bindings = ci.bindings || {};
    if (bindings.serviceId === service.serviceId) {
      const pages = ci.usedOnPages?.length ? ci.usedOnPages : [null];
      for (const pid of pages) {
        const page = pid ? pageRegistry.pages[pid] : null;
        const surfaceId = `ci_${ci.instanceId}_${pid || "_"}`;
        if (seen.has(surfaceId)) continue;
        seen.add(surfaceId);
        surfaces.push({
          id: surfaceId,
          pageId: pid,
          pageLabel: page?.title || (pid ? pid : "Unattached"),
          pageSlug: page?.path || "",
          componentType: ci.componentType || ci.componentSlug || "Service",
          kind: "direct",
          componentInstanceId: ci.instanceId,
        });
      }
    }
  }

  const nameRe = service.name && service.name.length > 2
    ? new RegExp(`>\\s*${escapeRegex(service.name)}\\s*<`, "i")
    : null;
  const codeRe = service.serviceCode ? new RegExp(escapeRegex(service.serviceCode), "i") : null;

  for (const [filePath, content] of Object.entries(vfsFiles)) {
    if (!/\.(tsx|jsx)$/i.test(filePath)) continue;
    if (filePath.endsWith("/App.tsx")) continue;
    if (!((nameRe && nameRe.test(content)) || (codeRe && codeRe.test(content)))) continue;
    const { pageId, label, slug } = findPageByFile(filePath, pageRegistry);
    const surfaceId = `vfs_${filePath}_${service.serviceId}`;
    if (seen.has(surfaceId)) continue;
    seen.add(surfaceId);
    surfaces.push({
      id: surfaceId,
      pageId,
      pageLabel: label,
      pageSlug: slug,
      filePath,
      componentType: "<inline>",
      kind: "vfs_static",
    });
  }

  return surfaces;
}

/**
 * Build a flat page → items map for graph view.
 */
export interface CatalogTopologyMap {
  pages: Array<{ pageId: string; label: string; slug: string }>;
  productEdges: Array<{ pageId: string | null; productId: string; kind: CatalogSurfaceKind }>;
  serviceEdges: Array<{ pageId: string | null; serviceId: string; kind: CatalogSurfaceKind }>;
  orphanProductIds: string[];
  orphanServiceIds: string[];
}

export function buildCatalogTopology(
  creatorData: CreatorData,
  pageRegistry: PageRegistry,
  vfsFiles: Record<string, string>,
): CatalogTopologyMap {
  const pages = Object.values(pageRegistry.pages)
    .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0))
    .map((p) => ({ pageId: p.pageId, label: p.title || p.pageId, slug: p.path || "" }));

  const productEdges: CatalogTopologyMap["productEdges"] = [];
  const serviceEdges: CatalogTopologyMap["serviceEdges"] = [];
  const orphanProductIds: string[] = [];
  const orphanServiceIds: string[] = [];

  for (const product of Object.values(creatorData.products)) {
    const s = getProductSurfaces(product, creatorData, pageRegistry, vfsFiles);
    if (s.length === 0) {
      orphanProductIds.push(product.productId);
    } else {
      for (const surface of s) {
        productEdges.push({ pageId: surface.pageId, productId: product.productId, kind: surface.kind });
      }
    }
  }

  for (const service of Object.values(creatorData.services)) {
    const s = getServiceSurfaces(service, creatorData, pageRegistry, vfsFiles);
    if (s.length === 0) {
      orphanServiceIds.push(service.serviceId);
    } else {
      for (const surface of s) {
        serviceEdges.push({ pageId: surface.pageId, serviceId: service.serviceId, kind: surface.kind });
      }
    }
  }

  return { pages, productEdges, serviceEdges, orphanProductIds, orphanServiceIds };
}
