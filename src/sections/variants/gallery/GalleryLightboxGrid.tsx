/**
 * Gallery Variant: Lightbox Grid
 * Square inspection grid with prominent zoom affordance.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { GalleryFrame, GalleryFigure } from './GalleryFrame';

export const GalleryLightboxGrid: React.FC<BaseSectionProps<'gallery'>> = ({ section, theme }) => {
  const { headline, subheadline, items, filterable, columns = 3 } = section.props;

  return (
    <GalleryFrame
      variantId="gallery:lightbox-grid"
      theme={theme}
      headline={headline}
      subheadline={subheadline}
      items={items}
      filterable={filterable}
    >
      {({ items: media, open }) => (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(columns, 4)}, minmax(0, 1fr))` }}>
          {media.map((item, i) => (
            <GalleryFigure key={i} item={item} theme={theme} aspect="1 / 1" onOpen={() => open(i)} />
          ))}
        </div>
      )}
    </GalleryFrame>
  );
};
