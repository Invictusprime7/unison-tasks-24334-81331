/**
 * CTA Variant: Gradient Banner
 * Full-width gradient background with bold headline and buttons.
 * High-visibility, immersive call-to-action.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const CTAGradientBanner: React.FC<BaseSectionProps<'cta'>> = ({ section, theme }) => {
  const { headline, description, ctas = [] } = section.props;

  return (
    <section
      className="relative overflow-hidden text-center"
      style={{
        padding: '5rem 1rem',
        background: `linear-gradient(135deg, ${hsl(theme.colors.primary)}, ${hsl(theme.colors.secondary)})`,
      }}
    >
      {/* Decorative overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }}
      />

      <div className="mx-auto px-6 relative" style={{ maxWidth: '700px' }}>
        <h2
          className="text-3xl md:text-4xl mb-4"
          style={{
            fontFamily: theme.typography.headingFont,
            fontWeight: theme.typography.headingWeight,
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}
        >
          {headline}
        </h2>
        {description && (
          <p
            className="text-base max-w-lg mx-auto mb-8"
            style={{ fontFamily: theme.typography.bodyFont, color: 'rgba(255,255,255,0.85)' }}
          >
            {description}
          </p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
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
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: theme.radius,
                    }
                  : {
                      background: '#ffffff',
                      color: hsl(theme.colors.primary),
                      borderRadius: theme.radius,
                      fontWeight: '600',
                    }
              }
            >
              {c.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
