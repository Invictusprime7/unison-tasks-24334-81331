/**
 * Unison Products Generator (Phase 2)
 * --------------------------------------------------------------
 * Emits a VFS-resident React module at `/src/unison/products.tsx`
 * exposing data-bound product widgets. Generated pages import from
 * `@/unison/products` instead of declaring hardcoded product arrays.
 *
 *   import { ProductGrid, UnisonProductCard } from "@/unison/products";
 *
 *   <ProductGrid source="featured" columns={3} />
 *   <UnisonProductCard productId="prd_123" />
 *
 * Both widgets read from `@/unison/data` (CreatorData → unisonData),
 * so changes in the Catalog Manager flow live into the preview.
 */

export const UNISON_PRODUCTS_PATH = "/src/unison/products.tsx";

export function generateUnisonProductsFile(): string {
  return `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: src/services/unisonProductsGenerator.ts
 *
 * Data-bound product widgets that read from the canonical
 * unisonData payload. Use these in generated pages instead
 * of hardcoding product arrays.
 */
import * as React from "react";
import { ShoppingCart, Star } from "lucide-react";
import {
  unisonData,
  getProduct,
  getFeaturedProducts,
  getCollectionProducts,
  type UnisonProduct,
} from "@/unison/data";

type ProductSource = "all" | "featured" | "collection";

export interface ProductGridProps {
  source?: ProductSource;
  collectionId?: string;
  columns?: 1 | 2 | 3 | 4;
  limit?: number;
  showAddToCart?: boolean;
  className?: string;
}

const colsClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

function resolveProducts(
  source: ProductSource,
  collectionId?: string,
): UnisonProduct[] {
  if (source === "featured") return getFeaturedProducts();
  if (source === "collection" && collectionId)
    return getCollectionProducts(collectionId);
  return [...unisonData.products];
}

function formatPrice(p: UnisonProduct): string {
  const currency = p.currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(p.price ?? 0);
  } catch {
    return \`$\${(p.price ?? 0).toFixed(2)}\`;
  }
}

function availabilityLabel(p: UnisonProduct): string | null {
  if (p.status === "draft") return "Draft";
  if (p.status === "archived") return "Archived";
  if (!p.inStock) return "Out of stock";
  if (
    p.trackInventory &&
    typeof p.stockQuantity === "number" &&
    typeof p.lowStockThreshold === "number" &&
    p.stockQuantity <= p.lowStockThreshold
  ) {
    return \`Only \${p.stockQuantity} left\`;
  }
  return null;
}

export interface UnisonProductCardProps {
  productId: string;
  showAddToCart?: boolean;
  className?: string;
}

export const UnisonProductCard: React.FC<UnisonProductCardProps> = ({
  productId,
  showAddToCart = true,
  className,
}) => {
  const product = getProduct(productId);
  if (!product) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        Product "{productId}" not found in catalog.
      </div>
    );
  }
  return <ProductCardView product={product} showAddToCart={showAddToCart} className={className} />;
};

interface ProductCardViewProps {
  product: UnisonProduct;
  showAddToCart?: boolean;
  className?: string;
}

const ProductCardView: React.FC<ProductCardViewProps> = ({
  product,
  showAddToCart = true,
  className,
}) => {
  const badge = availabilityLabel(product);
  const disabled = !product.inStock || product.status !== "active";
  return (
    <div
      className={\`group overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition hover:shadow-md \${className ?? ""}\`}
      data-ut-product-id={product.productId}
    >
      <div className="relative aspect-square bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        {product.category ? (
          <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
            {product.category}
          </span>
        ) : null}
        {badge ? (
          <span className="absolute right-2 top-2 rounded bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold">{product.name}</h3>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        ) : null}
        {typeof product.rating === "number" && product.rating > 0 ? (
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={\`h-3 w-3 \${i < Math.round(product.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}\`}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-lg font-bold">{formatPrice(product)}</span>
          {showAddToCart ? (
            <button
              type="button"
              data-ut-intent="commerce.addToCart"
              data-ut-product-id={product.productId}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Add
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  source = "all",
  collectionId,
  columns = 3,
  limit,
  showAddToCart = true,
  className,
}) => {
  const all = resolveProducts(source, collectionId);
  const visible = all.filter((p) => p.status === "active");
  const items = typeof limit === "number" ? visible.slice(0, limit) : visible;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
        No products to display. Add products in the Catalog Manager.
      </div>
    );
  }

  return (
    <div
      className={\`grid gap-6 \${colsClass[columns] ?? colsClass[3]} \${className ?? ""}\`}
      data-ut-product-grid={source}
    >
      {items.map((product) => (
        <ProductCardView
          key={product.productId}
          product={product}
          showAddToCart={showAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
`;
}
