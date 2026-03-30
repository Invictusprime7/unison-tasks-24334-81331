import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const AboutSection: React.FC<BaseSectionProps<'about'>> = ({ section, theme }) => {
  const { headline, description, image, cta, layout = 'centered' } = section.props;

  return (
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.background) }}>
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth, textAlign: layout === 'centered' ? 'center' : 'left' }}>
        {headline && (
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
        )}
        <p
          className="text-base leading-relaxed max-w-2xl"
          style={{
            fontFamily: theme.typography.bodyFont,
            color: hsl(theme.colors.mutedForeground),
            margin: layout === 'centered' ? '0 auto' : undefined,
          }}
        >
          {description}
        </p>
        {cta && (
          <a
            href={cta.href || '#'}
            data-intent={cta.intent}
            className="inline-block mt-6 text-sm font-medium px-6 py-3 transition-all hover:opacity-90"
            style={{
              background: hsl(theme.colors.primary),
              color: hsl(theme.colors.primaryForeground),
              borderRadius: theme.radius,
            }}
          >
            {cta.label}
          </a>
        )}
      </div>
    </section>
  );
};
