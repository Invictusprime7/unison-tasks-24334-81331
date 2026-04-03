import type { AIGeneratedTemplate, TemplateComponent, TemplateSection } from '@/types/template';

/**
 * Phase 2: TemplateToHTMLExporter
 * Converts template schema to clean, semantic HTML/CSS with design tokens
 */
export class TemplateToHTMLExporter {
  private designTokens: Map<string, string>;

  constructor() {
    this.designTokens = this.extractDesignTokens();
  }

  /**
   * Extract design tokens from index.css for runtime use
   */
  private extractDesignTokens(): Map<string, string> {
    const tokens = new Map<string, string>();
    
    // Core semantic color tokens (HSL format)
    tokens.set('background', 'hsl(var(--background))');
    tokens.set('foreground', 'hsl(var(--foreground))');
    tokens.set('primary', 'hsl(var(--primary))');
    tokens.set('primary-foreground', 'hsl(var(--primary-foreground))');
    tokens.set('secondary', 'hsl(var(--secondary))');
    tokens.set('secondary-foreground', 'hsl(var(--secondary-foreground))');
    tokens.set('accent', 'hsl(var(--accent))');
    tokens.set('accent-foreground', 'hsl(var(--accent-foreground))');
    tokens.set('muted', 'hsl(var(--muted))');
    tokens.set('muted-foreground', 'hsl(var(--muted-foreground))');
    tokens.set('card', 'hsl(var(--card))');
    tokens.set('card-foreground', 'hsl(var(--card-foreground))');
    tokens.set('border', 'hsl(var(--border))');
    
    // Spacing scale
    tokens.set('space-1', 'var(--space-1)');
    tokens.set('space-2', 'var(--space-2)');
    tokens.set('space-3', 'var(--space-3)');
    tokens.set('space-4', 'var(--space-4)');
    tokens.set('space-6', 'var(--space-6)');
    tokens.set('space-8', 'var(--space-8)');
    tokens.set('space-12', 'var(--space-12)');
    tokens.set('space-16', 'var(--space-16)');
    
    // Typography
    tokens.set('font-size-sm', 'var(--font-size-sm)');
    tokens.set('font-size-base', 'var(--font-size-base)');
    tokens.set('font-size-lg', 'var(--font-size-lg)');
    tokens.set('font-size-xl', 'var(--font-size-xl)');
    tokens.set('font-size-2xl', 'var(--font-size-2xl)');
    tokens.set('font-size-3xl', 'var(--font-size-3xl)');
    tokens.set('font-size-4xl', 'var(--font-size-4xl)');
    
    // Border radius
    tokens.set('radius-sm', 'var(--radius-sm)');
    tokens.set('radius-base', 'var(--radius-base)');
    tokens.set('radius-md', 'var(--radius-md)');
    tokens.set('radius-lg', 'var(--radius-lg)');
    tokens.set('radius-xl', 'var(--radius-xl)');
    tokens.set('radius-2xl', 'var(--radius-2xl)');
    
    // Shadows
    tokens.set('shadow-sm', 'var(--shadow-sm)');
    tokens.set('shadow-md', 'var(--shadow-md)');
    tokens.set('shadow-lg', 'var(--shadow-lg)');
    tokens.set('shadow-xl', 'var(--shadow-xl)');
    
    return tokens;
  }

  /**
   * Convert template to complete HTML document with embedded CSS
   */
  exportToHTML(template: AIGeneratedTemplate, data?: Record<string, any>): string {
    const mergedData = { ...template.data, ...data };
    const css = this.generateSemanticCSS(template);
    const bodyHTML = this.generateSemanticHTML(template, mergedData);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${template.description || ''}">
  <title>${template.name}</title>
  ${this.generateFontLinks(template)}
  <style>
${css}
  </style>
</head>
<body>
${bodyHTML}
</body>
</html>`;
  }

  /**
   * Generate Google Fonts links
   */
  private generateFontLinks(template: AIGeneratedTemplate): string {
    const fonts = new Set<string>();
    
    if (template.brandKit?.fonts?.heading) fonts.add(template.brandKit.fonts.heading);
    if (template.brandKit?.fonts?.body) fonts.add(template.brandKit.fonts.body);
    if (template.brandKit?.fonts?.accent) fonts.add(template.brandKit.fonts.accent);
    
    if (fonts.size === 0) return '';
    
    const fontFamilies = Array.from(fonts)
      .map(f => f.replace(/\s+/g, '+'))
      .join('&family=');
    
    return `  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@300;400;500;600;700&display=swap">`;
  }

