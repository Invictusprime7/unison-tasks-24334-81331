/**
 * Scene Exporter
 * 
 * Transforms a Scene into clean, exportable code:
 * - TSX/React components
 * - HTML/CSS
 * - Tailwind classes
 * 
 * Features:
 * - Proper imports and asset references
 * - Component extraction
 * - Responsive classes
 * - Clean formatting
 */

import type {
  RootNode,
  SceneNode,
  ContainerNode,
  TextNode,
  ImageNode,
  SlotNode,
  NodeLayout,
  NodeStyle,
} from '@/types/scene';
import type { DesignTokens } from '@/types/designSystem';
import { getTokenManager } from '@/services/designTokens';
import { getAssetRegistry } from '@/services/assetRegistry';

// ============================================
// EXPORT OPTIONS
// ============================================

export interface ExportOptions {
  format: 'tsx' | 'html' | 'both';
  framework: 'react' | 'next' | 'vanilla';
  styling: 'tailwind' | 'css' | 'inline';
  includeTokens: boolean;
  componentName?: string;
  extractComponents?: boolean;
  minify?: boolean;
}

const DEFAULT_OPTIONS: Required<ExportOptions> = {
  format: 'tsx',
  framework: 'react',
  styling: 'tailwind',
  includeTokens: true,
  componentName: 'GeneratedPage',
  extractComponents: true,
  minify: false,
};

export interface ExportResult {
  success: boolean;
  files: ExportFile[];
  errors: string[];
}

export interface ExportFile {
  name: string;
  content: string;
  type: 'tsx' | 'css' | 'html' | 'json';
}

// ============================================
// SCENE EXPORTER
// ============================================

export class SceneExporter {
  private options: Required<ExportOptions>;
  private tokens: DesignTokens;
  private assetRegistry = getAssetRegistry();
  private usedAssets = new Set<string>();
  private extractedComponents: Map<string, string> = new Map();

  constructor(options: Partial<ExportOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.tokens = getTokenManager().getTokens();
  }

  /**
   * Export scene to files
   */
  export(scene: RootNode): ExportResult {
    this.usedAssets.clear();
    this.extractedComponents.clear();

    const files: ExportFile[] = [];
    const errors: string[] = [];

    try {
      if (this.options.format === 'tsx' || this.options.format === 'both') {
        const tsx = this.exportToTSX(scene);
        files.push({
          name: `${this.options.componentName}.tsx`,
          content: tsx,
          type: 'tsx',
        });

        // Export extracted components
        if (this.options.extractComponents) {
          this.extractedComponents.forEach((content, name) => {
            files.push({
              name: `${name}.tsx`,
              content,
              type: 'tsx',
            });
          });
        }
      }

      if (this.options.format === 'html' || this.options.format === 'both') {
        const html = this.exportToHTML(scene);
        files.push({
          name: 'index.html',
          content: html,
          type: 'html',
        });
      }

      if (this.options.styling === 'css' && this.options.includeTokens) {
        const css = this.exportToCSS();
        files.push({
          name: 'styles.css',
          content: css,
          type: 'css',
        });
      }

      // Asset manifest
      if (this.usedAssets.size > 0) {
        const manifest = this.createAssetManifest();
        files.push({
          name: 'assets.json',
          content: manifest,
          type: 'json',
        });
      }

      return { success: true, files, errors };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Export failed');
      return { success: false, files, errors };
    }
  }

  // ============================================
  // TSX EXPORT
  // ============================================

  private exportToTSX(scene: RootNode): string {
    const imports = this.generateImports();
    const assetHook = this.generateAssetHook();
    const jsx = this.nodeToTSX(scene, 2);
    const componentName = this.options.componentName;

    return `${imports}

export default function ${componentName}() {
${assetHook}
  return (
${jsx}
  );
}
`;
  }

  private generateImports(): string {
    const lines: string[] = [];

    // React import (for Next.js, React is auto-imported)
    if (this.options.framework === 'react') {
      lines.push("import React from 'react';");
    }

    // Asset hook import
    if (this.usedAssets.size > 0 || this.hasSlots) {
      lines.push("import { useAssetRegistry } from '@/hooks/useAssetRegistry';");
    }

    // Next.js Image component
    if (this.options.framework === 'next' && this.hasImages) {
      lines.push("import Image from 'next/image';");
    }

    // Extracted components
    if (this.extractedComponents.size > 0) {
      this.extractedComponents.forEach((_, name) => {
        lines.push(`import { ${name} } from './${name}';`);
      });
    }

    return lines.join('\n');
  }

