/**
 * Features Variant: Icon Left
 * Horizontal rows with icons on the left and text on the right.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const FeaturesIconLeft: React.FC<BaseSectionProps<'features'>> = ({ section, theme }) => {
  const { headline, subheadline, items = [] } = section.props;

  return (
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.background) }}>
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
        {headline && (
          <div className="text-center mb-12">
            <h2
              className="text-3xl mb-3"
              style={{
                fontFamily: theme.typography.headingFont,
                fontWeight: theme.typography.headingWeight,
                color: hsl(theme.colors.foreground),
              }}
            >
              {headline}
            </h2>
            {subheadline && (
              <p className="text-base max-w-lg mx-auto" style={{ color: hsl(theme.colors.mutedForeground) }}>
                {subheadline}
              </p>
            )}
          </div>
        )}
        <div className="grid gap-8" style={{ maxWidth: '48rem', margin: '0 auto' }}>
          {items.map((item, i) => (
            <div key={i} className="flex gap-5 items-start">
              <div
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-xl rounded-xl"
                style={{
                  background: hsla(theme.colors.primary, 0.1),
                  color: hsl(theme.colors.primary),
                }}
              >
                {item.icon || '✦'}
              </div>
              <div>
                <h3
                  className="text-lg mb-1"
                  style={{
                    fontFamily: theme.typography.headingFont,
                    fontWeight: theme.typography.headingWeight,
                    color: hsl(theme.colors.foreground),
                  }}
                >
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: hsl(theme.colors.mutedForeground) }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
