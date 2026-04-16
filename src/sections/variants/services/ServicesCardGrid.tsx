/**
 * Services Variant: Card Grid
 * Default card-based grid with badge, price, and CTA support.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const ServicesCardGrid: React.FC<BaseSectionProps<'services'>> = ({ section, theme }) => {
  const { headline, subheadline, items = [], columns = 3 } = section.props;

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
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${Math.min(columns, items.length)}, 1fr)` }}
        >
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
              {item.badge && (
                <span
                  className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3"
                  style={{ background: hsla(theme.colors.primary, 0.1), color: hsl(theme.colors.primary) }}
                >
                  {item.badge}
                </span>
              )}
              <h3
                className="text-lg mb-2"
                style={{
                  fontFamily: theme.typography.headingFont,
                  fontWeight: theme.typography.headingWeight,
                  color: hsl(theme.colors.cardForeground),
                }}
              >
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: hsl(theme.colors.mutedForeground) }}>
                {item.description}
              </p>
              {(item.price || item.duration) && (
                <div className="flex items-baseline gap-2">
                  {item.price && (
                    <span className="text-xl font-semibold" style={{ color: hsl(theme.colors.primary) }}>
                      {item.price}
                    </span>
                  )}
                  {item.duration && (
                    <span className="text-xs" style={{ color: hsl(theme.colors.mutedForeground) }}>
                      {item.duration}
                    </span>
                  )}
                </div>
              )}
              {item.cta && (
                <a
                  href={item.cta.href || '#'}
                  data-intent={item.cta.intent}
                  className="inline-block mt-4 text-sm font-medium px-4 py-2 transition-all hover:opacity-90"
                  style={{
                    background: hsl(theme.colors.primary),
                    color: hsl(theme.colors.primaryForeground),
                    borderRadius: theme.radius,
                  }}
                >
                  {item.cta.label}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
