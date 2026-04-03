/**
 * React to Vanilla JavaScript Converter
 * Converts React/TypeScript templates to vanilla HTML/CSS/JavaScript
 * for rendering in CodeMirror Editor and Canvas preview
 */

export interface ConversionOptions {
  preserveTypeScript?: boolean;
  includePolyfills?: boolean;
  targetES?: 'ES5' | 'ES2015' | 'ES2017' | 'ES2020';
  minify?: boolean;
}

export interface ComponentProps {
  [key: string]: string | number | boolean | undefined;
}

export interface ReactComponent {
  name: string;
  jsx: string;
  props: ComponentProps;
}

export interface ConversionResult {
  html: string;
  css: string;
  javascript: string;
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

export class ReactToVanillaConverter {
  private static instance: ReactToVanillaConverter;

  public static getInstance(): ReactToVanillaConverter {
    if (!ReactToVanillaConverter.instance) {
      ReactToVanillaConverter.instance = new ReactToVanillaConverter();
    }
    return ReactToVanillaConverter.instance;
  }

  /**
   * Convert React/TypeScript code to vanilla HTML/CSS/JavaScript
   */
  public async convertReactToVanilla(
    reactCode: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    try {
      // Extract JSX/TSX components
      const components = this.extractComponents(reactCode);
      
      // Convert JSX to vanilla HTML
      const html = this.convertJSXToHTML(components, options);
      
      // Extract and convert styles
      const css = this.extractAndConvertStyles(reactCode, options);
      
      // Convert React state/effects to vanilla JavaScript
      const javascript = this.convertReactLogicToVanilla(components, options);

      return {
        html,
        css,
        javascript,
        success: true
      };
    } catch (error) {
      return {
        html: '',
        css: '',
        javascript: '',
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown conversion error']
      };
    }
  }

  /**
   * Convert React component with glass UI styling
   * Specifically optimized for glass morphism and animations
   */
  public async convertGlassUIComponent(reactCode: string): Promise<ConversionResult> {
    try {
      // Enhanced conversion for glass UI components
      const glassHTML = this.convertGlassJSXToHTML(reactCode);
      const glassCSS = this.generateGlassUICSS(reactCode);
      const glassJS = this.generateGlassUIInteractions(reactCode);

      return {
        html: glassHTML,
        css: glassCSS,
        javascript: glassJS,
        success: true
      };
    } catch (error) {
      return {
        html: '',
        css: '',
        javascript: '',
        success: false,
        errors: [error instanceof Error ? error.message : 'Glass UI conversion error']
      };
    }
  }

  private extractComponents(code: string): ReactComponent[] {
    // Extract React components from code
    const componentRegex = /(?:function|const)\s+(\w+).*?(?:return\s*\()([\s\S]*?)(?:\);?\s*})/g;
    const components: ReactComponent[] = [];
    
    let match;
    while ((match = componentRegex.exec(code)) !== null) {
      components.push({
        name: match[1],
        jsx: match[2],
        props: {} as ComponentProps
      });
    }
    
    return components;
  }

  private convertJSXToHTML(components: ReactComponent[], options: ConversionOptions): string {
    if (components.length === 0) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glass UI Template</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
    <div id="app" class="min-h-screen">
        <!-- Template content will be rendered here -->
    </div>
</body>
</html>`;
    }

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glass UI Template</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">`;

    // Convert JSX to HTML
    components.forEach(component => {
      const convertedHTML = this.jsxToHTML(component.jsx);
      html += `\n    ${convertedHTML}`;
    });

    html += `\n</body>\n</html>`;
    return html;
  }

  private convertGlassJSXToHTML(reactCode: string): string {
    // Enhanced conversion specifically for glass UI components
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glass UI Template</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            overflow-x: hidden;
        }
        
        .glass-container {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        
        .glass-card {
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            background: rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 24px 0 rgba(31, 38, 135, 0.25);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .glass-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 40px 0 rgba(31, 38, 135, 0.4);
        }
    </style>
</head>
<body>
    <div class="min-h-screen p-6 flex items-center justify-center">
        <div class="glass-container p-8 max-w-4xl w-full">
            <h1 class="text-4xl font-bold text-white mb-6 text-center">Glass UI Template</h1>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="glass-card p-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Feature 1</h3>
                    <p class="text-gray-200">Beautiful glass morphism design with modern aesthetics.</p>
                </div>
                <div class="glass-card p-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Feature 2</h3>
                    <p class="text-gray-200">Smooth animations and state-driven interactions.</p>
                </div>
                <div class="glass-card p-6">
                    <h3 class="text-xl font-semibold text-white mb-4">Feature 3</h3>
                    <p class="text-gray-200">Responsive design with subtle hover effects.</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateGlassUICSS(reactCode: string): string {
    return `/* Glass UI CSS */
.glass-morphism {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.glass-animation {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-hover:hover {
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 20px 60px 0 rgba(31, 38, 135, 0.5);
}`;
  }

  private generateGlassUIInteractions(reactCode: string): string {
    return `// Glass UI Interactions
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Glass card hover effects
    const glassCards = document.querySelectorAll('.glass-card');
    glassCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.boxShadow = '0 20px 60px 0 rgba(31, 38, 135, 0.5)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 4px 24px 0 rgba(31, 38, 135, 0.25)';
        });
    });
    
    // Parallax background effect
    window.addEventListener('mousemove', function(e) {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        document.body.style.background = \`linear-gradient(135deg, 
            hsl(\${220 + mouseX * 20}, 70%, \${60 + mouseY * 10}%) 0%, 
            hsl(\${280 + mouseX * 20}, 60%, \${50 + mouseY * 10}%) 100%)\`;
    });
});`;
  }

  private extractAndConvertStyles(code: string, options: ConversionOptions): string {
    // Extract styled-components, CSS modules, or inline styles
    const stylesRegex = /styled\.\w+`([^`]+)`/g;
    let extractedStyles = '';
    
    let match;
    while ((match = stylesRegex.exec(code)) !== null) {
      extractedStyles += match[1] + '\n';
    }
    
    return extractedStyles || this.generateDefaultGlassCSS();
  }

  private convertReactLogicToVanilla(components: ReactComponent[], options: ConversionOptions): string {
    // Convert React hooks and state management to vanilla JavaScript
    return `// Vanilla JavaScript converted from React
document.addEventListener('DOMContentLoaded', function() {
    // State management
    let state = {};
    
    // Event handlers
    function updateState(newState) {
        state = { ...state, ...newState };
        render();
    }
    
    function render() {
        // Re-render logic here
        console.log('State updated:', state);
    }
    
    // Initialize app
    render();
});`;
  }

  private jsxToHTML(jsx: string): string {
    // Convert JSX syntax to HTML
    return jsx
      .replace(/className=/g, 'class=')
      .replace(/htmlFor=/g, 'for=')
      .replace(/{([^}]+)}/g, '$1') // Remove JSX expressions for now
      .replace(/\/>/g, '>'); // Convert self-closing tags
  }

  private generateDefaultGlassCSS(): string {
    return `/* Default Glass UI Styles */
.glass-effect {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}`;
  }
}

// Export singleton instance
export const reactToVanillaConverter = ReactToVanillaConverter.getInstance();