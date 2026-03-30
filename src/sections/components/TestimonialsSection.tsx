import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const TestimonialsSection: React.FC<BaseSectionProps<'testimonials'>> = ({ section, theme }) => {
  const { headline, subheadline, items = [] } = section.props;

  return (
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.muted) }}>
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

        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(3, items.length)}, 1fr)` }}>
          {items.map((item, i) => (
            <div
              key={i}
              className="p-6"
              style={{
                background: hsl(theme.colors.card),
                border: `1px solid ${hsla(theme.colors.border, 0.6)}`,
                borderRadius: theme.radius,
              }}
            >
              {item.rating && (
                <div className="mb-3 text-sm" style={{ color: hsl(theme.colors.accent) }}>
                  {'★'.repeat(item.rating)}
                  {'☆'.repeat(5 - item.rating)}
                </div>
              )}
              <blockquote
                className="text-sm leading-relaxed mb-4 italic"
                style={{
                  fontFamily: theme.typography.bodyFont,
                  color: hsl(theme.colors.cardForeground),
                  borderLeft: `2px solid ${hsla(theme.colors.primary, 0.3)}`,
                  paddingLeft: '1rem',
                }}
              >
                "{item.quote}"
              </blockquote>
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ fontFamily: theme.typography.headingFont, color: hsl(theme.colors.cardForeground) }}
                >
                  {item.author}
                </div>
                {item.role && (
                  <div className="text-xs mt-0.5" style={{ color: hsl(theme.colors.mutedForeground) }}>
                    {item.role}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