  private generateAssetHook(): string {
    if (this.usedAssets.size === 0) return '';

    const assetLines = Array.from(this.usedAssets).map(id => {
      const varName = this.assetIdToVarName(id);
      return `  const ${varName} = getAsset('${id}');`;
    });

    return `  const { getAsset } = useAssetRegistry();
${assetLines.join('\n')}
`;
  }

  private nodeToTSX(node: SceneNode, indent: number): string {
    const pad = ' '.repeat(indent);

    switch (node.type) {
      case 'root':
        return this.rootToTSX(node as RootNode, indent);
      case 'container':
      case 'frame':
      case 'group':
        return this.containerToTSX(node as ContainerNode, indent);
      case 'text':
        return this.textToTSX(node as TextNode, indent);
      case 'image':
        return this.imageToTSX(node as ImageNode, indent);
      case 'slot':
        return this.slotToTSX(node as SlotNode, indent);
      default:
        return `${pad}{/* Unsupported node type: ${node.type} */}`;
    }
  }

  private rootToTSX(node: RootNode, indent: number): string {
    const pad = ' '.repeat(indent);
    const className = this.options.styling === 'tailwind'
      ? 'min-h-screen w-full'
      : 'page-root';
    
    const style = this.options.styling === 'inline'
      ? ` style={{ backgroundColor: '${node.canvas.backgroundColor}' }}`
      : '';

    const bgClass = this.options.styling === 'tailwind'
      ? ` bg-[${node.canvas.backgroundColor}]`
      : '';

    const children = node.children
      .map(child => this.nodeToTSX(child, indent + 2))
      .join('\n');

    return `${pad}<div className="${className}${bgClass}"${style}>
${children}
${pad}</div>`;
  }

  private containerToTSX(node: ContainerNode, indent: number): string {
    const pad = ' '.repeat(indent);
    const tag = node.tag || 'div';
    const className = this.layoutToTailwind(node.layout, node.style);
    const sectionType = node.metadata?.sectionType as string | undefined;

    // Check if this should be extracted as a component
    if (this.options.extractComponents && sectionType && node.children.length > 3) {
      const componentName = this.sectionToComponentName(sectionType);
      this.extractSection(componentName, node);
      return `${pad}<${componentName} />`;
    }

    const children = node.children
      .map(child => this.nodeToTSX(child, indent + 2))
      .join('\n');

    const sectionAttr = sectionType ? ` data-section="${sectionType}"` : '';

    if (children) {
      return `${pad}<${tag} className="${className}"${sectionAttr}>
${children}
${pad}</${tag}>`;
    } else {
      return `${pad}<${tag} className="${className}"${sectionAttr} />`;
    }
  }

  private textToTSX(node: TextNode, indent: number): string {
    const pad = ' '.repeat(indent);
    const tag = this.textStyleToTag(node.textStyle);
    const className = this.textToTailwind(node.textStyle);
    const content = this.escapeJSX(node.content);

    return `${pad}<${tag} className="${className}">${content}</${tag}>`;
  }

  private imageToTSX(node: ImageNode, indent: number): string {
    const pad = ' '.repeat(indent);
    const { assetId, url, alt } = node.assetRef;

    if (assetId) {
      this.usedAssets.add(assetId);
      const varName = this.assetIdToVarName(assetId);
      const className = `object-${node.objectFit} ${this.layoutToTailwind(node.layout, node.style)}`;

      if (this.options.framework === 'next') {
        return `${pad}<Image
${pad}  src={${varName}?.url || ''}
${pad}  alt="${alt || ''}"
${pad}  width={${node.layout.width}}
${pad}  height={${node.layout.height}}
${pad}  className="${className}"
${pad}/>`;
      }

      return `${pad}<img
${pad}  src={${varName}?.url || ''}
${pad}  alt="${alt || ''}"
${pad}  className="${className}"
${pad}/>`;
    }

    const className = `object-${node.objectFit} ${this.layoutToTailwind(node.layout, node.style)}`;
    return `${pad}<img src="${url}" alt="${alt || ''}" className="${className}" />`;
  }

  private slotToTSX(node: SlotNode, indent: number): string {
    const pad = ' '.repeat(indent);
    const className = this.layoutToTailwind(node.layout, node.style);

    if (node.currentAsset) {
      this.usedAssets.add(node.currentAsset.assetId);
      const varName = this.assetIdToVarName(node.currentAsset.assetId);
      const fit = node.placementIntent?.fit || 'cover';

      return `${pad}<img
${pad}  src={${varName}?.url || ''}
${pad}  alt="${node.currentAsset.alt || ''}"
${pad}  className="${className} object-${fit}"
${pad}  data-slot="${node.slotId}"
${pad}/>`;
    }

    // Empty slot placeholder
    return `${pad}<div
${pad}  className="${className} border-2 border-dashed border-gray-300 flex items-center justify-center"
${pad}  data-slot="${node.slotId}"
${pad}>
${pad}  <span className="text-gray-400 text-sm">Drop image here</span>
${pad}</div>`;
  }

