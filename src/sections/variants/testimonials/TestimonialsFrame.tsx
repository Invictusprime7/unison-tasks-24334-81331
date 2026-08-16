/**
 * Testimonials Frame
 *
 * Shared chrome for every testimonials variant: section shell, editorial intro
 * and the canonical proof card. Variants supply only the arrangement.
 */

import React from 'react';
import type { ThemeTokens, TestimonialItem } from '../../types';
import { hsl } from '../../themeUtils';

export const normalizeTestimonials = (items: unknown): TestimonialItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw) => {
      const item = (raw || {}) as Record<string, unknown>;
      const quote = String(item.quote ?? item.text ?? item.body ?? '').trim();
      if (!quote) return null;
      return {
        quote,
        author: String(item.author ?? item.name ?? '').trim(),
        role: item.role ? String(item.role) : item.title ? String(item.title) : undefined,
        avatar: item.avatar ? String(item.avatar) : undefined,
        rating: typeof item.rating === 'number' ? Math.max(0, Math.min(5, Math.round(item.rating))) : undefined,
      } as TestimonialItem;
    })
    .filter(Boolean) as TestimonialItem[];
};

export const Stars: React.FC<{ rating?: number; theme: ThemeTokens }> = ({ rating, theme }) => {
  if (!rating) return null;
  return (
    <div aria-label={`${rating} out of 5`} className="mb-4 text-sm" style={{ color: hsl(theme.colors.accent) }}>
      {'★'.repeat(rating)}
      <span style={{ opacity: 0.35 }}>{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </div>
  );
};

export const TestimonialCard: React.FC<{
  item: TestimonialItem;
  theme: ThemeTokens;
  className?: string;
  emphasis?: boolean;
}> = ({ item, theme, className = '', emphasis }) => (
  <figure
    className={`m-0 flex h-full flex-col justify-between p-8 ${className}`}
    style={{
      background: hsl(theme.colors.card),
      color: hsl(theme.colors.cardForeground),
      border: `1px solid ${hsl(theme.colors.border)}`,
      borderRadius: theme.radius,
    }}
  >
    <div>
      <Stars rating={item.rating} theme={theme} />
      <blockquote
        className={emphasis ? 'mb-6 text-2xl leading-relaxed' : 'mb-6 text-base leading-relaxed'}
        style={{
          fontFamily: emphasis ? theme.typography.headingFont : theme.typography.bodyFont,
          fontWeight: emphasis ? theme.typography.headingWeight : theme.typography.bodyWeight,
        }}
      >
        “{item.quote}”
      </blockquote>
    </div>
    <figcaption className="flex items-center gap-3">
      {item.avatar && (
        <img
          src={item.avatar}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-10 w-10 rounded-full object-cover"
        />
      )}
      <span>
        <span className="block text-sm font-semibold" style={{ fontFamily: theme.typography.headingFont }}>
          {item.author}
        </span>
        {item.role && (
          <span className="block text-xs" style={{ color: hsl(theme.colors.mutedForeground) }}>
            {item.role}
          </span>
        )}
      </span>
    </figcaption>
  </figure>
);

export const TestimonialsFrame: React.FC<{
  variantId: string;
  theme: ThemeTokens;
  headline?: string;
  subheadline?: string;
  surface?: 'background' | 'muted';
  children: React.ReactNode;
}> = ({ variantId, theme, headline, subheadline, surface = 'background', children }) => (
  <section
    data-ut-variant={variantId}
    style={{
      padding: theme.sectionPadding,
      background: hsl(surface === 'muted' ? theme.colors.muted : theme.colors.background),
    }}
  >
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
