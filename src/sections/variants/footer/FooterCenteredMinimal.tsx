/**
 * Footer Variant: Centered Minimal
 * Simple centered footer with brand, inline links, and socials.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export const FooterCenteredMinimal: React.FC<BaseSectionProps<'footer'>> = ({ section, theme }) => {
  const { brand, columns = [], socials = [], copyright } = section.props;

  // Flatten all links from columns into a single list
  const allLinks = columns.flatMap(c => c.links);

  return (
    <footer
      style={{
        padding: '2.5rem 1rem',
        background: hsl(theme.colors.background),
        borderTop: `1px solid ${hsla(theme.colors.border, 0.4)}`,
        textAlign: 'center',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: theme.containerWidth }}>
        <h3
          className="text-lg mb-4"
          style={{
            fontFamily: theme.typography.headingFont,
            fontWeight: theme.typography.headingWeight,
            color: hsl(theme.colors.foreground),
          }}
        >
          {brand}
        </h3>

        {allLinks.length > 0 && (
          <nav className="flex gap-5 justify-center flex-wrap mb-5">
            {allLinks.map((l, i) => (
              <a
                key={i}
                href={l.href}
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: hsl(theme.colors.mutedForeground), textDecoration: 'none' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}

        {socials.length > 0 && (
          <div className="flex gap-4 justify-center mb-5">
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

        <p className="text-xs" style={{ color: hsl(theme.colors.mutedForeground) }}>
          {copyright || `© ${new Date().getFullYear()} ${brand}. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
};
