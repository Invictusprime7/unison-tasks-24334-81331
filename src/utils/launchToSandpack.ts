/**
 * Launch-to-Sandpack Converter
 * 
 * Converts LaunchState + VFS files into Sandpack-compatible format.
 * Bridges the gap between SystemLauncher output and SandpackRuntimeWrapper.
 * 
 * Strategy:
 * - If we have LaunchState with metadata, use it to enhance Sandpack setup
 * - Extract routes from bundle metadata
 * - Prepare semantic CSS variables based on aesthetic
 * - Inject intent metadata into preview files
 */

import type { LaunchState } from '@/types/launchState';
import type { SandpackFiles } from '@/runtime/preview/SandpackRuntimeWrapper';

// ============================================================================
// Main Converter
// ============================================================================

export interface LaunchToSandpackConfig {
  launchState: LaunchState;
  vfsFiles: Record<string, string>;
  debug?: boolean;
}

/**
 * Convert LaunchState + VFS files into Sandpack-ready format
 * 
 * This function:
 * 1. Takes the AI-generated VFS files
 * 2. Enhances them with LaunchState metadata
 * 3. Ensures semantic theme variables are available
 * 4. Sets up intent routing if enabled
 * 5. Returns Sandpack-compatible file structure
 */
export function launchStateToSandpackFiles(
  config: LaunchToSandpackConfig
): SandpackFiles {
  const { launchState, vfsFiles, debug = false } = config;

  const files: SandpackFiles = {};

  // ========================================================================
  // 1. Copy all VFS files (preserve structure)
  // ========================================================================
  for (const [path, content] of Object.entries(vfsFiles)) {
    files[path] = content;
  }

  // ========================================================================
  // 2. Ensure theme CSS variables are available
  // ========================================================================
  const cssKey = 
    vfsFiles['/src/index.css'] 
    || vfsFiles['src/index.css'] 
    || vfsFiles['/index.css']
    || '/src/index.css';  // fallback

  const themeCss = generateThemeCss(launchState);
  const existingCss = vfsFiles[cssKey] || '';
  
  // Only prepend if existing CSS doesn't already have theme vars
  if (!existingCss.includes('--primary:') && !existingCss.includes('--primary ')) {
    files[cssKey] = themeCss + '\n\n' + existingCss;
  }

  // ========================================================================
  // 3. Inject launch metadata as script comment for dev tools
  // ========================================================================
  if (debug) {
    files['/launch-metadata.json'] = {
      code: JSON.stringify(
        {
          systemType: launchState.systemType,
          businessName: launchState.businessName,
          aesthetic: launchState.aesthetic,
          preloadedIntents: launchState.preloadedIntents,
          createdAt: launchState.createdAt,
        },
        null,
        2
      ),
      hidden: true,
      readOnly: true,
    };
  }

  // ========================================================================
  // 4. If intent runtime is enabled, ensure entry file can access intents
  // ========================================================================
  if (launchState.intentRuntime && launchState.preloadedIntents.length > 0) {
    // Find main entry file and enhance it
    const entryKey = 
      vfsFiles['/src/main.tsx']
      || vfsFiles['/src/App.tsx']
      || vfsFiles['/src/index.tsx'];

    if (entryKey && typeof files[entryKey] === 'string') {
      // Ensure it has proper imports for intent runtime
      const content = files[entryKey];
      if (!content.includes('intents') && !content.includes('preloadedIntents')) {
        // Add comment about available intents
        const intentComment = `// Available intents: ${launchState.preloadedIntents.join(', ') || 'none'}\n`;
        if (typeof files[entryKey] === 'string') {
          files[entryKey] = intentComment + content;
        }
      }
    }
  }

  return files;
}

// ============================================================================
// Theme CSS Generator
// ============================================================================

/**
 * Generate semantic CSS variables from LaunchState aesthetic
 */
function generateThemeCss(launchState: LaunchState): string {
  // Map aesthetic to color palette
  const aestheticPalettes: Record<string, { bg: string; fg: string; accent: string }> = {
    'modern': {
      bg: '210 40% 98%',
      fg: '222.2 84% 4.9%',
      accent: '221.2 83.2% 53.3%',
    },
    'editorial': {
      bg: '0 0% 98%',
      fg: '0 0% 8%',
      accent: '0 84.2% 60.2%',
    },
    'bold': {
      bg: '222.2 84% 4.9%',
      fg: '210 40% 98%',
      accent: '210 40% 96.1%',
    },
    'futuristic': {
      bg: '222.2 84% 4.9%',
      fg: '210 40% 98%',
      accent: '210 100% 50%',
    },
    'organic': {
      bg: '45 93% 94%',
      fg: '15 20% 15%',
      accent: '45 80% 60%',
    },
  };

  const palette = 
    aestheticPalettes[launchState.aesthetic || 'modern'] 
    || aestheticPalettes['modern'];

  return `
:root {
  /* Semantic colors from Launch aesthetic: ${launchState.aesthetic || 'modern'} */
  --background: ${palette.bg};
  --foreground: ${palette.fg};
  --primary: ${palette.accent};
  --primary-foreground: ${palette.bg};
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: ${palette.accent};
  --accent-foreground: ${palette.bg};
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: ${palette.bg};
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: ${palette.accent};
  --radius: 0.75rem;
}

/* Launch System: ${launchState.businessName} (${launchState.systemType}) */
`;
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Log launch-to-Sandpack conversion for debugging
 */
export function debugLaunchToSandpack(
  launchState: LaunchState,
  filesOutput: SandpackFiles
) {
  if (typeof console !== 'undefined') {
    console.log('[LaunchToSandpack] Conversion:', {
      business: launchState.businessName,
      system: launchState.systemType,
      aesthetic: launchState.aesthetic,
      intents: launchState.preloadedIntents,
      fileCount: Object.keys(filesOutput).length,
      keys: Object.keys(filesOutput),
    });
  }
}
