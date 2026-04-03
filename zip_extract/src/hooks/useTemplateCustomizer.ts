/**
 * useTemplateCustomizer - Full DOM Control Customization Engine
 * 
 * Manages theme overrides, typography, colors, section ordering,
 * element-level edits, and image replacements for HTML templates.
 * 
 * Operates as an HTML manipulation pipeline:
 * AI Output → Customizer Overrides → Preview Iframe
 */

import { useState, useCallback, useRef, useMemo } from 'react';

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
  const originalHtmlRef = useRef<string>('');
  const isCustomizerApplyingRef = useRef(false); // Prevents parseTemplate from running on customizer output

  // ---- Parse template structure ----
  const parseTemplate = useCallback((html: string) => {
    if (!html || !html.trim()) return;
    originalHtmlRef.current = html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract sections
    const sectionEls = doc.querySelectorAll('body > section, body > header, body > footer, body > main, body > nav, body > div[class*="section"], body > div[id]');
    const parsedSections: SectionInfo[] = [];

    sectionEls.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      const heading = htmlEl.querySelector('h1, h2, h3');
      const textPreview = (heading?.textContent || htmlEl.textContent || '').trim().substring(0, 80);
      const id = htmlEl.id || `section-${index}`;

      parsedSections.push({
        id,
        tagName: htmlEl.tagName.toLowerCase(),
        label: heading?.textContent?.trim() || htmlEl.tagName.toLowerCase() + (htmlEl.className ? `.${htmlEl.className.split(' ')[0]}` : ''),
        visible: true,
        order: index,
        height: 'auto',
        selector: htmlEl.id ? `#${htmlEl.id}` : `body > ${htmlEl.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
        preview: textPreview,
      });
    });

    setSections(parsedSections);

    // Extract images
    const imgEls = doc.querySelectorAll('img');
    const parsedImages: ImageInfo[] = [];

    imgEls.forEach((img, index) => {
      parsedImages.push({
        id: `img-${index}`,
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || '',
        selector: img.id ? `#${img.id}` : `img:nth-of-type(${index + 1})`,
        width: img.getAttribute('width') || 'auto',
        height: img.getAttribute('height') || 'auto',
      });
    });

    setImages(parsedImages);

    // Try to extract existing colors from the template
    const styleContent = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)?.join('') || '';
    const bodyBg = styleContent.match(/background(?:-color)?:\s*([^;]+)/i);
    if (bodyBg) {
      // Don't override user's custom colors on parse
    }
  }, []);

  // ---- Apply theme preset ----
  const applyPreset = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setColors({ ...preset.colors });
    if (preset.typography.headingFont) setTypography(prev => ({ ...prev, ...preset.typography }));
    setActivePresetId(presetId);
    setIsDirty(true);
  }, []);

  // ---- Update individual color ----
  const updateColor = useCallback((key: keyof ColorPalette, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
    setActivePresetId(null);
    setIsDirty(true);
  }, []);

  // ---- Update typography ----
  const updateTypography = useCallback((key: keyof TypographyConfig, value: string) => {
    setTypography(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  // ---- Update spacing ----
  const updateSpacing = useCallback((key: keyof SpacingConfig, value: string) => {
    setSpacing(prev => ({ ...prev, [key]: value }));
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
    setIsDirty(true);
  }, []);

  const resizeSection = useCallback((sectionId: string, height: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, height } : s
    ));
    setIsDirty(true);
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
    const fontImports: string[] = [];
    const fontsToLoad = new Set<string>();

    // Collect Google Fonts to load
    if (GOOGLE_FONTS.includes(typography.headingFont.split(',')[0].trim())) {
      fontsToLoad.add(typography.headingFont.split(',')[0].trim());
    }
    if (GOOGLE_FONTS.includes(typography.bodyFont.split(',')[0].trim())) {
      fontsToLoad.add(typography.bodyFont.split(',')[0].trim());
    }

    if (fontsToLoad.size > 0) {
      const families = Array.from(fontsToLoad).map(f => f.replace(/\s/g, '+')).join('&family=');
      fontImports.push(`@import url('https://fonts.googleapis.com/css2?family=${families}:wght@300;400;500;600;700;800;900&display=swap');`);
    }

    // Element-level overrides
    let elementCSS = '';
    elementOverrides.forEach((override) => {
      const styleProps = Object.entries(override.styles)
        .map(([k, v]) => `  ${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v} !important;`)
        .join('\n');
      if (styleProps) {
        elementCSS += `${override.selector} {\n${styleProps}\n}\n`;
      }
    });

    // Section visibility & height
    let sectionCSS = '';
    sections.forEach(section => {
      if (!section.visible) {
        sectionCSS += `${section.selector} { display: none !important; }\n`;
      }
      if (section.height !== 'auto') {
        sectionCSS += `${section.selector} { min-height: ${section.height} !important; }\n`;
      }
    });

    return `
${fontImports.join('\n')}

/* === Template Customizer Overrides === */

/* Global Typography */
body, html {
  font-family: ${typography.bodyFont} !important;
  font-size: ${typography.bodySize} !important;
  line-height: ${typography.lineHeight} !important;
  letter-spacing: ${typography.letterSpacing}em !important;
  color: ${colors.text} !important;
  background-color: ${colors.background} !important;
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${typography.headingFont} !important;
  font-weight: ${typography.headingWeight} !important;
}

h1 { font-size: ${typography.h1Size} !important; }
h2 { font-size: ${typography.h2Size} !important; }
h3 { font-size: ${typography.h3Size} !important; }

/* Global Colors */
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

/* Section spacing */
section, [class*="section"] {
  padding-top: ${spacing.sectionPadding} !important;
  padding-bottom: ${spacing.sectionPadding} !important;
}

/* Container width */
[class*="container"], [class*="max-w-"] {
  max-width: ${spacing.containerMaxWidth} !important;
}

/* Border colors */
[class*="border"] {
  border-color: ${colors.border} !important;
}

/* Section overrides */
${sectionCSS}

/* Element overrides */
${elementCSS}
`;
  }, [colors, typography, spacing, sections, elementOverrides]);

  // ---- Apply overrides to HTML ----
  const applyOverrides = useCallback((html: string): string => {
    if (!html || !html.trim()) return html;
    if (!isDirty) return html;

    // Always apply on the original (base) HTML to avoid cumulative mangling
    const baseHtml = originalHtmlRef.current || html;

    const overrideCSS = generateOverrideCSS();

    // Handle section reordering by DOM manipulation
    const parser = new DOMParser();
    const doc = parser.parseFromString(baseHtml, 'text/html');

    // Reorder sections
    const body = doc.body;
    const sectionElements: { el: Element; order: number }[] = [];

    sections.forEach(section => {
      const el = doc.querySelector(section.selector);
      if (el) {
        sectionElements.push({ el, order: section.order });
      }
    });

    // Sort by new order and re-append
    if (sectionElements.length > 1) {
      sectionElements.sort((a, b) => a.order - b.order);
      sectionElements.forEach(({ el }) => {
        body.appendChild(el);
      });
    }

    // Replace images - use multiple fallback selectors
    images.forEach(img => {
      let el = doc.querySelector(img.selector) as HTMLImageElement;
      
      // Fallback: try matching by original src attribute
      if (!el) {
        const allImgs = doc.querySelectorAll('img');
        const idx = parseInt(img.id.replace('img-', ''), 10);
        if (!isNaN(idx) && idx < allImgs.length) {
          el = allImgs[idx] as HTMLImageElement;
        }
      }
      
      if (el && el.getAttribute('src') !== img.src) {
        el.setAttribute('src', img.src);
        if (img.alt) el.setAttribute('alt', img.alt);
      }
    });

    // Apply text content overrides
    elementOverrides.forEach(override => {
      if (override.textContent !== undefined) {
        const el = doc.querySelector(override.selector);
        if (el) el.textContent = override.textContent;
      }
      if (override.imageSrc) {
        const el = doc.querySelector(override.selector) as HTMLImageElement;
        if (el) el.setAttribute('src', override.imageSrc);
      }
    });

    // Inject override CSS
    let result = new XMLSerializer().serializeToString(doc);

    // Fix serialization issues
    result = result.replace(/xmlns="[^"]*"/g, '');
    result = '<!DOCTYPE html>' + result.replace(/^<\?xml[^?]*\?>/, '');

    // Inject override styles before </head>
    if (result.includes('</head>')) {
      result = result.replace('</head>', `<style id="customizer-overrides">${overrideCSS}</style>\n</head>`);
    } else {
      result = `<style id="customizer-overrides">${overrideCSS}</style>\n${result}`;
    }
    // Mark that the output is from customizer (to prevent parseTemplate from re-running on it)
    isCustomizerApplyingRef.current = true;

    return result;
  }, [isDirty, generateOverrideCSS, sections, images, elementOverrides]);

  // ---- Check if customizer just applied (to skip parseTemplate) ----
  const consumeCustomizerApplyFlag = useCallback((): boolean => {
    if (isCustomizerApplyingRef.current) {
      isCustomizerApplyingRef.current = false;
      return true;
    }
    return false;
  }, []);

  // ---- Get original HTML ----
  const getOriginalHtml = useCallback(() => originalHtmlRef.current, []);

  // ---- Reset all ----
  const resetAll = useCallback(() => {
    setColors({ ...DEFAULT_COLORS });
    setTypography({ ...DEFAULT_TYPOGRAPHY });
    setSpacing({ ...DEFAULT_SPACING });
    setElementOverrides(new Map());
    setActivePresetId(null);
    setIsDirty(false);
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
    isDirty,
    overrideVersion,
    presets: THEME_PRESETS,
    availableFonts: GOOGLE_FONTS,

    // Template parsing
    parseTemplate,

    // Theme
    applyPreset,
    updateColor,
    updateTypography,
    updateSpacing,

    // Sections
    toggleSectionVisibility,
    reorderSections,
    resizeSection,

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
  };
};

export type TemplateCustomizerReturn = ReturnType<typeof useTemplateCustomizer>;
