/**
 * Navbar Variant: Minimal Dark
 * Dark background navbar with subtle styling and pill-shaped CTA.
 * Modern dark-mode-first navigation.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const NavbarMinimalDark: React.FC<BaseSectionProps<'navbar'>> = ({ section, theme }) => {
  const { brand, links = [], cta } = section.props;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10, 10, 20, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="mx-auto flex items-center justify-between h-14 px-6"
        style={{ maxWidth: theme.containerWidth }}
      >
        <a
          href="#"
          className="text-base font-bold tracking-tight"
          style={{
            fontFamily: theme.typography.headingFont,
            color: '#ffffff',
          }}
        >
          {brand}
        </a>

        <nav className="flex items-center gap-6">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              data-intent={link.intent}
              className="text-sm transition-colors hover:text-white"
              style={{
                fontFamily: theme.typography.bodyFont,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {link.label}
            </a>
          ))}
          {cta && (
            <a
              href={cta.href || '#'}
              data-intent={cta.intent}
              className="text-sm px-5 py-1.5 transition-all hover:opacity-90"
              style={{
                background: hsl(theme.colors.primary),
                color: hsl(theme.colors.primaryForeground),
                borderRadius: '9999px',
                fontFamily: theme.typography.bodyFont,
                fontWeight: '500',
                fontSize: '0.8125rem',
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
