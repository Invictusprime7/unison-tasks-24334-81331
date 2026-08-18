/**
 * Token-consuming CSS shared by the snapshot UI foundation and preview
 * recovery paths. Stage 4b remains the sole owner of global layers and theme
 * values in /src/index.css.
 */
export const UNISON_VFS_STYLE_BRIDGE = `/* UNISON VFS STYLE BRIDGE */
/*
 * Geometry token defaults. Stage 4b's themed /src/index.css overrides these
 * per style card; they exist only so a recovery-path VFS still has a complete
 * geometry scale. Generated sections must reference these tokens instead of
 * hardcoding heights, hero blocks, tile sizes or micro type sizes.
 */
:root {
  --ut-nav-block: 4.5rem;
  --ut-hero-block: 72vh;
  --ut-hero-space-top: clamp(5.5rem, 8vw, 6.5rem);
  --ut-hero-media-block: 20rem;
  --ut-hero-media-max: 33.75rem;
  --ut-media-block: 16.25rem;
  --ut-media-block-lg: 20rem;
  --ut-tile-block: 13.75rem;
  --ut-overlay-block: 78vh;
  --ut-eyebrow-size: 0.6875rem;
  --ut-content-width: 72rem;
  --ut-gutter: 1.25rem;
  --ut-shell-width: min(100% - (var(--ut-gutter) * 2), var(--ut-content-width));
  --ut-carousel-card: min(26.25rem, 85vw);
  --ut-panel-width: min(22rem, calc(100vw - (var(--ut-gutter) * 2)));
  --ut-control-radius: calc(var(--radius) - 0.125rem);
  --ut-media-radius: var(--radius);
}

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