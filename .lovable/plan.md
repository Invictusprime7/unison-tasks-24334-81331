## Goal

Make Playground Catalog reflect what the System Launcher AI actually generated and what the preview canvas actually renders — with a real visual topology view, not stateless cards.

## Three-part build

### 1. Hydration: Pull AI-generated products/services into CreatorData

**File:** `src/services/playgroundHydrator.ts` (extend existing `hydratePlaygroundFromVFS`)

- Scan VFS files for product-shaped data:
  - Hardcoded `products = [...]` arrays in `.tsx` (regex + AST-lite extraction of `{ name, price, description, image }` objects).
  - JSX `<ProductCard ... />` and `<UnisonProductCard ... />` props.
  - Emitted `unisonData` files if the AI wrote one directly.
- Heuristic: extract name, price, currency, description, image URL, sku (if present), category.
- Map → `CreatorProduct` with `status:"active"`, `trackInventory:false`, sortOrder appended.
- Same for services (`services = [...]`, `<ServiceCard />`, `<BookingCard />`).
- Idempotent merge in `mergeHydrationResult` keyed by name+sku to avoid duplicates on re-hydrate.
- Trigger automatically in `WebBuilder` after Launcher hand-off (already calls `hydrateFromVFS`).

### 2. Topology graph: where each product appears

**New helper:** `src/services/catalogTopology.ts`

```ts
export type ProductSurface = {
  pageId: string;
  pageLabel: string;
  pageSlug: string;
  componentInstanceId?: string;
  componentType: string;        // ProductGrid | ProductCard | …
  source?: "all" | "featured" | "collection" | "direct";
  collectionId?: string;
  collectionName?: string;
};

export function getProductSurfaces(
  productId: string,
  creatorData: CreatorData,
  pageRegistry: PageRegistry,
  vfsFiles: Record<string,string>,
): ProductSurface[];
```

Resolution order:
1. Component instances bound directly (`bindings.productId === productId`).
2. Component instances bound by collection containing productId.
3. Component instances with `source:"all"` or `"featured"` (filter featured by product flag).
4. VFS scan: pages whose `.tsx` references the product's name/sku in `<ProductCard>`/`<UnisonProductCard productId="...">` — picks up AI-authored static usages.

### 3. Visual topology UI in Playground Catalog

**File:** `src/components/creatives/web-builder/CreatorPlaygroundModal.tsx` (`ProductsSection`)

Replace flat cards with a richer node:

```
┌──────────────────────────────────────────────┐
│ [img]  Product name      $price   ★ Featured │
│        SKU · category    [In Stock 12]       │
│        ─── Appears on ──────────────────     │
│        • Home → Featured Grid (source:fea…)  │
│        • Shop → All Products (source:all)    │
│        • /products/coffee.tsx (direct)       │
└──────────────────────────────────────────────┘
```

- Mini live preview tile uses host-side `<ProductCard creatorData productId />` (already built in Phase 2) at scale ~0.7, in a hover-zoom popover.
- "Appears on" rows are clickable → call `onNavigateToPage(pageId)` (existing prop pattern in modal) so user jumps to the page in preview.
- Empty-topology badge: "Orphaned — not rendered anywhere" with a one-click "Insert into Featured Grid on Home" action.
- Same treatment in `ServicesSection`.

A new "Topology" tab/toggle on top of the catalog:
- **Cards view** (current upgraded list).
- **Graph view** — left column: pages, right column: products/services, lines (CSS-only) connecting them. Built with simple absolute-positioned divs + SVG lines; no new deps.

## Technical details

- Hydration regex examples:
  - `/(?:const|let|var)\s+products\s*=\s*\[([\s\S]*?)\]/`
  - JSX prop scrape via small tag-tokenizer already used in `multi-page-routing-and-intent-bridge` flow.
- Reverse-sync rule: hydration is **additive only** — it never deletes Playground products the user added manually. Discovered products get a `discoveredFromVFS:true` marker on `CreatorProduct.tags` (internal `__discovered`) so the user can audit in a future pass.
- Topology recomputes via `useMemo([creatorData, pageRegistry, vfsFiles])`.
- Uses existing `playground.updateCollection` (added last turn) for orphan-fix actions.

## Out of scope

- Drag-and-drop binding from topology graph (next phase).
- Persisting hydration discoveries to Supabase (CreatorData is already saved in `builder_drafts`).
- Refactoring System Launcher itself to emit CreatorData natively (that's a deeper Lane-A change; hydration covers the gap for now).