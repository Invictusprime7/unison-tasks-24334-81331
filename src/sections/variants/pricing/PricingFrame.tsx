/**
 * Pricing Frame
 *
 * Shared chrome for every pricing variant: section shell, intro and tier
 * normalization. Variants own only the arrangement of the tiers.
 */

import React from 'react';
import type { ThemeTokens, PricingTier } from '../../types';
import { hsl } from '../../themeUtils';

export const normalizePricingTiers = (tiers: unknown, fallback?: unknown): PricingTier[] => {
  const source = Array.isArray(tiers) && tiers.length ? tiers : Array.isArray(fallback) ? fallback : [];
  return source
    .map((raw) => {
      const tier = (raw || {}) as Record<string, any>;
      const name = String(tier.name ?? tier.title ?? '').trim();
      if (!name) return null;
      return {
        name,
        price: String(tier.price ?? ''),
        period: tier.period ? String(tier.period) : tier.duration ? String(tier.duration) : undefined,
        description: tier.description ? String(tier.description) : undefined,
        features: Array.isArray(tier.features) ? tier.features.map((f: unknown) => String(f)) : [],
        cta: tier.cta
          ? { label: String(tier.cta.label ?? tier.cta.text ?? 'Get started'), href: tier.cta.href, intent: tier.cta.intent, variant: tier.cta.variant }
          : { label: 'Get started', href: '#contact', variant: 'primary' as const },
        highlighted: Boolean(tier.highlighted || tier.featured),
        badge: tier.badge ? String(tier.badge) : undefined,
      } as PricingTier;
    })
    .filter(Boolean) as PricingTier[];
};

export const PricingCTA: React.FC<{ tier: PricingTier; theme: ThemeTokens }> = ({ tier, theme }) => {
  const primary = Boolean(tier.highlighted || !tier.cta?.variant || tier.cta.variant === 'primary');
  return (
    <a
      href={tier.cta?.href || '#contact'}
      data-ut-intent="lead.capture"
      className="mt-6 inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold no-underline"
      style={{
        borderRadius: theme.radius,
        fontFamily: theme.typography.bodyFont,
        background: primary ? hsl(theme.colors.primary) : 'transparent',
        color: primary ? hsl(theme.colors.primaryForeground) : hsl(theme.colors.foreground),
        border: `1px solid ${primary ? hsl(theme.colors.primary) : hsl(theme.colors.border)}`,
      }}
    >
      {tier.cta?.label || 'Get started'}
    </a>
  );
};

export const PricingFrame: React.FC<{
  variantId: string;
  theme: ThemeTokens;
  headline?: string;
  subheadline?: string;
  children: React.ReactNode;
}> = ({ variantId, theme, headline, subheadline, children }) => (
  <section data-ut-variant={variantId} style={{ padding: theme.sectionPadding, background: hsl(theme.colors.muted) }}>
    <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
      {(headline || subheadline) && (
        <div className="mb-12 text-center">
          {headline && (
            <h2
              className="mb-3 text-3xl"
              style={{
                fontFamily: theme.typography.headingFont,
                fontWeight: theme.typography.headingWeight,
                color: hsl(theme.colors.foreground),
              }}
            >
              {headline}
            </h2>
          )}
          {subheadline && (
            <p
              className="mx-auto max-w-2xl text-base"
              style={{ fontFamily: theme.typography.bodyFont, color: hsl(theme.colors.mutedForeground) }}
            >
              {subheadline}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  </section>
);
