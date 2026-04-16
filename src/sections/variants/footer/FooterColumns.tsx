/**
 * Footer Variant: Columns
 * Default multi-column footer with brand, link columns, and social row.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const FooterColumns: React.FC<BaseSectionProps<'footer'>> = ({ section, theme }) => {
  const { brand, columns = [], socials = [], copyright, newsletter } = section.props;

  return (
    <footer
      className="px-6"
      style={{
        paddingTop: '3rem',
        paddingBottom: '1.5rem',
        background: hsl(theme.colors.card),
        borderTop: `1px solid ${hsla(theme.colors.border, 0.5)}`,
      }}
    >
      <div className="mx-auto" style={{ maxWidth: theme.containerWidth }}>
        <div
          className="grid gap-8 mb-8"
          style={{ gridTemplateColumns: `repeat(${columns.length + 1}, 1fr)` }}
        >
          <div>
            <h3
              className="text-lg mb-3"
              style={{
                fontFamily: theme.typography.headingFont,
                fontWeight: theme.typography.headingWeight,
                color: hsl(theme.colors.cardForeground),
              }}
            >
              {brand}
            </h3>
            {newsletter && (
              <form data-demo-form="true" data-intent="newsletter.subscribe" className="flex gap-2 mt-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 text-sm px-3 py-2"
                  style={{
                    borderRadius: theme.radius,
                    border: `1px solid ${hsla(theme.colors.border, 0.6)}`,
                    background: hsl(theme.colors.background),
                    color: hsl(theme.colors.foreground),
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="text-sm px-3 py-2 cursor-pointer hover:opacity-90"
                  style={{
                    background: hsl(theme.colors.primary),
                    color: hsl(theme.colors.primaryForeground),
                    borderRadius: theme.radius,
                    border: 'none',
                  }}
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h4
                className="text-xs uppercase tracking-widest mb-3 font-semibold"
                style={{ color: hsl(theme.colors.cardForeground) }}
              >
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <a
                      href={l.href}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color: hsl(theme.colors.mutedForeground), textDecoration: 'none' }}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex justify-between items-center pt-4"
          style={{ borderTop: `1px solid ${hsla(theme.colors.border, 0.3)}` }}
        >
          <p className="text-xs" style={{ color: hsl(theme.colors.mutedForeground) }}>
            {copyright || `© ${new Date().getFullYear()} ${brand}. All rights reserved.`}
          </p>
          {socials.length > 0 && (
            <div className="flex gap-3">
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  className="text-sm hover:opacity-80"
                  style={{ color: hsl(theme.colors.mutedForeground), textDecoration: 'none' }}
                >
                  {s.icon || s.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
