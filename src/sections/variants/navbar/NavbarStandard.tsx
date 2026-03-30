/**
 * Navbar Variant: Standard
 * Clean horizontal navbar with brand, links, and a single CTA button.
 * This is the default navigation style.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const NavbarStandard: React.FC<BaseSectionProps<'navbar'>> = ({ section, theme }) => {
  const { brand, links = [], cta } = section.props;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      style={{
        background: hsla(theme.colors.background, 0.92),
        borderBottom: `1px solid ${hsla(theme.colors.border, 0.4)}`,
      }}
    >
      <div
        className="mx-auto flex items-center justify-between h-16 px-6"
        style={{ maxWidth: theme.containerWidth }}
      >
        <a
          href="#"
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: theme.typography.headingFont, color: hsl(theme.colors.foreground) }}
        >
          {brand}
        </a>

        <nav className="flex items-center gap-8">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              data-intent={link.intent}
              className="text-sm transition-colors hover:opacity-80"
              style={{ fontFamily: theme.typography.bodyFont, color: hsl(theme.colors.mutedForeground) }}
            >
              {link.label}
            </a>
          ))}
          {cta && (
            <a
              href={cta.href || '#'}
              data-intent={cta.intent}
              className="text-sm px-4 py-2 transition-all hover:opacity-90"
              style={{
                background: hsl(theme.colors.primary),
                color: hsl(theme.colors.primaryForeground),
                borderRadius: theme.radius,
                fontFamily: theme.typography.bodyFont,
                fontWeight: '500',
              }}
            >
              {cta.label}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
};