  // ============================================
  // TAILWIND CONVERSION
  // ============================================

  private layoutToTailwind(layout: NodeLayout, style?: NodeStyle): string {
    const classes: string[] = [];

    // Position (simplified for export)
    if (layout.display === 'flex') {
      classes.push('flex');
      if (layout.flexDirection === 'column') classes.push('flex-col');
      if (layout.justifyContent) {
        const justify: Record<string, string> = {
          start: 'justify-start',
          center: 'justify-center',
          end: 'justify-end',
          between: 'justify-between',
          around: 'justify-around',
        };
        classes.push(justify[layout.justifyContent] || 'justify-start');
      }
      if (layout.alignItems) {
        const align: Record<string, string> = {
          start: 'items-start',
          center: 'items-center',
          end: 'items-end',
          stretch: 'items-stretch',
        };
        classes.push(align[layout.alignItems] || 'items-start');
      }
      if (layout.gap) classes.push(`gap-${Math.round(layout.gap / 4)}`);
    }

    // Padding
    if (layout.padding) {
      const [pt, pr, pb, pl] = layout.padding;
      if (pt === pb && pr === pl && pt === pr) {
        classes.push(`p-${Math.round(pt / 4)}`);
      } else {
        if (pt === pb) classes.push(`py-${Math.round(pt / 4)}`);
        if (pr === pl) classes.push(`px-${Math.round(pr / 4)}`);
      }
    }

    // Style
    if (style) {
      if (style.backgroundColor) {
        // Try to use token color
        classes.push(`bg-[${style.backgroundColor}]`);
      }
      if (style.borderRadius) {
        const radius = typeof style.borderRadius === 'number' ? style.borderRadius : style.borderRadius[0];
        if (radius >= 9999) classes.push('rounded-full');
        else if (radius >= 16) classes.push('rounded-2xl');
        else if (radius >= 12) classes.push('rounded-xl');
        else if (radius >= 8) classes.push('rounded-lg');
        else if (radius >= 4) classes.push('rounded');
        else classes.push('rounded-sm');
      }
      if (style.opacity !== undefined && style.opacity < 1) {
        classes.push(`opacity-${Math.round(style.opacity * 100)}`);
      }
    }

    return classes.join(' ');
  }

  private textToTailwind(textStyle: TextNode['textStyle']): string {
    const classes: string[] = [];

    // Font size
    const sizeMap: Record<number, string> = {
      12: 'text-xs',
      14: 'text-sm',
      16: 'text-base',
      18: 'text-lg',
      20: 'text-xl',
      24: 'text-2xl',
      30: 'text-3xl',
      36: 'text-4xl',
      48: 'text-5xl',
      56: 'text-5xl',
      60: 'text-6xl',
      72: 'text-7xl',
    };
    
    if (textStyle.fontSize) {
      const size = Math.round(textStyle.fontSize);
      const closest = Object.keys(sizeMap)
        .map(Number)
        .reduce((a, b) => Math.abs(b - size) < Math.abs(a - size) ? b : a);
      classes.push(sizeMap[closest] || 'text-base');
    }

    // Font weight
    const weightMap: Record<string | number, string> = {
      400: 'font-normal',
      normal: 'font-normal',
      500: 'font-medium',
      medium: 'font-medium',
      600: 'font-semibold',
      semibold: 'font-semibold',
      700: 'font-bold',
      bold: 'font-bold',
    };
    if (textStyle.fontWeight) {
      classes.push(weightMap[textStyle.fontWeight] || 'font-normal');
    }

    // Text align
    if (textStyle.textAlign) {
      classes.push(`text-${textStyle.textAlign}`);
    }

    // Color
    if (textStyle.color) {
      classes.push(`text-[${textStyle.color}]`);
    }

    // Line height
    if (textStyle.lineHeight && typeof textStyle.lineHeight === 'number') {
      if (textStyle.lineHeight <= 1.25) classes.push('leading-tight');
      else if (textStyle.lineHeight >= 1.75) classes.push('leading-relaxed');
      else classes.push('leading-normal');
    }

    return classes.join(' ');
  }

  private textStyleToTag(textStyle: TextNode['textStyle']): string {
    const size = textStyle.fontSize || 16;
    const weight = textStyle.fontWeight;

    if (size >= 48 || (size >= 36 && weight === 'bold')) return 'h1';
    if (size >= 36 || (size >= 30 && weight === 'bold')) return 'h2';
    if (size >= 24 || (size >= 20 && weight === 'bold')) return 'h3';
    if (size >= 18) return 'h4';
    return 'p';
  }