  /**
   * Generate semantic CSS with design tokens
   */
  private generateSemanticCSS(template: AIGeneratedTemplate): string {
    const css: string[] = [];
    
    // CSS Variables from design system
    css.push(`    /* Design Tokens */`);
    css.push(`    :root {`);
    css.push(`      --background: 0 0% 98%;`);
    css.push(`      --foreground: 0 0% 5%;`);
    css.push(`      --primary: 210 100% 50%;`);
    css.push(`      --primary-foreground: 0 0% 100%;`);
    css.push(`      --secondary: 0 0% 90%;`);
    css.push(`      --secondary-foreground: 0 0% 10%;`);
    css.push(`      --accent: 200 90% 55%;`);
    css.push(`      --accent-foreground: 0 0% 100%;`);
    css.push(`      --muted: 0 0% 92%;`);
    css.push(`      --muted-foreground: 0 0% 45%;`);
    css.push(`      --card: 0 0% 100%;`);
    css.push(`      --card-foreground: 0 0% 8%;`);
    css.push(`      --border: 0 0% 88%;`);
    css.push(`      --radius: 0.75rem;`);
    css.push(`      `);
    css.push(`      --space-1: 0.25rem;`);
    css.push(`      --space-2: 0.5rem;`);
    css.push(`      --space-3: 0.75rem;`);
    css.push(`      --space-4: 1rem;`);
    css.push(`      --space-6: 1.5rem;`);
    css.push(`      --space-8: 2rem;`);
    css.push(`      --space-12: 3rem;`);
    css.push(`      --space-16: 4rem;`);
    css.push(`      `);
    css.push(`      --font-size-sm: 0.875rem;`);
    css.push(`      --font-size-base: 1rem;`);
    css.push(`      --font-size-lg: 1.125rem;`);
    css.push(`      --font-size-xl: 1.25rem;`);
    css.push(`      --font-size-2xl: 1.5rem;`);
    css.push(`      --font-size-3xl: 1.875rem;`);
    css.push(`      --font-size-4xl: 2.25rem;`);
    css.push(`      `);
    css.push(`      --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1);`);
    css.push(`      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);`);
    css.push(`      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);`);
    css.push(`    }`);
    css.push(``);
    
    // Reset & Base
    css.push(`    * { margin: 0; padding: 0; box-sizing: border-box; }`);
    css.push(`    `);
    css.push(`    body {`);
    css.push(`      font-family: ${template.brandKit?.fonts?.body || 'system-ui'}, -apple-system, sans-serif;`);
    css.push(`      background: hsl(var(--background));`);
    css.push(`      color: hsl(var(--foreground));`);
    css.push(`      line-height: 1.6;`);
    css.push(`      -webkit-font-smoothing: antialiased;`);
    css.push(`    }`);
    css.push(``);
    css.push(`    img { max-width: 100%; height: auto; display: block; }`);
    css.push(`    button { font-family: inherit; }`);
    css.push(``);
    
    // Section styles
    template.sections.forEach(section => {
      css.push(...this.generateSectionCSS(section, template));
    });
    
    return css.join('\n');
  }

  /**
   * Generate CSS for a section using semantic tokens
   */
  private generateSectionCSS(section: TemplateSection, template: AIGeneratedTemplate): string[] {
    const css: string[] = [];
    const className = this.toKebabCase(section.name);
    
    // Semantic section styling
    css.push(`    .section-${className} {`);
    css.push(`      display: flex;`);
    css.push(`      flex-direction: ${section.constraints.flexDirection || 'column'};`);
    
    if (section.constraints.alignItems) {
      css.push(`      align-items: ${section.constraints.alignItems};`);
    }
    if (section.constraints.justifyContent) {
      css.push(`      justify-content: ${section.constraints.justifyContent};`);
    }
    if (section.constraints.gap) {
      css.push(`      gap: ${this.mapToSpacingToken(section.constraints.gap)};`);
    }
    if (section.constraints.padding) {
      const p = section.constraints.padding;
      css.push(`      padding: ${this.mapToSpacingToken(p.top)} ${this.mapToSpacingToken(p.right)} ${this.mapToSpacingToken(p.bottom)} ${this.mapToSpacingToken(p.left)};`);
    }
    if (section.constraints.width.mode === 'fill') {
      css.push(`      width: 100%;`);
    } else if (section.constraints.width.mode === 'fixed' && section.constraints.width.value) {
      css.push(`      width: ${section.constraints.width.value}px;`);
    }
    if (section.constraints.height.mode === 'fixed' && section.constraints.height.value) {
      css.push(`      min-height: ${section.constraints.height.value}px;`);
    }
    
    css.push(`    }`);
    css.push(``);
    
    // Component styles
    section.components.forEach(component => {
      css.push(...this.generateComponentCSS(component, template));
    });
    
    return css;
  }

