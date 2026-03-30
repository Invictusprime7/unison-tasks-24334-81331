/**
 * Navbar Variant: Centered Logo
 * Centered brand/logo with navigation links split on either side.
 * Elegant, editorial-style navigation.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const NavbarCenteredLogo: React.FC<BaseSectionProps<'navbar'>> = ({ section, theme }) => {
  const { brand, links = [], cta } = section.props;

  const midpoint = Math.ceil(links.length / 2);
  const leftLinks = links.slice(0, midpoint);
  const rightLinks = links.slice(midpoint);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      style={{
        background: hsla(theme.colors.background, 0.95),
        borderBottom: `1px solid ${hsla(theme.colors.border, 0.3)}`,
      }}
    >
      <div
        className="mx-auto flex items-center justify-between h-16 px-6"
        style={{ maxWidth: theme.containerWidth }}
      >
        {/* Left Links */}
        <nav className="flex items-center gap-6 flex-1 justify-end pr-8">
          {leftLinks.map((link, i) => (
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
        </nav>

        {/* Centered Brand */}
        <a
          href="#"
          className="text-xl font-bold tracking-tight flex-shrink-0"
          style={{
            fontFamily: theme.typography.headingFont,
            color: hsl(theme.colors.foreground),
            letterSpacing: '-0.02em',
          }}
        >
          {brand}
        </a>

        {/* Right Links + CTA */}
        <nav className="flex items-center gap-6 flex-1 pl-8">
          {rightLinks.map((link, i) => (
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
              className="text-sm px-4 py-2 ml-auto transition-all hover:opacity-90"
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
