import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const StatsSection: React.FC<BaseSectionProps<'stats'>> = ({ section, theme }) => {
  const { headline, items = [] } = section.props;

  return (
    <section
      style={{
        padding: theme.sectionPadding,
        background: hsla(theme.colors.primary, 0.03),
        borderTop: `1px solid ${hsla(theme.colors.border, 0.3)}`,
        borderBottom: `1px solid ${hsla(theme.colors.border, 0.3)}`,
      }}
    >
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
        {headline && (
          <h2
            className="text-2xl text-center mb-10"
            style={{
              fontFamily: theme.typography.headingFont,
              fontWeight: theme.typography.headingWeight,
              color: hsl(theme.colors.foreground),
            }}
          >
            {headline}
          </h2>
        )}
        <div className="flex justify-center gap-16 flex-wrap">
          {items.map((s, i) => (
            <div key={i} className="text-center">
              <div
                className="text-4xl font-bold leading-none"
                style={{ fontFamily: theme.typography.headingFont, color: hsl(theme.colors.primary) }}
              >
                {s.value}
              </div>
              <div
                className="text-xs uppercase tracking-widest mt-2"
                style={{ color: hsl(theme.colors.mutedForeground) }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
