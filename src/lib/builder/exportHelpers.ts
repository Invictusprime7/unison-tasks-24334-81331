/**
 * Pure Fabric.js → HTML/CSS exporter, extracted from WebBuilder.tsx
 * (Phase C3 slice 7). Used by the legacy `handleExport` path when no
 * canonical Sandpack VFS build artifacts are available.
 *
 * No React, no DOM, no Fabric.js runtime usage — operates on a minimal
 * structural shape so the helper stays unit-testable.
 */

export interface FabricExportObject {
  type?: string;
  text?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string | unknown;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: string;
  getSrc?: () => string;
}

export interface FabricExportResult {
  html: string;
  css: string;
}

/**
 * Convert an array of Fabric.js-like objects into a single HTML/CSS pair
 * suitable for the export dialog. Mirrors the previous inline logic 1:1.
 */
export function fabricObjectsToHtmlCss(objects: FabricExportObject[]): FabricExportResult {
  let html = '<div class="web-page">\n';
  let css = '.web-page {\n  min-height: 100vh;\n  position: relative;\n  background: white;\n}\n\n';

  objects.forEach((obj, index) => {
    const className = `element-${index}`;

    if (obj.type === 'text' || obj.type === 'textbox') {
      html += `  <div class="${className}">${obj.text ?? ''}</div>\n`;
    } else if (obj.type === 'rect') {
      html += `  <div class="${className}"></div>\n`;
    } else if (obj.type === 'image') {
      const src = obj.getSrc ? obj.getSrc() : '';
      html += `  <img class="${className}" src="${src}" alt="" />\n`;
    }

    const scaleX = obj.scaleX || 1;
    const scaleY = obj.scaleY || 1;

    css += `.${className} {\n`;
    css += `  position: absolute;\n`;
    css += `  left: ${obj.left}px;\n`;
    css += `  top: ${obj.top}px;\n`;
    css += `  width: ${(obj.width || 0) * scaleX}px;\n`;
    css += `  height: ${(obj.height || 0) * scaleY}px;\n`;

    if (obj.fill) {
      css += `  background-color: ${obj.fill};\n`;
    }
    if (obj.fontSize) {
      css += `  font-size: ${obj.fontSize}px;\n`;
    }
    if (obj.fontFamily) {
      css += `  font-family: ${obj.fontFamily};\n`;
    }
    if (obj.textAlign) {
      css += `  text-align: ${obj.textAlign};\n`;
    }
    css += `}\n\n`;
  });

  html += '</div>';

  return { html, css };
}

/**
 * Build the AI-prompt redirect/page-context block describing all React pages
 * currently present in the VFS. Pure transform on a file map.
 */
export function buildVfsPageListContext(vfsFiles: Record<string, string>): string {
  const pageFiles = Object.keys(vfsFiles).filter((p) =>
    /\/src\/pages\/\w+\.tsx$/.test(p) && p !== '/src/App.tsx',
  );
  if (pageFiles.length === 0) return '';

  const lines = ['\n=== REACT PAGES IN VFS ==='];
  pageFiles.forEach((p) => {
    const content = vfsFiles[p] || '';
    const nameMatch = p.match(/\/(\w+)\.tsx$/);
    const componentName = nameMatch?.[1] || 'Unknown';
    const exportMatch = content.match(/export default function (\w+)/);
    lines.push(`- ${p} (${exportMatch?.[1] || componentName}, ${content.length} chars)`);
  });
  lines.push('All pages are React components. Apply nav/footer/brand changes across ALL pages.');
  return lines.join('\n');
}
