/**
 * CTA Variant: Split Card
 * Two-column layout with text on one side and a visual card on the other.
 * Modern asymmetric CTA with strong visual hierarchy.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const CTASplitCard: React.FC<BaseSectionProps<'cta'>> = ({ section, theme }) => {
  const { headline, description, ctas = [] } = section.props;

  return (
    <section
      style={{
        padding: theme.sectionPadding,
        background: hsl(theme.colors.background),
      }}
    >
      <div
        className="mx-auto px-6"
        style={{ maxWidth: theme.containerWidth }}
      >
        <div
          className="grid items-center gap-8 rounded-2xl overflow-hidden"
          style={{
            gridTemplateColumns: '1fr 1fr',
            background: hsla(theme.colors.card, 1),
            border: `1px solid ${hsla(theme.colors.border, 0.5)}`,
          }}
        >
          {/* Text Column */}
          <div className="p-10">
            <h2
              className="text-3xl mb-4"
              style={{
                fontFamily: theme.typography.headingFont,
                fontWeight: theme.typography.headingWeight,
                color: hsl(theme.colors.foreground),
              }}
            >
              {headline}
            </h2>
            {description && (
              <p
                className="text-base mb-8"
                style={{ fontFamily: theme.typography.bodyFont, color: hsl(theme.colors.mutedForeground) }}
              >
                {description}
              </p>
            )}
            <div className="flex gap-3 flex-wrap">
              {ctas.map((c, i) => (
                <a
                  key={i}
                  href={c.href || '#'}
                  data-intent={c.intent}
                  className="inline-block text-sm font-medium px-6 py-3 transition-all hover:opacity-90"
                  style={
                    c.variant === 'outline'
                      ? {
                          background: 'transparent',
                          color: hsl(theme.colors.foreground),
                          border: `1px solid ${hsla(theme.colors.border, 1)}`,
                          borderRadius: theme.radius,
                        }
                      : {
                          background: hsl(theme.colors.primary),
                          color: hsl(theme.colors.primaryForeground),
                          borderRadius: theme.radius,
                        }
                  }
                >
                  {c.label}
                </a>
              ))}
            </div>
          </div>

          {/* Visual Column */}
          <div
            className="h-full min-h-[280px] flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${hsla(theme.colors.primary, 0.08)}, ${hsla(theme.colors.accent, 0.08)})`,
            }}
          >
            <div className="text-center p-8">
              <div
                className="text-5xl font-bold mb-2"
                style={{ fontFamily: theme.typography.headingFont, color: hsl(theme.colors.primary) }}
              >
                ✦
              </div>
              <div
                className="text-sm font-medium"
                style={{ color: hsl(theme.colors.mutedForeground) }}
              >
                Ready to get started?
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
