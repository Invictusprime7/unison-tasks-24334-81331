/**
 * Pure HTML/JSX assembly helpers extracted from WebBuilder.tsx.
 * Kept side-effect free so they can be unit tested in isolation.
 */

/**
 * Inject a raw CSS string into an HTML document (or fragment).
 * - Full document with </head>: inserts <style> before </head>.
 * - Has <html> but no <head>: creates a <head> block.
 * - Bare fragment: wraps in a full HTML5 document with Tailwind CDN.
 */
export function integrateCSSIntoHTML(html: string, css: string): string {
  if (!css || !css.trim()) return html;

  const styleTag = `<style>\n${css}\n</style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  }
  if (html.includes('<html') || html.includes('<!DOCTYPE')) {
    if (html.includes('<body')) {
      return html.replace('<body', `<head>${styleTag}</head>\n<body`);
    }
    return html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${styleTag}</head>`);
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  ${styleTag}
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Convert a generated template's `sections[]` structure into a complete
 * React `App()` component source string used to seed the preview VFS.
 */
export function buildSectionsReactApp(generatedTemplate: {
  sections?: Array<{
    name?: string;
    components?: Array<{ props?: { title?: string; description?: string } }>;
  }>;
  name?: string;
}): string {
  const sectionsJsx = (generatedTemplate.sections || [])
    .map((section) => {
      const colCount = (section.components?.length ?? 0) > 2 ? 3 : 2;
      const comps = (section.components || [])
        .map(
          (comp) =>
            `<div className="p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold mb-4">${comp.props?.title || 'Component'}</h3>
            <p className="text-gray-600">${comp.props?.description || 'Component content'}</p>
          </div>`,
        )
        .join('\n          ');
      return `      <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">${section.name}</h2>
            <div className="grid gap-6 md:grid-cols-${colCount}">${comps}</div>
          </div>
        </section>`;
    })
    .join('\n');

  return `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
${sectionsJsx}
    </div>
  );
}
`;
}
