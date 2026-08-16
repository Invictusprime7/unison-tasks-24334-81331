/**
 * Gallery Variant: Feature Split
 * One dominant feature image beside a stacked supporting grid.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { GalleryFrame, GalleryFigure } from './GalleryFrame';

export const GalleryFeatureSplit: React.FC<BaseSectionProps<'gallery'>> = ({ section, theme }) => {
  const { headline, subheadline, items, filterable } = section.props;

  return (
    <GalleryFrame
      variantId="gallery:feature-split"
      theme={theme}
      headline={headline}
      subheadline={subheadline}
      items={items}
      filterable={filterable}
    >
      {({ items: media, open }) => {
        const [feature, ...rest] = media;
        if (!feature) return null;
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <GalleryFigure item={feature} theme={theme} aspect="4 / 5" onOpen={() => open(0)} />
            <div className="grid grid-cols-2 gap-4 self-start">
              {rest.map((item, i) => (
                <GalleryFigure key={i} item={item} theme={theme} aspect="1 / 1" onOpen={() => open(i + 1)} />
              ))}
            </div>
          </div>
        );
      }}
    </GalleryFrame>
  );
};
