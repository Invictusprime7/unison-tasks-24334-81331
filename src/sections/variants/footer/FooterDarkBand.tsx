/**
 * Footer Variant: Dark Band
 * Full-width dark footer with brand, columns, newsletter, and social icons.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const FooterDarkBand: React.FC<BaseSectionProps<'footer'>> = ({ section, theme }) => {
  const { brand, columns = [], socials = [], copyright, newsletter } = section.props;

  return (
    <footer
      className="px-6"
      style={{
        paddingTop: '3.5rem',
        paddingBottom: '1.5rem',
        background: `hsl(${theme.colors.foreground})`,
        color: `hsl(${theme.colors.background})`,
      }}
    >
      <div className="mx-auto" style={{ maxWidth: theme.containerWidth }}>
        <div className="grid gap-8 mb-10" style={{ gridTemplateColumns: `2fr ${columns.map(() => '1fr').join(' ')}` }}>
          <div>
            <h3
              className="text-xl mb-2"
              style={{
                fontFamily: theme.typography.headingFont,
                fontWeight: theme.typography.headingWeight,
              }}
            >
              {brand}
            </h3>
            {newsletter && (
              <form data-demo-form="true" data-intent="newsletter.subscribe" className="flex gap-2 mt-4" style={{ maxWidth: '20rem' }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 text-sm px-3 py-2"
                  style={{
                    borderRadius: theme.radius,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="text-sm px-4 py-2 cursor-pointer hover:opacity-90"
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
            {socials.length > 0 && (
              <div className="flex gap-3 mt-5">
                {socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    className="text-sm hover:opacity-80"
                    style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
                  >
                    {s.icon || s.platform}
                  </a>
                ))}
              </div>
            )}
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <a
                      href={l.href}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
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
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {copyright || `© ${new Date().getFullYear()} ${brand}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
};
