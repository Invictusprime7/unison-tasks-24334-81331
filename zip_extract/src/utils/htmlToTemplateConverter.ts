import type { AIGeneratedTemplate, TemplateSection, TemplateComponent, TemplateBrandKit, TemplateFormat } from '@/types/template';

/**
 * Converts HTML/CSS code into AIGeneratedTemplate schema for canvas rendering
 */
export class HTMLToTemplateConverter {
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private extractBrandKit(cssContent: string): TemplateBrandKit {
    // Extract colors from CSS
    const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
    const colors = cssContent.match(colorRegex) || [];
    
    // Extract font families
    const fontRegex = /font-family:\s*([^;]+)/gi;
    const fontMatches = cssContent.match(fontRegex) || [];
    const fonts = fontMatches.map(match => match.replace(/font-family:\s*/, '').replace(/['"]/g, '').split(',')[0].trim());

    return {
      primaryColor: colors[0] || '#3b82f6',
      secondaryColor: colors[1] || '#1e40af',
      accentColor: colors[2] || '#06b6d4',
      fonts: {
        heading: fonts[0] || 'Inter',
        body: fonts[1] || fonts[0] || 'Inter',
        accent: fonts[2] || fonts[1] || fonts[0] || 'Inter',
      }
    };
  }

  private parseHTMLElement(element: Element, cssContent: string): TemplateComponent {
    const id = this.generateId();
    const tagName = element.tagName.toLowerCase();
    
    // Determine component type based on tag
    let type: TemplateComponent['type'] = 'container';
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6' || tagName === 'p' || tagName === 'span') {
      type = 'text';
    } else if (tagName === 'img') {
      type = 'image';
    } else if (tagName === 'button' || tagName === 'a') {
      type = 'button';
    } else if (tagName === 'video') {
      type = 'video';
    }

    // Extract text content
    const textContent = type === 'text' ? element.textContent?.trim() || '' : '';
    
    // Extract style information
    const computedStyle = element.getAttribute('style') || '';
    const className = element.getAttribute('class') || '';
    
    // Parse basic styles
    const backgroundColor = this.extractStyleValue(computedStyle, cssContent, className, 'background-color') || 'transparent';
    const borderRadius = parseInt(this.extractStyleValue(computedStyle, cssContent, className, 'border-radius') || '0');
    
    // Get dimensions and positioning (approximate)
    const width = this.extractDimension(computedStyle, cssContent, className, 'width');
    const height = this.extractDimension(computedStyle, cssContent, className, 'height');

    return {
      id,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id.substring(0, 4)}`,
      constraints: {
        width: width ? { mode: 'fixed', value: width } : { mode: 'hug' },
        height: height ? { mode: 'fixed', value: height } : { mode: 'hug' },
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 8,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      },
      style: {
        backgroundColor,
        borderRadius,
        opacity: 1,
        filters: []
      },
      fabricProps: {
        text: textContent,
        fontSize: type === 'text' ? this.getFontSize(tagName) : undefined,
        fontFamily: 'Inter',
        fill: type === 'text' ? '#000000' : backgroundColor,
        selectable: true,
        editable: type === 'text',
        hasControls: true,
        hasBorders: true
      }
    };
  }

  private extractStyleValue(inlineStyle: string, cssContent: string, className: string, property: string): string | null {
    // Try inline style first
    const inlineRegex = new RegExp(`${property}:\\s*([^;]+)`, 'i');
    const inlineMatch = inlineStyle.match(inlineRegex);
    if (inlineMatch) return inlineMatch[1].trim();

    // Try CSS classes
    if (className) {
      const classSelector = `.${className.split(' ')[0]}`;
      const classRegex = new RegExp(`${classSelector}\\s*{[^}]*${property}:\\s*([^;]+)`, 'i');
      const classMatch = cssContent.match(classRegex);
      if (classMatch) return classMatch[1].trim();
    }

    return null;
  }

  private extractDimension(inlineStyle: string, cssContent: string, className: string, property: string): number | null {
    const value = this.extractStyleValue(inlineStyle, cssContent, className, property);
    if (!value) return null;
    
    const numMatch = value.match(/(\d+)px/);
    return numMatch ? parseInt(numMatch[1]) : null;
  }

  private getFontSize(tagName: string): number {
    const fontSizes: Record<string, number> = {
      h1: 32,
      h2: 28,
      h3: 24,
      h4: 20,
      h5: 18,
      h6: 16,
      p: 16,
      span: 14
    };
    return fontSizes[tagName] || 16;
  }

  private parseHTMLToSections(htmlContent: string, cssContent: string): TemplateSection[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find main sections
    const sections: TemplateSection[] = [];
    const body = doc.body;
    
    if (!body) return sections;

    // Look for semantic sections or create sections from major containers
    const sectionElements = body.querySelectorAll('header, main, section, article, aside, footer, div.section, div.container, div[class*="section"]');
    
    if (sectionElements.length === 0) {
      // If no semantic sections, treat the whole body as one section
      const components = Array.from(body.children).map(child => 
        this.parseHTMLElement(child, cssContent)
      );
      
      sections.push({
        id: this.generateId(),
        name: 'Main Section',
        type: 'content',
        constraints: {
          width: { mode: 'fill' },
          height: { mode: 'hug' },
          padding: { top: 40, right: 40, bottom: 40, left: 40 },
          gap: 24,
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        },
        components
      });
    } else {
      // Parse each semantic section
      sectionElements.forEach((element, index) => {
        const tagName = element.tagName.toLowerCase();
        let sectionType: TemplateSection['type'] = 'content';
        
        if (tagName === 'header' || element.className.includes('hero')) {
          sectionType = 'hero';
        } else if (tagName === 'footer') {
          sectionType = 'footer';
        } else if (element.className.includes('cta') || element.className.includes('call-to-action')) {
          sectionType = 'cta';
        } else if (element.className.includes('gallery')) {
          sectionType = 'gallery';
        }

        const components = Array.from(element.children).map(child => 
          this.parseHTMLElement(child, cssContent)
        );

        sections.push({
          id: this.generateId(),
          name: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Section ${index + 1}`,
          type: sectionType,
          constraints: {
            width: { mode: 'fill' },
            height: { mode: 'hug' },
            padding: { top: 40, right: 40, bottom: 40, left: 40 },
            gap: 24,
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          },
          components
        });
      });
    }

    return sections;
  }

  /**
   * Converts HTML/CSS into AIGeneratedTemplate schema
   */
  convertToTemplate(
    htmlCode: string, 
    templateName: string, 
    aesthetic: string = 'Modern',
    industry: string = 'web'
  ): AIGeneratedTemplate {
    // Extract CSS from HTML
    const styleMatch = htmlCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const cssContent = styleMatch ? styleMatch[1] : '';
    
    // Remove CSS from HTML for parsing
    const htmlContent = htmlCode.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Extract brand kit from CSS
    const brandKit = this.extractBrandKit(cssContent);
    
    // Parse HTML into sections
    const sections = this.parseHTMLToSections(htmlContent, cssContent);
    
    // Create default format
    const formats: TemplateFormat[] = [
      {
        id: this.generateId(),
        name: 'Web Desktop',
        size: { width: 1280, height: 800 },
        format: 'web'
      }
    ];

    // Create template
    const template: AIGeneratedTemplate = {
      id: this.generateId(),
      name: templateName,
      description: `${aesthetic} template generated from HTML/CSS`,
      industry,
      brandKit,
      sections,
      formats,
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('[HTMLToTemplateConverter] Generated template:', template);
    return template;
  }
}

/**
 * Utility function to convert HTML/CSS to template schema
 */
export const convertHTMLToTemplate = (
  htmlCode: string,
  templateName: string,
  aesthetic?: string,
  industry?: string
): AIGeneratedTemplate => {
  const converter = new HTMLToTemplateConverter();
  return converter.convertToTemplate(htmlCode, templateName, aesthetic, industry);
};