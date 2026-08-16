/**
 * Gallery Variant: Cinematic Grid
 * Wide 16:9 frames on a calm, even grid.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { GalleryFrame, GalleryFigure } from './GalleryFrame';

export const GalleryCinematicGrid: React.FC<BaseSectionProps<'gallery'>> = ({ section, theme }) => {
  const { headline, subheadline, items, filterable, columns = 3 } = section.props;

  return (
    <GalleryFrame
      variantId="gallery:cinematic-grid"
      theme={theme}
      headline={headline}
      subheadline={subheadline}
      items={items}
      filterable={filterable}
    >
      {({ items: media, open }) => (
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(columns, 4)}, minmax(0, 1fr))` }}>
          {media.map((item, i) => (
            <GalleryFigure key={i} item={item} theme={theme} aspect="16 / 9" onOpen={() => open(i)} />
          ))}
        </div>
      )}
    </GalleryFrame>
  );
};
