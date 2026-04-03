/**
 * Component Renderer
 * Converts AI-generated code to Web Builder compatible components
 */

import { Canvas as FabricCanvas, Rect, IText, FabricImage } from 'fabric';

export interface ComponentConfig {
  type: 'hero' | 'card' | 'button' | 'section' | 'form' | 'navigation' | 'custom';
  html: string;
  css: string;
  jsx?: string;
  fabricElements?: any[];
}

/**
 * Parse AI-generated code and extract component structure
 */
export function parseComponentCode(code: string): ComponentConfig {
  // Check if it's HTML
  if (code.includes('<') && code.includes('>')) {
    return parseHTMLComponent(code);
  }
  
  // Check if it's React/JSX
  if (code.includes('return') || code.includes('export') || code.includes('function')) {
    return parseReactComponent(code);
  }
  
  // Default to custom component
  return {
    type: 'custom',
    html: wrapInDiv(code),
    css: '',
  };
}

/**
 * Parse HTML component code
 */
function parseHTMLComponent(code: string): ComponentConfig {
  // Extract style tags
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1].trim() : '';
  
  // Extract body content or use full code
  const bodyMatch = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let html = bodyMatch ? bodyMatch[1].trim() : code;
  
  // Remove style tags from HTML
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Detect component type
  const type = detectComponentType(html);
  
  return { type, html, css };
}

/**
 * Parse React/JSX component code
 */
function parseReactComponent(code: string): ComponentConfig {
  // Extract JSX from return statement
  const returnMatch = code.match(/return\s*\(([\s\S]*?)\);/);
  const jsx = returnMatch ? returnMatch[1].trim() : code;
  
  // Convert JSX to HTML
  const html = convertJSXToHTML(jsx);
  
  // Extract CSS if present
  const cssMatch = code.match(/const styles = `([\s\S]*?)`;/);
  const css = cssMatch ? cssMatch[1].trim() : '';
  
  const type = detectComponentType(html);
  
  return { type, html, css, jsx };
}

/**
 * Convert JSX to HTML
 */
function convertJSXToHTML(jsx: string): string {
  return jsx
    .replace(/className=/g, 'class=')
    .replace(/onClick=/g, 'onclick=')
    .replace(/onChange=/g, 'onchange=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/\{([^}]+)\}/g, (match, expr) => {
      // Handle simple string expressions
      if (expr.startsWith('"') || expr.startsWith("'")) {
        return expr.slice(1, -1);
      }
      return match;
    });
}

/**
 * Detect component type from HTML
 */
function detectComponentType(html: string): ComponentConfig['type'] {
  const lower = html.toLowerCase();
  
  if (lower.includes('hero') || (lower.includes('<h1') && lower.includes('<button'))) {
    return 'hero';
  }
  if (lower.includes('card') || lower.includes('pricing')) {
    return 'card';
  }
  if (lower.includes('<button') && !lower.includes('<h1')) {
    return 'button';
  }
  if (lower.includes('<form') || lower.includes('<input')) {
    return 'form';
  }
  if (lower.includes('<nav') || lower.includes('navigation')) {
    return 'navigation';
  }
  if (lower.includes('<section')) {
    return 'section';
  }
  
  return 'custom';
}

/**
 * Wrap content in a div if needed
 */
function wrapInDiv(content: string): string {
  if (content.trim().startsWith('<')) {
    return content;
  }
  return `<div>${content}</div>`;
}

/**
 * Render component to Fabric.js canvas
 */
export async function renderComponentToCanvas(
  config: ComponentConfig,
  canvas: FabricCanvas,
  position: { x: number; y: number } = { x: 100, y: 100 }
): Promise<void> {
  // Create a temporary container to parse HTML
  const container = document.createElement('div');
  container.innerHTML = config.html;
  
  // Apply CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = config.css;
  container.appendChild(styleEl);
  
  // Render as Fabric objects
  await renderDOMToFabric(container, canvas, position);
}

/**
 * Convert DOM elements to Fabric.js objects
 */
