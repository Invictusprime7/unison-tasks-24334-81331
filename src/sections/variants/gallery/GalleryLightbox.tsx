/**
 * Gallery Lightbox
 *
 * Shared accessible overlay used by every gallery variant.
 * Keyboard: Escape closes, ArrowLeft/ArrowRight navigate.
 * Honors prefers-reduced-motion by skipping transitions.
 */

import React, { useEffect } from 'react';
import type { ThemeTokens } from '../../types';
import { hsl, hsla } from '../../themeUtils';

export interface LightboxItem {
  src: string;
  alt?: string;
  caption?: string;
  category?: string;
}

interface GalleryLightboxProps {
  items: LightboxItem[];
  index: number | null;
  theme: ThemeTokens;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ items, index, theme, onClose, onNavigate }) => {
  const reducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    if (index === null) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onNavigate((index + 1) % items.length);
      if (event.key === 'ArrowLeft') onNavigate((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, items.length, onClose, onNavigate]);

  if (index === null || !items[index]) return null;
  const item = items[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.alt || item.caption || 'Gallery image'}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: hsla(theme.colors.foreground, 0.92),
        transition: reducedMotion ? 'none' : 'opacity 200ms ease',
      }}
    >
      <button
        type="button"
        aria-label="Close gallery"
        onClick={onClose}
        className="absolute right-5 top-5 h-10 w-10 rounded-full text-lg leading-none"
        style={{ background: hsla(theme.colors.background, 0.14), color: hsl(theme.colors.background) }}
      >
        ×
      </button>
      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + items.length) % items.length); }}
            className="absolute left-4 h-11 w-11 rounded-full text-lg leading-none"
            style={{ background: hsla(theme.colors.background, 0.14), color: hsl(theme.colors.background) }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % items.length); }}
            className="absolute right-4 h-11 w-11 rounded-full text-lg leading-none"
            style={{ background: hsla(theme.colors.background, 0.14), color: hsl(theme.colors.background) }}
          >
            ›
          </button>
        </>
      )}
      <figure className="m-0 max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <img
          src={item.src}
          alt={item.alt || item.caption || ''}
          className="max-h-[78vh] w-auto object-contain"
          style={{ borderRadius: theme.radius }}
        />
        {item.caption && (
          <figcaption
            className="mt-3 text-center text-sm"
            style={{ fontFamily: theme.typography.bodyFont, color: hsl(theme.colors.background) }}
          >
            {item.caption}
          </figcaption>
        )}
      </figure>
    </div>
  );
};
