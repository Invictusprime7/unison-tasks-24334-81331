import type { AIGeneratedTemplate, TemplateComponent, TemplateSection } from '@/types/template';

export class HTMLExporter {
  /**
   * Export template to HTML/CSS
   */
  exportToHTML(template: AIGeneratedTemplate, data?: Record<string, any>): string {
    const mergedData = { ...template.data, ...data };
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
  <style>
${this.generateCSS(template)}
  </style>
</head>
<body>
  <div class="template-root">
${template.sections.map(section => this.generateSectionHTML(section, mergedData)).join('\n')}
  </div>
</body>
</html>`;
    
    return html;
  }

  /**
   * Export as React component
   */
  exportToReact(template: AIGeneratedTemplate): string {
    const componentName = this.toPascalCase(template.name);
    
    return `import React from 'react';

interface ${componentName}Props {
  data?: {
${Object.keys(template.data).map(key => `    ${key}?: any;`).join('\n')}
  };
}

const ${componentName}: React.FC<${componentName}Props> = ({ data = {} }) => {
  const defaultData = ${JSON.stringify(template.data, null, 2)};
  const mergedData = { ...defaultData, ...data };

  return (
    <div className="${this.toKebabCase(template.name)}">
${template.sections.map(section => this.generateSectionJSX(section, 'mergedData', 3)).join('\n')}
    </div>
  );
};

export default ${componentName};

// CSS Module or styled-components
const styles = \`
${this.generateCSS(template)}
\`;`;
  }

  private generateCSS(template: AIGeneratedTemplate): string {
    const css: string[] = [];
    
    // Root styles
    css.push(`  * { margin: 0; padding: 0; box-sizing: border-box; }`);
    css.push(`  body { font-family: ${template.brandKit.fonts.body}, sans-serif; }`);
    css.push(`  .template-root { width: 100%; }`);
    
    // Section styles
    template.sections.forEach(section => {
      css.push(...this.generateSectionCSS(section, template));
    });
    
    return css.join('\n');
  }

  private generateSectionCSS(section: TemplateSection, template: AIGeneratedTemplate): string[] {
    const css: string[] = [];
    const className = this.toKebabCase(section.name);
    
    const sectionStyles = [
      `  .section-${className} {`,
      `    display: flex;`,
      `    flex-direction: ${section.constraints.flexDirection || 'column'};`,
      section.constraints.alignItems && `    align-items: ${section.constraints.alignItems};`,
      section.constraints.justifyContent && `    justify-content: ${section.constraints.justifyContent};`,
      section.constraints.gap && `    gap: ${section.constraints.gap}px;`,
      section.constraints.padding && `    padding: ${section.constraints.padding.top}px ${section.constraints.padding.right}px ${section.constraints.padding.bottom}px ${section.constraints.padding.left}px;`,
      section.constraints.width.mode === 'fill' && `    width: 100%;`,
      section.constraints.width.mode === 'fixed' && section.constraints.width.value && `    width: ${section.constraints.width.value}px;`,
      section.constraints.height.mode === 'fixed' && section.constraints.height.value && `    height: ${section.constraints.height.value}px;`,
      `  }`
    ].filter(Boolean);
    
    css.push(sectionStyles.join('\n'));
    
    // Component styles
    section.components.forEach(component => {
      css.push(...this.generateComponentCSS(component, template));
    });
    
    return css;
  }

