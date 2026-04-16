/**
 * Contact Variant: Split Card
 * Two-column layout — form on the left, contact info card on the right.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const ContactSplitCard: React.FC<BaseSectionProps<'contact'>> = ({ section, theme }) => {
  const { headline, description, submitLabel = 'Send Message', phone, email, address } = section.props;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: theme.radius,
    border: `1px solid ${hsla(theme.colors.border, 0.8)}`,
    background: hsl(theme.colors.background),
    color: hsl(theme.colors.foreground),
    fontFamily: theme.typography.bodyFont,
    fontSize: '0.875rem',
    outline: 'none',
  };

  return (
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.background) }}>
      <div className="mx-auto px-6" style={{ maxWidth: theme.containerWidth }}>
        {headline && (
          <div className="text-center mb-12">
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
            {description && (
              <p className="text-base max-w-lg mx-auto" style={{ color: hsl(theme.colors.mutedForeground) }}>
                {description}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-8 items-start" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '56rem', margin: '0 auto' }}>
          <form data-demo-form="true" data-intent="contact.submit" className="flex flex-col gap-3">
            <input type="text" placeholder="Your name" style={inputStyle} />
            <input type="email" placeholder="your@email.com" style={inputStyle} />
            <textarea placeholder="Your message..." rows={5} style={inputStyle} />
            <button
              type="submit"
              className="w-full text-sm font-medium py-3 transition-all hover:opacity-90 cursor-pointer"
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

          <div
            className="p-8 flex flex-col gap-6"
            style={{
              background: hsl(theme.colors.card),
              border: `1px solid ${hsla(theme.colors.border, 0.6)}`,
              borderRadius: theme.radius,
            }}
          >
            <h3
              className="text-lg"
              style={{
                fontFamily: theme.typography.headingFont,
                fontWeight: theme.typography.headingWeight,
                color: hsl(theme.colors.cardForeground),
              }}
            >
              Get in Touch
            </h3>
            {email && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: hsl(theme.colors.mutedForeground) }}>Email</p>
                <p className="text-sm" style={{ color: hsl(theme.colors.cardForeground) }}>{email}</p>
              </div>
            )}
            {phone && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: hsl(theme.colors.mutedForeground) }}>Phone</p>
                <p className="text-sm" style={{ color: hsl(theme.colors.cardForeground) }}>{phone}</p>
              </div>
            )}
            {address && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: hsl(theme.colors.mutedForeground) }}>Address</p>
                <p className="text-sm" style={{ color: hsl(theme.colors.cardForeground) }}>{address}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
