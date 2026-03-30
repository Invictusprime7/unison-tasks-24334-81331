/**
 * useTemplateCustomizer - TSX Source Customization Engine
 * 
 * Manages theme overrides, typography, colors, section ordering,
 * element-level edits, and image replacements for React/TSX templates.
 * 
 * Operates on TSX source strings via regex — no DOM parsing.
 * AI Output (TSX) → Customizer Overrides (CSS + source edits) → VFS → Preview
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { VariantId, ActiveVariantMap } from '@/sections/variants';

// ============================================================================
// Types
// ============================================================================

export interface ThemeOverrides {
  colors: ColorPalette;
  typography: TypographyConfig;
  spacing: SpacingConfig;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  h1Size: string;
  h2Size: string;
  h3Size: string;
  bodySize: string;
  lineHeight: string;
  letterSpacing: string;
  headingWeight: string;
}

export interface SpacingConfig {
  sectionPadding: string;
  containerMaxWidth: string;
  elementGap: string;
}

export interface SectionInfo {
  id: string;
  tagName: string;
  label: string;
  visible: boolean;
  order: number;
  height: string;
  selector: string;
  preview: string; // First 80 chars of text content
}

export interface ImageInfo {
  id: string;
  src: string;
  alt: string;
  selector: string;
  width: string;
  height: string;
}

export interface ElementOverride {
  selector: string;
  styles: Record<string, string>;
  textContent?: string;
  imageSrc?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: ColorPalette;
  typography: Partial<TypographyConfig>;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_COLORS: ColorPalette = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
};

const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  headingFont: 'Inter, system-ui, sans-serif',
  bodyFont: 'Inter, system-ui, sans-serif',
  h1Size: '3rem',
  h2Size: '2.25rem',
  h3Size: '1.5rem',
  bodySize: '1rem',
  lineHeight: '1.6',
  letterSpacing: '0',
  headingWeight: '700',
};

const DEFAULT_SPACING: SpacingConfig = {
  sectionPadding: '80px',
  containerMaxWidth: '1280px',
  elementGap: '24px',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'modern-light',
    name: 'Modern Light',
    colors: { ...DEFAULT_COLORS },
    typography: { headingFont: 'Inter, system-ui, sans-serif', bodyFont: 'Inter, system-ui, sans-serif' },
  },
  {
    id: 'dark-elegance',
    name: 'Dark Elegance',
    colors: {
      primary: '#a78bfa',
      secondary: '#f472b6',
      accent: '#fbbf24',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
    },
    typography: { headingFont: 'Playfair Display, serif', bodyFont: 'Source Sans 3, sans-serif' },
  },
  {
    id: 'warm-minimal',
    name: 'Warm Minimal',
    colors: {
      primary: '#d97706',
      secondary: '#92400e',
      accent: '#dc2626',
      background: '#fefce8',
      surface: '#fef9c3',
      text: '#422006',
      textMuted: '#78716c',
      border: '#e7e5e4',
    },
    typography: { headingFont: 'DM Serif Display, serif', bodyFont: 'DM Sans, sans-serif' },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    colors: {
      primary: '#0891b2',
      secondary: '#0e7490',
      accent: '#06b6d4',
      background: '#ecfeff',
      surface: '#cffafe',
      text: '#164e63',
      textMuted: '#6b7280',
      border: '#a5f3fc',
    },
    typography: { headingFont: 'Outfit, sans-serif', bodyFont: 'Outfit, sans-serif' },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    colors: {
      primary: '#000000',
      secondary: '#ff0000',
      accent: '#ffff00',
      background: '#ffffff',
      surface: '#f0f0f0',
      text: '#000000',
      textMuted: '#555555',
      border: '#000000',
    },
    typography: { headingFont: 'Space Grotesk, monospace', bodyFont: 'Space Mono, monospace', headingWeight: '900' },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    colors: {
      primary: '#1a1a1a',
      secondary: '#c0392b',
      accent: '#e74c3c',
      background: '#faf9f7',
      surface: '#f5f0eb',
      text: '#1a1a1a',
      textMuted: '#7f8c8d',
      border: '#ddd',
    },
    typography: { headingFont: 'Playfair Display, serif', bodyFont: 'Lora, serif', lineHeight: '1.8' },
  },
];

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Playfair Display', 'Merriweather', 'Source Sans 3', 'DM Sans', 'DM Serif Display',
  'Outfit', 'Space Grotesk', 'Space Mono', 'JetBrains Mono', 'Lora', 'Nunito',
  'Oswald', 'Quicksand', 'Rubik', 'Work Sans', 'Barlow', 'Manrope',
  'Cormorant Garamond', 'Crimson Text', 'Libre Baskerville', 'Spectral',
];

// ============================================================================
// Selector Utilities
// ============================================================================

/**
 * Escape special characters in CSS selectors (e.g., Tailwind brackets like `min-h-[85vh]`)
 * CSS.escape is available in modern browsers, but we also need to handle class selectors
 */
