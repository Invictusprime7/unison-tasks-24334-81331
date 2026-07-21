/**
 * Token-consuming CSS shared by the snapshot UI foundation and preview
 * recovery paths. Stage 4b remains the sole owner of global layers and theme
 * values in /src/index.css.
 */
export const UNISON_VFS_STYLE_BRIDGE = `/* UNISON VFS STYLE BRIDGE */
@layer components {
  .unison-surface {
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    background: hsl(var(--card));
    color: hsl(var(--card-foreground));
    box-shadow: 0 10px 24px hsl(var(--foreground) / 0.12);
  }

  .unison-interactive-surface {
    transition: transform 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
  }

  .unison-interactive-surface:hover {
    transform: translateY(-0.25rem);
    border-color: hsl(var(--primary) / 0.35);
    box-shadow: 0 18px 36px hsl(var(--foreground) / 0.14);
  }

  .unison-eyebrow {
    color: hsl(var(--primary));
    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
}

@layer utilities {
  .unison-text-display { font-family: var(--font-heading); }
  .unison-text-body { font-family: var(--font-body); }
  .unison-motion-lift { transition: transform 300ms ease; }
  .unison-motion-lift:hover { transform: translateY(-0.25rem); }

  @media (prefers-reduced-motion: reduce) {
    .unison-interactive-surface,
    .unison-motion-lift { transition-duration: 0.01ms; }
    .unison-interactive-surface:hover,
    .unison-motion-lift:hover { transform: none; }
  }
}
`;