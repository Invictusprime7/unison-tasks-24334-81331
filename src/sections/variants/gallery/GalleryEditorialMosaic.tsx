/**
 * Gallery Variant: Editorial Mosaic
 * Asymmetric mosaic with dominant hero tiles and controlled gutters.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { GalleryFrame, GalleryFigure } from './GalleryFrame';

export const GalleryEditorialMosaic: React.FC<BaseSectionProps<'gallery'>> = ({ section, theme }) => {
  const { headline, subheadline, items, filterable } = section.props;

  return (
    <GalleryFrame
      variantId="gallery:editorial-mosaic"
      theme={theme}
      headline={headline}
      subheadline={subheadline}
      items={items}
      filterable={filterable}
    >
      {({ items: media, open }) => (
        <div className="grid auto-rows-[var(--ut-tile-block)] grid-cols-2 gap-4 lg:grid-cols-4">
          {media.map((item, i) => (
            <GalleryFigure
              key={i}
              item={item}
              theme={theme}
              onOpen={() => open(i)}
              className={i % 5 === 0 ? 'col-span-2 row-span-2' : i % 7 === 3 ? 'col-span-2' : ''}
            />
          ))}
        </div>
      )}
    </GalleryFrame>
  );
};
