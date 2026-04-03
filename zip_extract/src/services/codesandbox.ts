/**
 * CodeSandbox Service
 * 
 * Creates and manages CodeSandbox projects for live preview.
 * Uses the CodeSandbox Define API to create sandboxes from VFS files.
 */

import type { FileMap } from './previewSession';

// CodeSandbox API endpoints
const CODESANDBOX_DEFINE_API = 'https://codesandbox.io/api/v1/sandboxes/define';

export interface CodeSandboxSession {
  sandboxId: string;
  editorUrl: string;
  previewUrl: string;
  embedUrl: string;
}

/**
 * Create a CodeSandbox from files
 * Returns URLs for editor, preview, and embed
 */
export async function createCodeSandbox(
  files: FileMap,
  options: {
    title?: string;
    description?: string;
    template?: 'react' | 'react-ts' | 'vanilla' | 'vanilla-ts' | 'vue' | 'angular';
  } = {}
): Promise<CodeSandboxSession> {
  const { title = 'Unison Preview', template = 'react-ts' } = options;

  // Convert FileMap to CodeSandbox format
  const csFiles: Record<string, { content: string; isBinary?: boolean }> = {};
  
  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash
    const csPath = path.startsWith('/') ? path.slice(1) : path;
    csFiles[csPath] = { content };
  }

  // Ensure required files exist
  if (!csFiles['package.json']) {
    csFiles['package.json'] = {
      content: JSON.stringify({
        name: title.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        main: 'src/main.tsx',
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'lucide-react': 'latest',
          'clsx': 'latest',
          'tailwind-merge': 'latest',
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          'typescript': '^5.0.0',
        },
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build',
        },
      }, null, 2),
    };
  }

  if (!csFiles['index.html'] && !csFiles['public/index.html']) {
    csFiles['public/index.html'] = {
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
    };
  }

  // Rename main.tsx to index.tsx for CodeSandbox compatibility
  if (csFiles['src/main.tsx'] && !csFiles['src/index.tsx']) {
    csFiles['src/index.tsx'] = csFiles['src/main.tsx'];
    delete csFiles['src/main.tsx'];
  }

  // Create sandbox via API
  const response = await fetch(`${CODESANDBOX_DEFINE_API}?json=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      files: csFiles,
      template,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create CodeSandbox: ${error}`);
  }

  const data = await response.json();
  const sandboxId = data.sandbox_id;

  return {
    sandboxId,
    editorUrl: `https://codesandbox.io/s/${sandboxId}`,
    previewUrl: `https://${sandboxId}.csb.app`,
    embedUrl: `https://codesandbox.io/embed/${sandboxId}?fontsize=14&hidenavigation=1&theme=light&view=preview`,
  };
}

/**
 * Generate CodeSandbox URL using the define API (no server needed)
 * This creates a sandbox link directly without API calls
 */
export function generateCodeSandboxUrl(
  files: FileMap,
  options: {
    view?: 'preview' | 'editor' | 'split';
    hideNavigation?: boolean;
    theme?: 'light' | 'dark';
    fontSize?: number;
    module?: string;
  } = {}
): string {
  const {
    view = 'preview',
    hideNavigation = true,
    theme = 'light',
    fontSize = 14,
    module,
  } = options;

  // Convert files to CodeSandbox format
  const csFiles: Record<string, { content: string }> = {};
  
  for (const [path, content] of Object.entries(files)) {
    const csPath = path.startsWith('/') ? path.slice(1) : path;
    csFiles[csPath] = { content };
  }

  // Ensure package.json
  if (!csFiles['package.json']) {
    csFiles['package.json'] = {
      content: JSON.stringify({
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
        },
      }, null, 2),
    };
  }

  // Compress and encode the parameters
  const parameters = getCodeSandboxParameters({ files: csFiles });
  
  // Build URL
  const params = new URLSearchParams({
    fontsize: fontSize.toString(),
    hidenavigation: hideNavigation ? '1' : '0',
    theme,
    view,
  });

  if (module) {
    params.set('module', module);
  }

  return `https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}&query=${params.toString()}`;
}

/**
 * Compress files for CodeSandbox URL parameter
 */
function getCodeSandboxParameters(payload: { files: Record<string, { content: string }> }): string {
  // Use LZString compression (simplified version)
  const json = JSON.stringify(payload);
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Open files in CodeSandbox (new tab)
 */
export function openInCodeSandbox(files: FileMap): void {
  const url = generateCodeSandboxUrl(files, { view: 'split' });
  window.open(url, '_blank');
}
