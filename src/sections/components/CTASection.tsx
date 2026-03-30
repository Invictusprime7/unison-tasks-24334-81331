import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const CTASection: React.FC<BaseSectionProps<'cta'>> = ({ section, theme }) => {
  const { headline, description, ctas = [] } = section.props;

  return (
    <section
      className="text-center"
      style={{
        padding: theme.sectionPadding,
        background: hsla(theme.colors.primary, 0.04),
        borderTop: `1px solid ${hsla(theme.colors.border, 0.4)}`,
        borderBottom: `1px solid ${hsla(theme.colors.border, 0.4)}`,
      }}
    >
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
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
            className="text-base max-w-lg mx-auto mb-8"
            style={{ fontFamily: theme.typography.bodyFont, color: hsl(theme.colors.mutedForeground) }}
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
    </section>
  );
};
