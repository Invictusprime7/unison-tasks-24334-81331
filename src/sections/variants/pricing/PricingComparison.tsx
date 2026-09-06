/**
 * Pricing Variant: Comparison
 * Feature matrix comparing every plan on one axis.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl } from '../../themeUtils';
import { PricingFrame, PricingCTA, normalizePricingTiers } from './PricingFrame';

export const PricingComparison: React.FC<BaseSectionProps<'pricing'>> = ({ section, theme }) => {
  const tiers = normalizePricingTiers(section.props.tiers, (section.props as Record<string, unknown>).items);
  const rows = Array.from(new Set(tiers.flatMap((tier) => tier.features)));

  return (
    <PricingFrame
      variantId="pricing:comparison"
      theme={theme}
      headline={section.props.headline}
      subheadline={section.props.subheadline}
    >
      <div className="overflow-x-auto" style={{ borderRadius: theme.radius, border: `1px solid ${hsl(theme.colors.border)}`, background: hsl(theme.colors.card) }}>
        <table className="w-full border-collapse text-left text-sm" style={{ color: hsl(theme.colors.cardForeground) }}>
          <caption className="sr-only">Plan comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="p-4" style={{ fontFamily: theme.typography.headingFont }}>Features</th>
              {tiers.map((tier, i) => (
                <th key={i} scope="col" className="p-4" style={{ fontFamily: theme.typography.headingFont }}>
                  <span className="block">{tier.name}</span>
                  <span className="block text-base font-semibold">{tier.price}{tier.period ? `/${tier.period}` : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((feature, ri) => (
              <tr key={ri} style={{ borderTop: `1px solid ${hsl(theme.colors.border)}` }}>
                <th scope="row" className="p-4 font-normal">{feature}</th>
                {tiers.map((tier, ti) => (
                  <td key={ti} className="p-4">
                    <span aria-label={tier.features.includes(feature) ? 'Included' : 'Not included'} style={{ color: tier.features.includes(feature) ? hsl(theme.colors.primary) : hsl(theme.colors.mutedForeground) }}>
                      {tier.features.includes(feature) ? '✓' : '—'}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            <tr style={{ borderTop: `1px solid ${hsl(theme.colors.border)}` }}>
              <td className="p-4" />
              {tiers.map((tier, i) => (
                <td key={i} className="p-4 align-top">
                  <PricingCTA tier={tier} theme={theme} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </PricingFrame>
  );
};