  private generateComponentCSS(component: TemplateComponent, template: AIGeneratedTemplate): string[] {
    const css: string[] = [];
    const className = this.toKebabCase(component.name);
    
    const componentStyles = [
      `  .component-${className} {`,
      component.constraints.width.mode === 'fill' && `    width: 100%;`,
      component.constraints.width.mode === 'fixed' && component.constraints.width.value && `    width: ${component.constraints.width.value}px;`,
      component.constraints.height.mode === 'fixed' && component.constraints.height.value && `    height: ${component.constraints.height.value}px;`,
      component.style.backgroundColor && `    background-color: ${component.style.backgroundColor};`,
      component.style.borderRadius && `    border-radius: ${component.style.borderRadius}px;`,
      component.style.opacity !== undefined && `    opacity: ${component.style.opacity};`,
      component.fabricProps?.fontSize && `    font-size: ${component.fabricProps.fontSize}px;`,
      component.fabricProps?.fontFamily && `    font-family: ${component.fabricProps.fontFamily}, sans-serif;`,
      component.fabricProps?.fill && `    color: ${component.fabricProps.fill};`,
      component.fabricProps?.fontWeight && `    font-weight: ${component.fabricProps.fontWeight};`,
      component.constraints.margin && `    margin: ${component.constraints.margin.top}px ${component.constraints.margin.right}px ${component.constraints.margin.bottom}px ${component.constraints.margin.left}px;`,
      component.type === 'button' && `    cursor: pointer;`,
      component.type === 'button' && `    border: none;`,
      component.type === 'button' && `    padding: 12px 24px;`,
      `  }`
    ].filter(Boolean);
    
    css.push(componentStyles.join('\n'));
    
    if (component.children) {
      component.children.forEach(child => {
        css.push(...this.generateComponentCSS(child, template));
      });
    }
    
    return css;
  }

  private generateSectionHTML(section: TemplateSection, data: Record<string, any>): string {
    const className = this.toKebabCase(section.name);
    const components = section.components
      .map(component => this.generateComponentHTML(component, data, 2))
      .join('\n');
    
    return `  <section class="section-${className}">\n${components}\n  </section>`;
  }

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
      case 'text':
        return `${spaces}<div class="component-${className}">${value}</div>`;
      
      case 'image':
        return `${spaces}<img class="component-${className}" src="${value}" alt="${component.name}" />`;
      
      case 'button':
        return `${spaces}<button class="component-${className}">${value}</button>`;
      
      case 'container':
        const children = component.children
          ?.map(child => this.generateComponentHTML(child, data, indent + 1))
          .join('\n') || '';
        return `${spaces}<div class="component-${className}">\n${children}\n${spaces}</div>`;
      
      case 'shape':
        return `${spaces}<div class="component-${className}"></div>`;
      
      default:
        return `${spaces}<div class="component-${className}">${value}</div>`;
    }
  }

  private generateSectionJSX(section: TemplateSection, dataVar: string, indent = 0): string {
    const className = this.toKebabCase(section.name);
    const spaces = '  '.repeat(indent);
    const components = section.components
      .map(component => this.generateComponentJSX(component, dataVar, indent + 1))
      .join('\n');
    
    return `${spaces}<section className="section-${className}">\n${components}\n${spaces}</section>`;
  }

  private generateComponentJSX(component: TemplateComponent, dataVar: string, indent = 0): string {
    const className = this.toKebabCase(component.name);
    const spaces = '  '.repeat(indent);
    
    const dataAccess = component.dataBinding 
      ? `{${dataVar}.${component.dataBinding.field} || '${component.dataBinding.defaultValue || ''}'}`
      : `'${component.dataBinding?.defaultValue || ''}'`;
    
    switch (component.type) {
      case 'text':
        return `${spaces}<div className="component-${className}">${dataAccess}</div>`;
      
      case 'image':
        return `${spaces}<img className="component-${className}" src=${dataAccess} alt="${component.name}" />`;
      
      case 'button':
        return `${spaces}<button className="component-${className}">${dataAccess}</button>`;
      
      case 'container':
        const children = component.children
          ?.map(child => this.generateComponentJSX(child, dataVar, indent + 1))
          .join('\n') || '';
        return `${spaces}<div className="component-${className}">\n${children}\n${spaces}</div>`;
      
      case 'shape':
        return `${spaces}<div className="component-${className}"></div>`;
      
      default:
        return `${spaces}<div className="component-${className}">${dataAccess}</div>`;
    }
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, (_, c) => c.toUpperCase());
  }
}
