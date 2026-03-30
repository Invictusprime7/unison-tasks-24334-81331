import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const PricingSection: React.FC<BaseSectionProps<'pricing'>> = ({ section, theme }) => {
  const { headline, subheadline, tiers = [] } = section.props;

  return (
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.background) }}>
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
        {headline && (
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-3" style={{ fontFamily: theme.typography.headingFont, fontWeight: theme.typography.headingWeight, color: hsl(theme.colors.foreground) }}>{headline}</h2>
            {subheadline && <p className="text-base max-w-lg mx-auto" style={{ color: hsl(theme.colors.mutedForeground) }}>{subheadline}</p>}
          </div>
        )}
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(3, tiers.length)}, 1fr)` }}>
          {tiers.map((tier, i) => (
            <div
              key={i}
              className="p-6 flex flex-col"
              style={{
                background: hsl(theme.colors.card),
                border: tier.highlighted ? `2px solid ${hsl(theme.colors.primary)}` : `1px solid ${hsla(theme.colors.border, 0.6)}`,
                borderRadius: theme.radius,
              }}
            >
              <h3 className="text-lg mb-1" style={{ fontFamily: theme.typography.headingFont, color: hsl(theme.colors.cardForeground) }}>{tier.name}</h3>
              <div className="text-3xl font-bold mb-4" style={{ color: hsl(theme.colors.foreground) }}>{tier.price}<span className="text-sm font-normal" style={{ color: hsl(theme.colors.mutedForeground) }}>{tier.period && ` / ${tier.period}`}</span></div>
              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((f, j) => (
                  <li key={j} className="text-sm" style={{ color: hsl(theme.colors.mutedForeground) }}>✓ {f}</li>
                ))}
              </ul>
              <a
                href={tier.cta.href || '#'}
                data-intent={tier.cta.intent}
                className="block text-center text-sm font-medium py-2.5 transition-all hover:opacity-90"
                style={{
                  background: tier.highlighted ? hsl(theme.colors.primary) : 'transparent',
                  color: tier.highlighted ? hsl(theme.colors.primaryForeground) : hsl(theme.colors.foreground),
                  border: tier.highlighted ? 'none' : `1px solid ${hsla(theme.colors.border, 1)}`,
                  borderRadius: theme.radius,
                }}
              >
                {tier.cta.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