  // ============================================
  // HTML EXPORT
  // ============================================

  private exportToHTML(scene: RootNode): string {
    const css = this.options.styling === 'css' ? this.exportToCSS() : '';
    const body = this.nodeToHTML(scene, 4);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.options.componentName}</title>
  ${this.options.styling === 'tailwind' ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  ${css ? `<style>\n${css}\n  </style>` : ''}
</head>
<body>
${body}
</body>
</html>`;
  }

  private nodeToHTML(node: SceneNode, indent: number): string {
    const pad = ' '.repeat(indent);

    switch (node.type) {
      case 'root': {
        const root = node as RootNode;
        const children = root.children.map(c => this.nodeToHTML(c, indent + 2)).join('\n');
        return `${pad}<div class="page-root">
${children}
${pad}</div>`;
      }
      case 'container':
      case 'frame':
      case 'group': {
        const container = node as ContainerNode;
        const className = this.layoutToTailwind(container.layout, container.style);
        const children = container.children.map(c => this.nodeToHTML(c, indent + 2)).join('\n');
        const tag = container.tag || 'div';
        return `${pad}<${tag} class="${className}">
${children}
${pad}</${tag}>`;
      }
      case 'text': {
        const text = node as TextNode;
        const tag = this.textStyleToTag(text.textStyle);
        const className = this.textToTailwind(text.textStyle);
        return `${pad}<${tag} class="${className}">${this.escapeHTML(text.content)}</${tag}>`;
      }
      case 'image': {
        const img = node as ImageNode;
        const className = `object-${img.objectFit}`;
        return `${pad}<img src="${img.assetRef.url}" alt="${img.assetRef.alt || ''}" class="${className}" />`;
      }
      case 'slot': {
        const slot = node as SlotNode;
        if (slot.currentAsset) {
          return `${pad}<img src="${slot.currentAsset.url}" alt="" data-slot="${slot.slotId}" />`;
        }
        return `${pad}<div data-slot="${slot.slotId}" class="placeholder"></div>`;
      }
      default:
        return `${pad}<!-- Unknown node -->`;
    }
  }

  // ============================================
  // CSS EXPORT
  // ============================================

  private exportToCSS(): string {
    const tokenManager = getTokenManager();
    return tokenManager.toCSSProperties();
  }

  // ============================================
  // COMPONENT EXTRACTION
  // ============================================

  private extractSection(name: string, node: ContainerNode): void {
    if (this.extractedComponents.has(name)) return;

    const jsx = this.containerToTSXWithoutExtraction(node, 4);
    const imports = this.generateImports();

    const component = `${imports}

export function ${name}() {
  return (
${jsx}
  );
}
`;

    this.extractedComponents.set(name, component);
  }

  private containerToTSXWithoutExtraction(node: ContainerNode, indent: number): string {
    const pad = ' '.repeat(indent);
    const tag = node.tag || 'section';
    const className = this.layoutToTailwind(node.layout, node.style);

    const children = node.children
      .map(child => this.nodeToTSX(child, indent + 2))
      .join('\n');

    return `${pad}<${tag} className="${className}">
${children}
${pad}</${tag}>`;
  }

  private sectionToComponentName(sectionType: string): string {
    return sectionType
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join('') + 'Section';
  }

  // ============================================
  // ASSET MANIFEST
  // ============================================

  private createAssetManifest(): string {
    const assets: Array<{ id: string; url: string; name: string }> = [];

    this.usedAssets.forEach(id => {
      const asset = this.assetRegistry.get(id);
      if (asset) {
        assets.push({
          id: asset.id,
          url: asset.url,
          name: asset.name,
        });
      }
    });

    return JSON.stringify({ assets }, null, 2);
  }

  // ============================================
  // HELPERS
  // ============================================

  private get hasSlots(): boolean {
    return true; // Simplified check
  }

  private get hasImages(): boolean {
    return this.usedAssets.size > 0;
  }

  private assetIdToVarName(id: string): string {
    return `asset_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private escapeJSX(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function exportScene(
  scene: RootNode,
  options?: Partial<ExportOptions>
): ExportResult {
  const exporter = new SceneExporter(options);
  return exporter.export(scene);
}

export function exportToTSX(scene: RootNode, componentName = 'GeneratedPage'): string {
  const result = exportScene(scene, { format: 'tsx', componentName });
  const tsxFile = result.files.find(f => f.type === 'tsx');
  return tsxFile?.content || '';
}

export function exportToHTML(scene: RootNode): string {
  const result = exportScene(scene, { format: 'html' });
  const htmlFile = result.files.find(f => f.type === 'html');
  return htmlFile?.content || '';
}
