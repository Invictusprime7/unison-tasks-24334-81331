/**
 * Pure exporter that walks a Fabric.js canvas's objects and produces
 * absolutely-positioned HTML + CSS. Extracted from WebBuilder.tsx so the
 * Fabric fallback export path can be tested in isolation.
 */

interface FabricTextObject {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: string;
}

interface FabricImageObject {
  getSrc: () => string;
}

interface FabricObject {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string | unknown;
}

export interface FabricExportResult {
  html: string;
  css: string;
}

export function exportFabricCanvasToHtmlCss(
  objects: FabricObject[],
): FabricExportResult {
  let html = '<div class="web-page">\n';
  let css =
    '.web-page {\n  min-height: 100vh;\n  position: relative;\n  background: white;\n}\n\n';

  objects.forEach((obj, index) => {
    const className = `element-${index}`;

    if (obj.type === 'text' || obj.type === 'textbox') {
      html += `  <div class="${className}">${(obj as unknown as FabricTextObject).text ?? ''}</div>\n`;
    } else if (obj.type === 'rect') {
      html += `  <div class="${className}"></div>\n`;
    } else if (obj.type === 'image') {
      html += `  <img class="${className}" src="${(obj as unknown as FabricImageObject).getSrc()}" alt="" />\n`;
    }

    css += `.${className} {\n`;
    css += `  position: absolute;\n`;
    css += `  left: ${obj.left ?? 0}px;\n`;
    css += `  top: ${obj.top ?? 0}px;\n`;
    css += `  width: ${(obj.width ?? 0) * (obj.scaleX || 1)}px;\n`;
    css += `  height: ${(obj.height ?? 0) * (obj.scaleY || 1)}px;\n`;

    if (obj.fill) {
      css += `  background-color: ${String(obj.fill)};\n`;
    }
    const textObj = obj as unknown as FabricTextObject;
    if (textObj.fontSize) css += `  font-size: ${textObj.fontSize}px;\n`;
    if (textObj.fontFamily) css += `  font-family: ${textObj.fontFamily};\n`;
    if (textObj.textAlign) css += `  text-align: ${textObj.textAlign};\n`;
    css += `}\n\n`;
  });

  html += '</div>';
  return { html, css };
}
