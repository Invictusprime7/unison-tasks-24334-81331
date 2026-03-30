/**
 * Hero Variant: Split Image
 * Two-column layout with text on the left and a hero image on the right.
 * Modern SaaS-style split hero.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const HeroSplitImage: React.FC<BaseSectionProps<'hero'>> = ({ section, theme }) => {
  const { headline, subheadline, ctas = [], badge, stats, image } = section.props;

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: theme.sectionPadding,
        paddingTop: '6rem',
        background: hsl(theme.colors.background),
      }}
    >
      <div
        className="mx-auto relative grid items-center gap-12"
        style={{
          maxWidth: theme.containerWidth,
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        {/* Text Column */}
        <div>
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
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
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
              }}
            >
              {subheadline}
            </p>
          )}

          {ctas.length > 0 && (
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
          )}

          {stats && stats.length > 0 && (
            <div className="flex gap-8 mt-10 flex-wrap">
              {stats.map((s, i) => (
                <div key={i}>
                  <div
                    className="text-2xl font-bold"
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

        {/* Image Column */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            aspectRatio: '4/3',
            background: hsla(theme.colors.muted, 0.2),
          }}
        >
          {image ? (
            <img
              src={image}
              alt={headline}
              className="w-full h-full object-cover"
              style={{ borderRadius: theme.radius }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${hsla(theme.colors.primary, 0.1)}, ${hsla(theme.colors.secondary, 0.1)})`,
                borderRadius: theme.radius,
              }}
            >
              <div style={{ color: hsl(theme.colors.mutedForeground), fontSize: '0.875rem' }}>
                Hero Image
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
