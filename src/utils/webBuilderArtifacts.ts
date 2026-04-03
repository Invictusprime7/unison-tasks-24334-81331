import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { bundleCode } from '@/utils/codeBundler';

export interface CanonicalBuildArtifacts {
  exportHtml: string;
  exportCss: string;
  exportJs: string;
  deployFiles: Record<string, string>;
}

export function buildCanonicalArtifacts(
  sourceFiles: Record<string, string>,
  options?: {
    entryPoint?: string;
    title?: string;
  },
): CanonicalBuildArtifacts | null {
  if (!sourceFiles || Object.keys(sourceFiles).length === 0) {
    return null;
  }

  const compiled = prepareSandpackFiles(sourceFiles, {
    entryPoint: options?.entryPoint,
  });

  const entryCode = compiled['/App.tsx']
    || compiled['/App.jsx']
    || compiled['/index.tsx']
    || compiled['/index.jsx']
    || '';

  const bundle = entryCode ? bundleCode(entryCode) : { html: '', css: '', javascript: '' };
  const cssParts = [compiled['/index.css'], compiled['/template.css'], bundle.css]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  const mergedCss = cssParts.join('\n\n');

  const compiledIndexHtml = compiled['/index.html'] || '';
  const bodyFromCompiledIndex = compiledIndexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() || '';
  const htmlBody = (bundle.html || bodyFromCompiledIndex || '<div id="root"></div>').trim();
  const jsContent = (bundle.javascript || '').trim();
  const title = options?.title || 'Unison Site';

  const deployHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${mergedCss}
  </style>
</head>
<body>
${htmlBody}
${jsContent ? '  <script src="script.js"></script>' : ''}
</body>
</html>`;

  const deployFiles: Record<string, string> = {
    'index.html': deployHtml,
    'styles.css': mergedCss,
    ...(jsContent ? { 'script.js': jsContent } : {}),
  };

  return {
    exportHtml: htmlBody,
    exportCss: mergedCss,
    exportJs: jsContent,
    deployFiles,
  };
}