  /**
   * Generate CSS for a component using semantic tokens
   */
  private generateComponentCSS(component: TemplateComponent, template: AIGeneratedTemplate): string[] {
    const css: string[] = [];
    const className = this.toKebabCase(component.name);
    
    css.push(`    .component-${className} {`);
    
    // Layout
    if (component.constraints.width.mode === 'fill') {
      css.push(`      width: 100%;`);
    } else if (component.constraints.width.mode === 'fixed' && component.constraints.width.value) {
      css.push(`      width: ${component.constraints.width.value}px;`);
    }
    if (component.constraints.height.mode === 'fixed' && component.constraints.height.value) {
      css.push(`      height: ${component.constraints.height.value}px;`);
    }
    
    // Spacing
    if (component.constraints.margin) {
      const m = component.constraints.margin;
      css.push(`      margin: ${this.mapToSpacingToken(m.top)} ${this.mapToSpacingToken(m.right)} ${this.mapToSpacingToken(m.bottom)} ${this.mapToSpacingToken(m.left)};`);
    }
    if (component.constraints.padding) {
      const p = component.constraints.padding;
      css.push(`      padding: ${this.mapToSpacingToken(p.top)} ${this.mapToSpacingToken(p.right)} ${this.mapToSpacingToken(p.bottom)} ${this.mapToSpacingToken(p.left)};`);
    }
    
    // Visual style using design tokens
    if (component.style.backgroundColor) {
      css.push(`      background-color: ${this.mapToColorToken(component.style.backgroundColor)};`);
    }
    if (component.style.borderRadius) {
      css.push(`      border-radius: ${this.mapToRadiusToken(component.style.borderRadius)};`);
    }
    if (component.style.opacity !== undefined) {
      css.push(`      opacity: ${component.style.opacity};`);
    }
    
    // Typography
    if (component.fabricProps?.fontSize) {
      css.push(`      font-size: ${this.mapToFontSizeToken(Number(component.fabricProps.fontSize))};`);
    }
    if (component.fabricProps?.fontFamily) {
      css.push(`      font-family: ${String(component.fabricProps.fontFamily)}, sans-serif;`);
    }
    if (component.fabricProps?.fill) {
      css.push(`      color: ${this.mapToColorToken(String(component.fabricProps.fill))};`);
    }
    if (component.fabricProps?.fontWeight) {
      css.push(`      font-weight: ${component.fabricProps.fontWeight};`);
    }
    
    // Type-specific styling
    if (component.type === 'button') {
      css.push(`      cursor: pointer;`);
      css.push(`      border: none;`);
      css.push(`      transition: all 0.2s ease;`);
      if (!component.constraints.padding) {
        css.push(`      padding: var(--space-3) var(--space-6);`);
      }
    }
    
    if (component.type === 'container') {
      css.push(`      display: flex;`);
      css.push(`      flex-direction: ${component.constraints.flexDirection || 'column'};`);
      if (component.constraints.gap) {
        css.push(`      gap: ${this.mapToSpacingToken(component.constraints.gap)};`);
      }
    }
    
    css.push(`    }`);
    css.push(``);
    
    // Button hover state
    if (component.type === 'button') {
      css.push(`    .component-${className}:hover {`);
      css.push(`      opacity: 0.9;`);
      css.push(`      transform: translateY(-1px);`);
      css.push(`    }`);
      css.push(``);
    }
    
    // Recursive for children
    if (component.children) {
      component.children.forEach(child => {
        css.push(...this.generateComponentCSS(child, template));
      });
    }
    
    return css;
  }

  /**
   * Generate semantic HTML structure
   */
  private generateSemanticHTML(template: AIGeneratedTemplate, data: Record<string, any>): string {
    const sections = template.sections
      .map(section => this.generateSectionHTML(section, data))
      .join('\n');
    
    return `  <main class="template-root">\n${sections}\n  </main>`;
  }

  /**
   * Generate semantic section HTML
   */
  private generateSectionHTML(section: TemplateSection, data: Record<string, any>): string {
    const className = this.toKebabCase(section.name);
    const tag = this.getSemanticTagForSection(section.type);
    const components = section.components
      .map(component => this.generateComponentHTML(component, data, 2))
      .join('\n');
    
    return `    <${tag} class="section-${className}">\n${components}\n    </${tag}>`;
  }

