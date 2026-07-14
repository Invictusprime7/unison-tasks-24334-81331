/**
 * Footer Variant: Columns
 * Default multi-column footer with brand, link columns, and social row.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';
import { SocialIcon, socialAriaLabel } from '../../components/SocialIcon';

export const FooterColumns: React.FC<BaseSectionProps<'footer'>> = ({ section, theme }) => {
  const { brand, columns = [], socials = [], copyright, newsletter } = section.props;

  // Normalize footer link hrefs so they always resolve to a real hash-route
  // page. Rules:
  //  • absolute/external URLs (http/https/mailto/tel) pass through
  //  • existing "#/..." hash routes pass through
  //  • "/foo" or "foo"  → "#/foo"
  //  • bare labels ("Contact Us") slugified → "#/contact-us"
  const resolveHref = (rawHref: string | undefined, label: string): string => {
    const href = (rawHref || '').trim();
    if (/^(https?:|mailto:|tel:|#\/)/i.test(href)) return href;
    if (href === '#' || href === '') {
      const slug = (label || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return slug ? `#/${slug}` : '#/';
    }
    if (href.startsWith('/')) return `#${href}`;
    if (href.startsWith('#')) return `#/${href.replace(/^#+/, '')}`;
    return `#/${href.replace(/^\/+/, '')}`;
  };


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
              <form data-demo-form="true" data-ut-intent="newsletter.subscribe" className="flex gap-2 mt-3">
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
                  data-ut-cta="cta.newsletter-submit"
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
                      href={resolveHref(l.href, l.label)}
                      data-ut-intent="nav.goto"
                      data-ut-nav-target={resolveHref(l.href, l.label)}
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
            <div className="flex gap-3 items-center">
              {socials.map((s, i) => {
                const hasUrl = s.url && s.url !== '#';
                return (
                  <a
                    key={i}
                    href={hasUrl ? s.url : undefined}
                    target={hasUrl ? '_blank' : undefined}
                    rel={hasUrl ? 'noopener noreferrer' : undefined}
                    aria-label={socialAriaLabel(s.platform)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:opacity-80 transition-opacity"
                    style={{ color: hsl(theme.colors.mutedForeground), textDecoration: 'none' }}
                  >
                    <SocialIcon platform={s.platform} size={16} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