async function renderDOMToFabric(
  element: HTMLElement,
  canvas: FabricCanvas,
  position: { x: number; y: number }
): Promise<void> {
  const bounds = element.getBoundingClientRect();
  let currentY = position.y;
  
  // Background
  const bgColor = getComputedStyle(element).backgroundColor;
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
    const bg = new Rect({
      left: position.x,
      top: position.y,
      width: 600,
      height: 400,
      fill: bgColor,
      selectable: true,
    });
    canvas.add(bg);
  }
  
  // Process child elements
  for (const child of Array.from(element.children)) {
    if (child instanceof HTMLElement) {
      await processElement(child, canvas, position.x, currentY);
      currentY += 60; // Spacing between elements
    }
  }
  
  canvas.renderAll();
}

/**
 * Process individual HTML element
 */
async function processElement(
  el: HTMLElement,
  canvas: FabricCanvas,
  x: number,
  y: number
): Promise<void> {
  const tagName = el.tagName.toLowerCase();
  const styles = getComputedStyle(el);
  
  switch (tagName) {
    case 'h1':
    case 'h2':
    case 'h3':
      const heading = new IText(el.textContent || '', {
        left: x,
        top: y,
        fontSize: tagName === 'h1' ? 48 : tagName === 'h2' ? 36 : 24,
        fill: styles.color || '#000000',
        fontWeight: 'bold',
        fontFamily: styles.fontFamily || 'Arial',
      });
      canvas.add(heading);
      break;
      
    case 'p':
      const text = new IText(el.textContent || '', {
        left: x,
        top: y,
        fontSize: 16,
        fill: styles.color || '#000000',
        fontFamily: styles.fontFamily || 'Arial',
      });
      canvas.add(text);
      break;
      
    case 'button':
      const btnWidth = 150;
      const btnHeight = 40;
      const btn = new Rect({
        left: x,
        top: y,
        width: btnWidth,
        height: btnHeight,
        fill: styles.backgroundColor || '#3b82f6',
        rx: 8,
        ry: 8,
      });
      canvas.add(btn);
      
      const btnText = new IText(el.textContent || 'Button', {
        left: x + btnWidth / 2 - 30,
        top: y + btnHeight / 2 - 10,
        fontSize: 16,
        fill: styles.color || '#ffffff',
        fontWeight: '600',
      });
      canvas.add(btnText);
      break;
      
    case 'img':
      const img = el as HTMLImageElement;
      if (img.src) {
        try {
          const fabricImg = await FabricImage.fromURL(img.src);
          fabricImg.set({
            left: x,
            top: y,
            scaleX: 0.5,
            scaleY: 0.5,
          });
          canvas.add(fabricImg);
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      }
      break;
      
    case 'div':
    case 'section':
      const bgColor = styles.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
        const div = new Rect({
          left: x,
          top: y,
          width: 500,
          height: 200,
          fill: bgColor,
          rx: parseInt(styles.borderRadius) || 0,
          ry: parseInt(styles.borderRadius) || 0,
        });
        canvas.add(div);
      }
      
      // Process children recursively
      let childY = y + 20;
      for (const child of Array.from(el.children)) {
        if (child instanceof HTMLElement) {
          await processElement(child, canvas, x + 20, childY);
          childY += 40;
        }
      }
      break;
  }
}

/**
 * Generate complete HTML file from component
 */
export function generateHTMLFile(config: ComponentConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Component</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
    }
    ${config.css}
  </style>
</head>
<body>
  ${config.html}
</body>
</html>`;
}

/**
 * Generate React component file
 */
export function generateReactComponent(config: ComponentConfig, name: string = 'Component'): string {
  const componentName = name.charAt(0).toUpperCase() + name.slice(1).replace(/\s/g, '');
  
  return `import React from 'react';
import './styles.css';

const ${componentName} = () => {
  return (
    ${config.jsx || convertHTMLToJSX(config.html)}
  );
};

export default ${componentName};

// CSS (save as styles.css)
/*
${config.css}
*/`;
}

/**
 * Convert HTML to JSX
 */
function convertHTMLToJSX(html: string): string {
  return html
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/onclick=/g, 'onClick=')
    .replace(/onchange=/g, 'onChange=');
}
