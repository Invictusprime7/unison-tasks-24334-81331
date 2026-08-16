/**
 * Pricing Variant: Tiers
 * Classic side-by-side plan cards with a highlighted recommendation.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl } from '../../themeUtils';
import { PricingFrame, PricingCTA, normalizePricingTiers } from './PricingFrame';

export const PricingTiers: React.FC<BaseSectionProps<'pricing'>> = ({ section, theme }) => {
  const tiers = normalizePricingTiers(section.props.tiers, (section.props as Record<string, unknown>).items);
  const cols = tiers.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : tiers.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <PricingFrame
      variantId="pricing:tiers"
      theme={theme}
      headline={section.props.headline}
      subheadline={section.props.subheadline}
    >
      <div className={`grid items-start gap-6 ${cols}`}>
        {tiers.map((tier, i) => (
          <article
            key={i}
            className="flex h-full flex-col p-8"
            style={{
              background: hsl(theme.colors.card),
              color: hsl(theme.colors.cardForeground),
              borderRadius: theme.radius,
              border: `1px solid ${tier.highlighted ? hsl(theme.colors.primary) : hsl(theme.colors.border)}`,
              boxShadow: tier.highlighted ? '0 24px 60px -32px rgba(0,0,0,0.45)' : undefined,
            }}
          >
            {tier.badge && (
              <span
                className="mb-3 inline-flex w-fit px-2 py-1 text-xs font-semibold"
                style={{ borderRadius: theme.radius, background: hsl(theme.colors.accent), color: hsl(theme.colors.accentForeground) }}
              >
                {tier.badge}
              </span>
            )}
            <h3 className="text-lg font-semibold" style={{ fontFamily: theme.typography.headingFont }}>{tier.name}</h3>
            <p className="mt-2 text-3xl font-semibold" style={{ fontFamily: theme.typography.headingFont }}>
              {tier.price}
              {tier.period && <span className="text-sm font-normal" style={{ color: hsl(theme.colors.mutedForeground) }}> /{tier.period}</span>}
            </p>
            {tier.description && (
              <p className="mt-2 text-sm" style={{ color: hsl(theme.colors.mutedForeground) }}>{tier.description}</p>
            )}
            <ul className="mt-6 flex-1 list-none space-y-2 p-0 text-sm">
              {tier.features.map((feature, fi) => (
                <li key={fi} className="flex gap-2">
                  <span aria-hidden="true" style={{ color: hsl(theme.colors.primary) }}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <PricingCTA tier={tier} theme={theme} />
          </article>
        ))}
      </div>
    </PricingFrame>
  );
};
