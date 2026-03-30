import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const FAQSection: React.FC<BaseSectionProps<'faq'>> = ({ section, theme }) => {
  const { headline, subheadline, items = [] } = section.props;

  return (
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.background) }}>
      <div className="mx-auto px-6" style={{ maxWidth: '720px' }}>
        {headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-3" style={{ fontFamily: theme.typography.headingFont, fontWeight: theme.typography.headingWeight, color: hsl(theme.colors.foreground) }}>{headline}</h2>
            {subheadline && <p className="text-base max-w-lg mx-auto" style={{ color: hsl(theme.colors.mutedForeground) }}>{subheadline}</p>}
          </div>
        )}
        <div className="space-y-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group p-4"
              style={{
                background: hsl(theme.colors.card),
                border: `1px solid ${hsla(theme.colors.border, 0.6)}`,
                borderRadius: theme.radius,
              }}
            >
              <summary
                className="text-sm font-medium cursor-pointer list-none flex justify-between items-center"
                style={{ color: hsl(theme.colors.cardForeground) }}
              >
                {item.question}
                <span className="text-xs ml-2" style={{ color: hsl(theme.colors.mutedForeground) }}>+</span>
              </summary>
              <p className="text-sm leading-relaxed mt-3 pt-3" style={{ color: hsl(theme.colors.mutedForeground), borderTop: `1px solid ${hsla(theme.colors.border, 0.3)}` }}>
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
