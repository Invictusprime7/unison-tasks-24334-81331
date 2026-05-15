/**
 * Host-side ProductGrid
 * --------------------------------------------------------------
 * Mirrors the VFS `@/unison/products` ProductGrid API. Reads from
 * the canonical CreatorData payload (via `buildUnisonData`) so the
 * editor preview and the generated site stay byte-identical in
 * terms of catalog content.
 */
import React, { useMemo } from 'react';
import type { CreatorData } from '@/types/creatorData';
import { buildUnisonData } from '@/services/unisonDataGenerator';
import { ProductCard } from './ProductCard';

export type ProductSource = 'all' | 'featured' | 'collection';

export interface ProductGridProps {
  creatorData: CreatorData;
  source?: ProductSource;
  collectionId?: string;
  columns?: 1 | 2 | 3 | 4;
  limit?: number;
  showAddToCart?: boolean;
  primaryColor?: string;
  className?: string;
}

const colsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  creatorData,
  source = 'all',
  collectionId,
  columns = 3,
  limit,
  showAddToCart = true,
  primaryColor,
  className,
}) => {
  const items = useMemo(() => {
    const data = buildUnisonData(creatorData);
    let pool = data.products;
    if (source === 'featured') {
      pool = pool.filter((p) => p.featured);
    } else if (source === 'collection' && collectionId) {
      const col = data.collections.find((c) => c.collectionId === collectionId);
      const set = new Set(col?.itemIds ?? []);
      pool = pool.filter((p) => set.has(p.productId));
    }
    pool = pool.filter((p) => p.status !== 'archived' && p.status !== 'draft');
    return typeof limit === 'number' ? pool.slice(0, limit) : pool;
  }, [creatorData, source, collectionId, limit]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
        No products to display. Add products in the Catalog Manager.
      </div>
    );
  }

  return (
    <div
      className={`grid gap-6 ${colsClass[columns] ?? colsClass[3]} ${className ?? ''}`}
      data-ut-product-grid={source}
    >
      {items.map((p) => (
        <ProductCard
          key={p.productId}
          productId={p.productId}
          creatorData={creatorData}
          showAddToCart={showAddToCart}
          primaryColor={primaryColor}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
