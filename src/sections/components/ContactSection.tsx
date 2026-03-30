import React from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';

export const ContactSection: React.FC<BaseSectionProps<'contact'>> = ({ section, theme }) => {
  const { headline, description, submitLabel = 'Send Message', phone, email, address } = section.props;

  const inputStyle: React.CSSProperties = {
    width: '100%',
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
    <section style={{ padding: theme.sectionPadding, background: hsl(theme.colors.muted) }}>
      <div className="mx-auto px-6" style={{ maxWidth: '640px' }}>
        {headline && (
          <div className="text-center mb-10">
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
              <p className="text-base" style={{ color: hsl(theme.colors.mutedForeground) }}>
                {description}
              </p>
            )}
          </div>
        )}

        <form data-demo-form="true" data-intent="contact.submit" className="flex flex-col gap-3">
          <input type="text" placeholder="Your name" style={inputStyle} />
          <input type="email" placeholder="your@email.com" style={inputStyle} />
          <textarea placeholder="How can we help?" rows={4} style={inputStyle} />
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

        {(phone || email || address) && (
          <div className="mt-8 text-center text-sm space-y-1" style={{ color: hsl(theme.colors.mutedForeground) }}>
            {phone && <p>{phone}</p>}
            {email && <p>{email}</p>}
            {address && <p>{address}</p>}
          </div>
        )}
      </div>
    </section>
  );
};
