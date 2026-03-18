/**
 * Contact Variant: Minimal Inline
 * Compact single-row form with email + message, contact info as pills.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const ContactMinimalInline: React.FC<BaseSectionProps<'contact'>> = ({ section, theme }) => {
  const { headline, description, submitLabel = 'Send', phone, email, address } = section.props;

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.65rem 0.85rem',
    borderRadius: theme.radius,
    border: `1px solid ${hsla(theme.colors.border, 0.8)}`,
    background: hsl(theme.colors.card),
    color: hsl(theme.colors.cardForeground),
    fontFamily: theme.typography.bodyFont,
    fontSize: '0.875rem',
    outline: 'none',
  };

  return (
    <section
      style={{
        padding: theme.sectionPadding,
        background: `linear-gradient(135deg, ${hsla(theme.colors.primary, 0.04)}, ${hsla(theme.colors.secondary, 0.04)})`,
      }}
    >
      <div className="mx-auto px-6 text-center" style={{ maxWidth: '48rem' }}>
        {headline && (
          <h2
            className="text-3xl mb-3"
            style={{
              fontFamily: theme.typography.headingFont,
              fontWeight: theme.typography.headingWeight,
              color: hsl(theme.colors.foreground),
            }}
          >
            {headline}
          </h2>
        )}
        {description && (
          <p className="text-base mb-8 max-w-md mx-auto" style={{ color: hsl(theme.colors.mutedForeground) }}>
            {description}
          </p>
        )}

        <form
          data-demo-form="true"
          data-intent="contact.submit"
          className="flex gap-3 mb-6"
          style={{ maxWidth: '36rem', margin: '0 auto' }}
        >
          <input type="email" placeholder="your@email.com" style={inputStyle} />
          <input type="text" placeholder="Message" style={inputStyle} />
          <button
            type="submit"
            className="text-sm font-medium px-6 py-2.5 transition-all hover:opacity-90 cursor-pointer flex-shrink-0"
            style={{
              background: hsl(theme.colors.primary),
              color: hsl(theme.colors.primaryForeground),
              borderRadius: theme.radius,
              border: 'none',
              fontFamily: theme.typography.bodyFont,
            }}
          >
            {submitLabel}
          </button>
        </form>

        {(phone || email || address) && (
          <div className="flex gap-4 justify-center flex-wrap">
            {[email, phone, address].filter(Boolean).map((info, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: hsl(theme.colors.card),
                  color: hsl(theme.colors.mutedForeground),
                  border: `1px solid ${hsla(theme.colors.border, 0.5)}`,
                }}
              >
                {info}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
