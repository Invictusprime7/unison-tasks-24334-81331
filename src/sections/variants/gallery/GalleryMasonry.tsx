/**
 * Gallery Variant: Masonry
 * Column-flow masonry with natural image heights.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { GalleryFrame, GalleryFigure } from './GalleryFrame';

export const GalleryMasonry: React.FC<BaseSectionProps<'gallery'>> = ({ section, theme }) => {
  const { headline, subheadline, items, filterable, columns = 3 } = section.props;

  return (
    <GalleryFrame
      variantId="gallery:masonry"
      theme={theme}
      headline={headline}
      subheadline={subheadline}
      items={items}
      filterable={filterable}
    >
      {({ items: media, open }) => (
        <div
          className="[column-fill:_balance] gap-4"
          style={{ columnCount: Math.min(columns, 4), columnGap: '1rem' }}
        >
          {media.map((item, i) => (
            <div key={i} className="mb-4 break-inside-avoid">
              <GalleryFigure
                item={item}
                theme={theme}
                onOpen={() => open(i)}
                aspect={i % 3 === 0 ? '3 / 4' : i % 3 === 1 ? '1 / 1' : '4 / 5'}
              />
            </div>
          ))}
        </div>
      )}
    </GalleryFrame>
  );
};
