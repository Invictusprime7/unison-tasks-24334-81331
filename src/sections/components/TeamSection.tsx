import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const TeamSection: React.FC<BaseSectionProps<'team'>> = ({ section, theme }) => {
  const { headline, subheadline, members = [], columns = 3 } = section.props;

  return (
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.background) }}>
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
        {headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-3" style={{ fontFamily: theme.typography.headingFont, fontWeight: theme.typography.headingWeight, color: hsl(theme.colors.foreground) }}>{headline}</h2>
            {subheadline && <p className="text-base max-w-lg mx-auto" style={{ color: hsl(theme.colors.mutedForeground) }}>{subheadline}</p>}
          </div>
        )}
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {members.map((m, i) => (
            <div key={i} className="text-center p-6" style={{ background: hsl(theme.colors.card), borderRadius: theme.radius, border: `1px solid ${hsla(theme.colors.border, 0.6)}` }}>
              <h3 className="text-lg mb-1" style={{ fontFamily: theme.typography.headingFont, color: hsl(theme.colors.cardForeground) }}>{m.name}</h3>
              <p className="text-sm" style={{ color: hsl(theme.colors.mutedForeground) }}>{m.role}</p>
              {m.bio && <p className="text-sm mt-2 leading-relaxed" style={{ color: hsl(theme.colors.mutedForeground) }}>{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