  /**
   * Map section type to semantic HTML tag
   */
  private getSemanticTagForSection(type: string): string {
    switch (type) {
      case 'hero': return 'header';
      case 'footer': return 'footer';
      case 'content': return 'section';
      case 'cta': return 'section';
      case 'gallery': return 'section';
      default: return 'section';
    }
  }

  /**
   * Generate component HTML
   */
  private generateComponentHTML(component: TemplateComponent, data: Record<string, any>, indent = 0): string {
    const className = this.toKebabCase(component.name);
    const spaces = '  '.repeat(indent);
    
    let value: string = String(component.dataBinding?.defaultValue || '');
    if (component.dataBinding && data[component.dataBinding.field] !== undefined) {
      value = String(data[component.dataBinding.field]);
      if (component.dataBinding.format) {
        value = component.dataBinding.format.replace('${0}', value);
      }
    }
    
    switch (component.type) {
      case 'text': {
        const tag = this.inferTextTag(component);
        return `${spaces}<${tag} class="component-${className}">${value}</${tag}>`;
      }
      
      case 'image':
        return `${spaces}<img class="component-${className}" src="${value}" alt="${component.name}" loading="lazy" />`;
      
      case 'button':
        return `${spaces}<button class="component-${className}" type="button">${value}</button>`;
      
      case 'container': {
        const children = component.children
          ?.map(child => this.generateComponentHTML(child, data, indent + 1))
          .join('\n') || '';
        return `${spaces}<div class="component-${className}">\n${children}\n${spaces}</div>`;
      }
      
      case 'shape':
        return `${spaces}<div class="component-${className}" role="presentation" aria-hidden="true"></div>`;
      
      default:
        return `${spaces}<div class="component-${className}">${value}</div>`;
    }
  }

  /**
   * Infer semantic text tag from component properties
   */
  private inferTextTag(component: TemplateComponent): string {
    const fontSize = Number(component.fabricProps?.fontSize) || 16;
    const fontWeight = String(component.fabricProps?.fontWeight || 'normal');
    
    if (fontSize >= 36 || fontWeight === 'bold') return 'h1';
    if (fontSize >= 30) return 'h2';
    if (fontSize >= 24) return 'h3';
    if (fontSize >= 20) return 'h4';
    
    return 'p';
  }

  /**
   * Map pixel values to spacing tokens
   */
  private mapToSpacingToken(px: number): string {
    if (px <= 4) return 'var(--space-1)';
    if (px <= 8) return 'var(--space-2)';
    if (px <= 12) return 'var(--space-3)';
    if (px <= 16) return 'var(--space-4)';
    if (px <= 24) return 'var(--space-6)';
    if (px <= 32) return 'var(--space-8)';
    if (px <= 48) return 'var(--space-12)';
    return `${px}px`;
  }

  /**
   * Map pixel values to font size tokens
   */
  private mapToFontSizeToken(px: number): string {
    if (px <= 14) return 'var(--font-size-sm)';
    if (px <= 16) return 'var(--font-size-base)';
    if (px <= 18) return 'var(--font-size-lg)';
    if (px <= 20) return 'var(--font-size-xl)';
    if (px <= 24) return 'var(--font-size-2xl)';
    if (px <= 30) return 'var(--font-size-3xl)';
    if (px <= 36) return 'var(--font-size-4xl)';
    return `${px}px`;
  }

  /**
   * Map pixel values to border radius tokens
   */
  private mapToRadiusToken(px: number): string {
    if (px <= 2) return 'var(--radius-sm)';
    if (px <= 4) return 'var(--radius-base)';
    if (px <= 6) return 'var(--radius-md)';
    if (px <= 8) return 'var(--radius-lg)';
    if (px <= 12) return 'var(--radius-xl)';
    if (px <= 16) return 'var(--radius-2xl)';
    return `${px}px`;
  }

  /**
   * Map color values to semantic tokens
   */
  private mapToColorToken(color: string): string {
    // Try to match common colors to semantic tokens
    const colorLower = color.toLowerCase();
    
    if (colorLower.includes('blue') || colorLower === '#0066ff' || colorLower === '#007bff') {
      return 'hsl(var(--primary))';
    }
    if (colorLower.includes('gray') || colorLower.includes('grey')) {
      return 'hsl(var(--muted))';
    }
    if (colorLower === '#ffffff' || colorLower === 'white') {
      return 'hsl(var(--card))';
    }
    if (colorLower === '#000000' || colorLower === 'black') {
      return 'hsl(var(--foreground))';
    }
    
    // Return as-is if no token match
    return color;
  }

  /**
   * Utility: Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
