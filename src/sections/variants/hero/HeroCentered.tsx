/**
 * Hero Variant: Centered
 * Classic centered layout with headline, subheadline, and CTA buttons.
 * This is the default hero style.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const HeroCentered: React.FC<BaseSectionProps<'hero'>> = ({ section, theme }) => {
  const { headline, subheadline, ctas = [], badge, stats } = section.props;

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: theme.sectionPadding,
        paddingTop: '8rem',
        background: hsl(theme.colors.background),
      }}
    >
      <div className="mx-auto relative text-center" style={{ maxWidth: theme.containerWidth }}>
        {badge && (
          <span
            className="inline-block text-xs font-medium tracking-wide uppercase mb-6 px-3 py-1 rounded-full"
            style={{
              color: hsl(theme.colors.primary),
              background: hsla(theme.colors.primary, 0.08),
              border: `1px solid ${hsla(theme.colors.primary, 0.15)}`,
            }}
          >
            {badge}
          </span>
        )}

        <h1
          className="leading-tight mb-6"
          style={{
            fontFamily: theme.typography.headingFont,
            fontWeight: theme.typography.headingWeight,
            color: hsl(theme.colors.foreground),
            fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
            letterSpacing: '-0.02em',
          }}
        >
          {headline}
        </h1>

        {subheadline && (
          <p
            className="text-lg leading-relaxed mb-8"
            style={{
              fontFamily: theme.typography.bodyFont,
              color: hsl(theme.colors.mutedForeground),
              maxWidth: '580px',
              margin: '0 auto 2rem',
            }}
          >
            {subheadline}
          </p>
        )}

        {ctas.length > 0 && (
          <div className="flex gap-3 flex-wrap justify-center">
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
        )}

        {stats && stats.length > 0 && (
          <div className="flex gap-10 mt-12 flex-wrap justify-center">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-3xl font-bold"
                  style={{ fontFamily: theme.typography.headingFont, color: hsl(theme.colors.primary) }}
                >
                  {s.value}
                </div>
                <div className="text-xs uppercase tracking-widest mt-1" style={{ color: hsl(theme.colors.mutedForeground) }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