const escapeCSSSelector = (selector: string): string => {
  // Escape special characters inside class/attribute selectors
  // Handle Tailwind-style brackets: .min-h-[85vh] → .min-h-\[85vh\]
  return selector.replace(/(\.)([^.\s#>+~:[\]]+)/g, (match, dot, className) => {
    // Escape [ ] ( ) : / within class names
    const escaped = className
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/:/g, '\\:')
      .replace(/\//g, '\\/');
    return dot + escaped;
  });
};

/**
 * Safely query a selector, returning null if invalid
 */
const safeQuerySelector = (doc: Document, selector: string): Element | null => {
  try {
    // First try the escaped selector
    const escaped = escapeCSSSelector(selector);
    const el = doc.querySelector(escaped);
    if (el) return el;
    
    // Fallback: try original selector (might work for simple selectors)
    if (escaped !== selector) {
      return doc.querySelector(selector);
    }
    return null;
  } catch {
    // If both fail, return null
    return null;
  }
};

// ============================================================================
// Hook
// ============================================================================

export const useTemplateCustomizer = () => {
  const [colors, setColors] = useState<ColorPalette>({ ...DEFAULT_COLORS });
  const [typography, setTypography] = useState<TypographyConfig>({ ...DEFAULT_TYPOGRAPHY });
  const [spacing, setSpacing] = useState<SpacingConfig>({ ...DEFAULT_SPACING });
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [elementOverrides, setElementOverrides] = useState<Map<string, ElementOverride>>(new Map());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [overrideVersion, setOverrideVersion] = useState(0); // Increments on every change to trigger reactivity
  const [activeVariants, setActiveVariants] = useState<ActiveVariantMap>({});
  const originalSourceRef = useRef<string>('');
  const isCustomizerApplyingRef = useRef(false); // Prevents re-parsing when customizer applies overrides
  
  // Track whether global theme settings have been explicitly modified
  // This prevents element-level edits from triggering unwanted global color overrides
  const [hasColorsModified, setHasColorsModified] = useState(false);
  const [hasTypographyModified, setHasTypographyModified] = useState(false);
  const [hasSpacingModified, setHasSpacingModified] = useState(false);
  const [hasSectionsReordered, setHasSectionsReordered] = useState(false);

  // ---- Parse template structure (LEGACY — delegates to parseSectionsFromJSX) ----
  const parseTemplate = useCallback((source: string) => {
    if (!source || !source.trim()) return;
    // All templates are now TSX — delegate to the JSX parser
    parseSectionsFromJSX(source);
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // ---- Parse sections from JSX/TSX source (for VFS React templates) ----
  const parseSectionsFromJSX = useCallback((jsxSource: string) => {
    if (!jsxSource || !jsxSource.trim()) return;

    const parsedSections: SectionInfo[] = [];

    // Match JSX tags: <section, <header, <nav, <footer, <main
    // Captures the tag name, any id/className attributes, and surrounding content
    const sectionTagRegex = /<(section|header|nav|footer|main)\b([^>]*?)>/gi;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = sectionTagRegex.exec(jsxSource)) !== null) {
      const tagName = match[1].toLowerCase();
      const attrs = match[2];
      
      // Extract id from id="..." or id={'...'}
      const idMatch = attrs.match(/\bid=["'{]([^"'}]+)["'}]/);
      const id = idMatch?.[1] || `${tagName}-${index}`;

      // Extract className for heuristic label detection
      const classMatch = attrs.match(/className=["'{]([^"'}]+)["'}]/);
      const className = classMatch?.[1] || '';

      // Look ahead in the source for the first heading inside this section
      const tagEndPos = match.index + match[0].length;
      // Find the closing tag (simplified — look for next few hundred chars)
      const lookahead = jsxSource.substring(tagEndPos, tagEndPos + 2000);
      const headingMatch = lookahead.match(/<h[123][^>]*>([^<]+)</);
      const headingText = headingMatch?.[1]?.trim() || '';

      // Grab a text preview from the content
      const textPreview = headingText ||
        (lookahead.match(/>([A-Z][^<]{5,80})</)?.[1]?.trim() || '');

      // Infer a human-readable label
      let label = headingText;
      if (!label) {
        // Try class-based heuristics
        const lowerClass = className.toLowerCase();
        const lowerId = id.toLowerCase();
        if (tagName === 'nav' || lowerId.includes('nav') || lowerClass.includes('nav')) label = 'Navigation';
        else if (tagName === 'header' || lowerId.includes('header')) label = 'Header';
        else if (tagName === 'footer' || lowerId.includes('footer') || lowerClass.includes('footer')) label = 'Footer';
        else if (lowerId.includes('hero') || lowerClass.includes('hero')) label = 'Hero';
        else if (lowerId.includes('cta') || lowerClass.includes('cta')) label = 'Call to Action';
        else if (lowerId.includes('service') || lowerClass.includes('service')) label = 'Services';
        else if (lowerId.includes('feature') || lowerClass.includes('feature')) label = 'Features';
        else if (lowerId.includes('pricing') || lowerClass.includes('pricing')) label = 'Pricing';
        else if (lowerId.includes('testimonial') || lowerClass.includes('testimonial')) label = 'Testimonials';
        else if (lowerId.includes('contact') || lowerClass.includes('contact')) label = 'Contact';
        else if (lowerId.includes('about') || lowerClass.includes('about')) label = 'About';
        else if (lowerId.includes('faq') || lowerClass.includes('faq')) label = 'FAQ';
        else if (lowerId.includes('team') || lowerClass.includes('team')) label = 'Team';
        else if (lowerId.includes('gallery') || lowerClass.includes('gallery')) label = 'Gallery';
        else if (lowerId.includes('stats') || lowerClass.includes('stats')) label = 'Statistics';
        else label = tagName.charAt(0).toUpperCase() + tagName.slice(1);
      }

      parsedSections.push({
        id,
        tagName,
        label,
        visible: true,
        order: index,
        height: 'auto',
        selector: id !== `${tagName}-${index}` ? `#${id}` : `${tagName}:nth-of-type(${index + 1})`,
        preview: textPreview.substring(0, 80),
      });

      index++;
    }

    // If we found sections, update state
    if (parsedSections.length > 0) {
      setSections(parsedSections);
    }

    // Extract images from JSX source via regex
    const parsedImages: ImageInfo[] = [];
    const imgPattern = /<img\b([^>]*?)(?:\/>|>)/gi;
    let imgMatch: RegExpExecArray | null;
    let imgIndex = 0;
    while ((imgMatch = imgPattern.exec(jsxSource)) !== null) {
      const attrs = imgMatch[1];
      const srcMatch = attrs.match(/src=["'{]([^"'}]+)["'}]/);
      const altMatch = attrs.match(/alt=["'{]([^"'}]*)["'}]/);
      const widthMatch = attrs.match(/width=["'{]([^"'}]+)["'}]/);
      const heightMatch = attrs.match(/height=["'{]([^"'}]+)["'}]/);
      const idMatch = attrs.match(/id=["'{]([^"'}]+)["'}]/);
      if (srcMatch?.[1]) {
        parsedImages.push({
          id: `img-${imgIndex}`,
          src: srcMatch[1],
          alt: altMatch?.[1] || '',
          selector: idMatch?.[1] ? `#${idMatch[1]}` : `img:nth-of-type(${imgIndex + 1})`,
          width: widthMatch?.[1] || 'auto',
          height: heightMatch?.[1] || 'auto',
        });
        imgIndex++;
      }
    }
    if (parsedImages.length > 0) {
      setImages(parsedImages);
    }

    // Store original source for reference
    originalSourceRef.current = jsxSource;
  }, []);

  // ---- Apply theme preset ----
  const applyPreset = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setColors({ ...preset.colors });
    setHasColorsModified(true);
    if (preset.typography.headingFont) {
      setTypography(prev => ({ ...prev, ...preset.typography }));
      setHasTypographyModified(true);
    }
    setActivePresetId(presetId);
    setIsDirty(true);
  }, []);

  // ---- Update individual color ----
  const updateColor = useCallback((key: keyof ColorPalette, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
    setHasColorsModified(true);
    setActivePresetId(null);
    setIsDirty(true);
  }, []);

  // ---- Update typography ----
  const updateTypography = useCallback((key: keyof TypographyConfig, value: string) => {
    setTypography(prev => ({ ...prev, [key]: value }));
    setHasTypographyModified(true);
    setIsDirty(true);
  }, []);

  // ---- Update spacing ----
  const updateSpacing = useCallback((key: keyof SpacingConfig, value: string) => {
    setSpacing(prev => ({ ...prev, [key]: value }));
    setHasSpacingModified(true);
    setIsDirty(true);
  }, []);

  // ---- Section operations ----
  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    ));
    setIsDirty(true);
  }, []);

  const reorderSections = useCallback((fromIndex: number, toIndex: number) => {
    setSections(prev => {
      const newSections = [...prev];
      const [moved] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, moved);
      return newSections.map((s, i) => ({ ...s, order: i }));
    });
    setHasSectionsReordered(true);
    setIsDirty(true);
  }, []);

  const resizeSection = useCallback((sectionId: string, height: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, height } : s
    ));
    setIsDirty(true);
  }, []);

  // ---- Section variant selection ----
  const setActiveVariant = useCallback((sectionId: string, variantId: VariantId) => {
    setActiveVariants(prev => ({ ...prev, [sectionId]: variantId }));
    setIsDirty(true);
    setOverrideVersion(v => v + 1);
  }, []);

  const clearActiveVariant = useCallback((sectionId: string) => {
    setActiveVariants(prev => {
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
    setIsDirty(true);
    setOverrideVersion(v => v + 1);
  }, []);

  // ---- Image replacement ----
  const replaceImage = useCallback((imageId: string, newSrc: string, newAlt?: string) => {
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, src: newSrc, alt: newAlt || img.alt } : img
    ));
    setIsDirty(true);
    setOverrideVersion(v => v + 1);
  }, []);

  // ---- Element-level overrides ----
  const setElementOverride = useCallback((selector: string, override: Partial<ElementOverride>) => {
    setElementOverrides(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(selector) || { selector, styles: {} };
      newMap.set(selector, {
        ...existing,
        ...override,
        styles: { ...existing.styles, ...(override.styles || {}) },
      });
      return newMap;
    });
    setIsDirty(true);
    setOverrideVersion(v => v + 1); // Trigger reactive apply
  }, []);

  const clearElementOverride = useCallback((selector: string) => {
    setElementOverrides(prev => {
      const newMap = new Map(prev);
      newMap.delete(selector);
      return newMap;
    });
  }, []);

  // ---- Generate override CSS ----
  const generateOverrideCSS = useCallback((): string => {
    const cssBlocks: string[] = [];

    // Only load fonts if typography has been explicitly modified
    if (hasTypographyModified) {
      const fontsToLoad = new Set<string>();
      if (GOOGLE_FONTS.includes(typography.headingFont.split(',')[0].trim())) {
        fontsToLoad.add(typography.headingFont.split(',')[0].trim());
      }
      if (GOOGLE_FONTS.includes(typography.bodyFont.split(',')[0].trim())) {
        fontsToLoad.add(typography.bodyFont.split(',')[0].trim());
      }
      if (fontsToLoad.size > 0) {
        const families = Array.from(fontsToLoad).map(f => f.replace(/\s/g, '+')).join('&family=');
        cssBlocks.push(`@import url('https://fonts.googleapis.com/css2?family=${families}:wght@300;400;500;600;700;800;900&display=swap');`);
      }
    }

    cssBlocks.push('/* === Template Customizer Overrides === */');

    // Only apply global typography if explicitly modified
    if (hasTypographyModified) {
      cssBlocks.push(`
/* Global Typography */
body, html {
  font-family: ${typography.bodyFont} !important;
  font-size: ${typography.bodySize} !important;
  line-height: ${typography.lineHeight} !important;
  letter-spacing: ${typography.letterSpacing}em !important;
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${typography.headingFont} !important;
  font-weight: ${typography.headingWeight} !important;
}

h1 { font-size: ${typography.h1Size} !important; }
h2 { font-size: ${typography.h2Size} !important; }
h3 { font-size: ${typography.h3Size} !important; }
`);
    }

    // Only apply global colors if explicitly modified
    if (hasColorsModified) {
      cssBlocks.push(`
/* Global Colors */
body, html {
  color: ${colors.text} !important;
  background-color: ${colors.background} !important;
}

a { color: ${colors.primary} !important; }
a:hover { opacity: 0.85; }

button:not([class*="ghost"]):not([class*="outline"]),
[class*="btn-primary"],
[class*="bg-primary"],
[class*="bg-blue"],
[class*="bg-indigo"],
[class*="bg-violet"],
[class*="bg-purple"] {
  background-color: ${colors.primary} !important;
  border-color: ${colors.primary} !important;
}

[class*="text-primary"],
[class*="text-blue"],
[class*="text-indigo"] {
  color: ${colors.primary} !important;
}

[class*="bg-secondary"],
[class*="bg-gray-1"],
[class*="bg-slate-1"] {
  background-color: ${colors.surface} !important;
}

/* Muted text */
[class*="text-gray-"],
[class*="text-slate-"],
[class*="text-muted"],
[class*="text-zinc-4"],
[class*="text-zinc-5"],
[class*="text-neutral-"] {
  color: ${colors.textMuted} !important;
}

/* Border colors */
[class*="border"] {
  border-color: ${colors.border} !important;
}
`);
    }

    // Only apply spacing if explicitly modified
    if (hasSpacingModified) {
      cssBlocks.push(`
/* Section spacing */
section, [class*="section"] {
  padding-top: ${spacing.sectionPadding} !important;
  padding-bottom: ${spacing.sectionPadding} !important;
}

/* Container width */
[class*="container"], [class*="max-w-"] {
  max-width: ${spacing.containerMaxWidth} !important;
}
`);
    }

    // Section visibility & height (always apply if sections have been parsed)
    let sectionCSS = '';
    sections.forEach(section => {
      const escapedSelector = escapeCSSSelector(section.selector);
      if (!section.visible) {
        sectionCSS += `${escapedSelector} { display: none !important; }\n`;
      }
      if (section.height !== 'auto') {
        sectionCSS += `${escapedSelector} { min-height: ${section.height} !important; }\n`;
      }
    });
    if (sectionCSS) {
      cssBlocks.push(`/* Section overrides */\n${sectionCSS}`);
    }

    // Element-level overrides (always apply)
    let elementCSS = '';
    elementOverrides.forEach((override) => {
      const styleProps = Object.entries(override.styles)
        .map(([k, v]) => `  ${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v} !important;`)
        .join('\n');
      if (styleProps) {
        const escapedSelector = escapeCSSSelector(override.selector);
        elementCSS += `${escapedSelector} {\n${styleProps}\n}\n`;
      }
    });
    if (elementCSS) {
      cssBlocks.push(`/* Element overrides */\n${elementCSS}`);
    }

    return cssBlocks.join('\n');
  }, [colors, typography, spacing, sections, elementOverrides, hasColorsModified, hasTypographyModified, hasSpacingModified]);

  // ---- Apply overrides to TSX source ----
  // Returns the modified TSX source with image replacements applied.
  // CSS overrides (colors, typography, spacing, element styles) are injected
  // directly into the iframe by the WebBuilder override useEffect — not embedded in source.
  const applyOverrides = useCallback((source: string): string => {
    if (!source || !source.trim()) return source;
    if (!isDirty) return source;

    const baseSource = originalSourceRef.current || source;
    let result = baseSource;

    // Replace images in TSX source (regex-based — find <img ... src="old" and replace)
    images.forEach(img => {
      const idx = parseInt(img.id.replace('img-', ''), 10);
      if (isNaN(idx)) return;

      // Find the nth <img> tag in the source
      const imgPattern = /<img\b[^>]*?src=["']([^"']*)["'][^>]*?\/?>/gi;
      let imgMatch: RegExpExecArray | null;
      let count = 0;
      while ((imgMatch = imgPattern.exec(result)) !== null) {
        if (count === idx) {
          const originalSrc = imgMatch[1];
          if (originalSrc !== img.src) {
            // Replace src attribute value
            const oldTag = imgMatch[0];
            let newTag = oldTag.replace(/src=["'][^"']*["']/, `src="${img.src}"`);
            if (img.alt) {
              newTag = newTag.replace(/alt=["'][^"']*["']/, `alt="${img.alt}"`);
            }
            result = result.substring(0, imgMatch.index) + newTag + result.substring(imgMatch.index + oldTag.length);
          }
          break;
        }
        count++;
      }
    });

    isCustomizerApplyingRef.current = true;
    return result;
  }, [isDirty, images]);

  // ---- Check if customizer just applied (to skip parseTemplate) ----
  const consumeCustomizerApplyFlag = useCallback((): boolean => {
    if (isCustomizerApplyingRef.current) {
      isCustomizerApplyingRef.current = false;
      return true;
    }
    return false;
  }, []);

  // ---- Get original source (TSX) ----
  const getOriginalSource = useCallback(() => originalSourceRef.current, []);
  // Legacy alias
  const getOriginalHtml = getOriginalSource;

  // ---- Reset all ----
  const resetAll = useCallback(() => {
    setColors({ ...DEFAULT_COLORS });
    setTypography({ ...DEFAULT_TYPOGRAPHY });
    setSpacing({ ...DEFAULT_SPACING });
    setElementOverrides(new Map());
    setActivePresetId(null);
    setIsDirty(false);
    setHasColorsModified(false);
    setHasTypographyModified(false);
    setHasSpacingModified(false);
    setHasSectionsReordered(false);
    setActiveVariants({});
  }, []);

  return {
    // State
    colors,
    typography,
    spacing,
    sections,
    images,
    elementOverrides,
    activePresetId,
    activeVariants,
    isDirty,
    overrideVersion,
    presets: THEME_PRESETS,
    availableFonts: GOOGLE_FONTS,

    // Template parsing
    parseTemplate,
    parseSectionsFromJSX,

    // Theme
    applyPreset,
    updateColor,
    updateTypography,
    updateSpacing,

    // Sections
    toggleSectionVisibility,
    reorderSections,
    resizeSection,

    // Variants
    setActiveVariant,
    clearActiveVariant,

    // Images
    replaceImage,

    // Element overrides
    setElementOverride,
    clearElementOverride,

    // Apply
    applyOverrides,
    generateOverrideCSS,
    resetAll,
    consumeCustomizerApplyFlag,
    getOriginalHtml,
    getOriginalSource,
  };
};

export type TemplateCustomizerReturn = ReturnType<typeof useTemplateCustomizer>;
