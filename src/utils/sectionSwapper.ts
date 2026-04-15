/**
 * Section Swapper Utility
 * 
 * Parses a compositionToReactCode-generated VFS file to:
 * 1. Identify which sections exist (from SECTIONS array)
 * 2. Extract content from a target section's props
 * 3. Swap the rendering for that section with a variant's JSX
 */

import type { SectionType } from '@/sections/types';
import type { ExtractedSectionContent } from '@/sections/variants/types';
import { getVariantById, VARIANT_REGISTRY } from '@/sections/variants/registry';
import type { VariantId } from '@/sections/variants/types';

/** Detected section in current preview code */
export interface DetectedSection {
  id: string;
  type: SectionType;
  index: number; // position in SECTIONS array
  props: Record<string, any>;
}

/**
 * Parse the SECTIONS array from compositionToReactCode output.
 * Returns the detected sections with their types and props.
 */
export function detectSections(code: string): DetectedSection[] {
  // Find the SECTIONS = [...] block using bracket balancing
  const startMatch = code.match(/const\s+SECTIONS\s*=\s*\[/);
  if (!startMatch || startMatch.index === undefined) return [];

  const startIdx = startMatch.index + startMatch[0].length - 1; // position of '['
  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '[') depth++;
    else if (code[i] === ']') {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }
  if (endIdx === -1) return [];

  const sectionsStr = code.slice(startIdx, endIdx + 1);

  try {
    // JSON.parse works since compositionToReactCode uses JSON.stringify
    const sections = JSON.parse(sectionsStr);
    if (!Array.isArray(sections)) return [];
    
    return sections.map((s: any, i: number) => ({
      id: s.id || `section-${i}`,
      type: s.type as SectionType,
      index: i,
      props: s.props || {},
    }));
  } catch {
    // Fallback: regex-based detection for non-JSON code
    const results: DetectedSection[] = [];
    const typePattern = /"id"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"/g;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = typePattern.exec(sectionsStr)) !== null) {
      results.push({
        id: match[1],
        type: match[2] as SectionType,
        index: idx++,
        props: {},
      });
    }
    // Also try single-quoted variant
    if (results.length === 0) {
      const altPattern = /['"]id['"]\s*:\s*['"]([^'"]+)['"]\s*,\s*['"]type['"]\s*:\s*['"]([^'"]+)['"]/g;
      while ((match = altPattern.exec(code)) !== null) {
        results.push({
          id: match[1],
          type: match[2] as SectionType,
          index: idx++,
          props: {},
        });
      }
    }
    return results;
  }
}

/**
 * Convert section props (from the composition data model) to ExtractedSectionContent
 * for use with variant renderJSX functions.
 */
export function propsToExtractedContent(
  sectionType: SectionType,
  props: Record<string, any>
): ExtractedSectionContent {
  const content: ExtractedSectionContent = {};

  switch (sectionType) {
    case 'hero':
      content.heading = props.headline;
      content.subheading = props.subheadline || props.description;
      content.badge = props.badge;
      content.imageSrc = props.image || props.backgroundImage;
      if (props.ctas?.length) {
        content.ctaButtons = props.ctas.map((c: any, i: number) => ({
          text: c.label,
          href: c.href || (c.intent ? `#${c.intent}` : '#'),
          isPrimary: i === 0 || c.variant !== 'outline',
        }));
      }
      break;

    case 'navbar':
      content.brandName = props.brand;
      if (props.links?.length) {
        content.navLinks = props.links.map((l: any) => ({
          text: l.label,
          href: l.href,
        }));
      }
      if (props.cta) {
        content.ctaButtons = [{
          text: props.cta.label,
          href: props.cta.href || (props.cta.intent ? `#${props.cta.intent}` : '#'),
          isPrimary: true,
        }];
      }
      break;

    case 'cta':
      content.heading = props.headline;
      content.subheading = props.description;
      if (props.ctas?.length) {
        content.ctaButtons = props.ctas.map((c: any, i: number) => ({
          text: c.label,
          href: c.href || (c.intent ? `#${c.intent}` : '#'),
          isPrimary: i === 0 || c.variant !== 'outline',
        }));
      }
      break;

    default:
      // Generic extraction
      content.heading = props.headline || props.title;
      content.subheading = props.subheadline || props.description;
      break;
  }

  return content;
}

/**
 * Apply a section variant swap to the current code.
 * 
 * Strategy: Find the function for the target section type in SECTION_MAP,
 * and inject a variant-specific rendering override.
 * 
 * Returns the modified code string.
 */
export function swapSectionVariant(
  code: string,
  sectionId: string,
  variantId: VariantId,
): string {
  const variant = getVariantById(variantId);
  if (!variant) {
    console.warn(`[SectionSwapper] Variant not found: ${variantId}`);
    return code;
  }

  // Detect sections to find the target
  const sections = detectSections(code);
  const targetSection = sections.find(s => s.id === sectionId);
  if (!targetSection) {
    console.warn(`[SectionSwapper] Section not found: ${sectionId}`);
    return code;
  }

  // Extract content from the section props
  const content = propsToExtractedContent(targetSection.type, targetSection.props);

  // Generate variant JSX
  const variantJSX = variant.renderJSX(content);

  // Strategy: Add a variant override function and modify the render map
  const overrideFnName = `__Variant_${sectionId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Insert the override function before the SECTION_MAP
  const sectionMapMarker = '// Section Map';
  const altMarker = 'const SECTION_MAP';
  const insertPoint = code.indexOf(sectionMapMarker) !== -1 
    ? code.indexOf(sectionMapMarker)
    : code.indexOf(altMarker);
  
  if (insertPoint === -1) {
    // Fallback: can't find injection point, try to replace the entire section function
    console.warn('[SectionSwapper] Cannot find SECTION_MAP marker');
    return code;
  }

  const overrideFn = `
// Variant override: ${variantId} for section "${sectionId}"
function ${overrideFnName}() {
  return (
${variantJSX}
  );
}

`;

  // Inject the override function
  let modifiedCode = code.slice(0, insertPoint) + overrideFn + code.slice(insertPoint);

  // Modify the render to use the override for this specific section
  // Replace the generic render: <C key={s.id} props={s.props} />
  // With a conditional that checks for the overridden section ID
  const renderPattern = /\{SECTIONS\.filter\(s => !s\.hidden\)\.map\(s => \{[\s\S]*?return <C key=\{s\.id\} props=\{s\.props\} \/>;[\s\S]*?\}\)\}/;
  
  modifiedCode = modifiedCode.replace(renderPattern, (match) => {
    return match.replace(
      'return <C key={s.id} props={s.props} />;',
      `if (s.id === '${sectionId}') return <${overrideFnName} key={s.id} />;
        return <C key={s.id} props={s.props} />;`
    );
  });

  return modifiedCode;
}

/**
 * Get available variant options for detected sections in the current code.
 */
export function getSwappableOptions(code: string) {
  const sections = detectSections(code);
  
  return sections
    .filter(s => VARIANT_REGISTRY[s.type]?.length > 1)
    .map(s => ({
      section: s,
      variants: VARIANT_REGISTRY[s.type] || [],
    }));
}
