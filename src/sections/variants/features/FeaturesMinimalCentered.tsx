/**
 * Features Variant: Minimal Centered
 * Clean centered layout with subtle dividers between items.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const FeaturesMinimalCentered: React.FC<BaseSectionProps<'features'>> = ({ section, theme }) => {
  const { headline, subheadline, items = [], columns = 3 } = section.props;

  return (
    <section
      style={{
        padding: theme.sectionPadding,
        background: hsl(theme.colors.muted),
      }}
    >
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
        {headline && (
          <div className="text-center mb-14">
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
        <div className="grid gap-10 text-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {items.map((item, i) => (
            <div key={i}>
              {item.icon && (
                <div
                  className="mx-auto w-14 h-14 flex items-center justify-center text-2xl rounded-full mb-4"
                  style={{
                    background: hsla(theme.colors.primary, 0.08),
                    color: hsl(theme.colors.primary),
                  }}
                >
                  {item.icon}
                </div>
              )}
              <h3
                className="text-lg mb-2"
                style={{
                  fontFamily: theme.typography.headingFont,
                  fontWeight: theme.typography.headingWeight,
                  color: hsl(theme.colors.foreground),
                }}
              >
                {item.title}
              </h3>
              <p
                className="text-sm leading-relaxed max-w-xs mx-auto"
                style={{ color: hsl(theme.colors.mutedForeground) }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
