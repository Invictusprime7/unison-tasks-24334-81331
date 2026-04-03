/**
 * Vercel API Route: Start Preview Session
 * 
 * Uses CodeSandbox SDK for serverless preview generation.
 * Deploy to Vercel: vercel deploy
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StartSessionRequest {
  projectId: string;
  files: Record<string, string>;
}

// CodeSandbox API for creating sandboxes
const CODESANDBOX_API = 'https://codesandbox.io/api/v1/sandboxes/define';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, files } = req.body as StartSessionRequest;

    if (!projectId || !files) {
      return res.status(400).json({
        success: false,
        error: 'Missing projectId or files',
      });
    }

    // Convert files to CodeSandbox format
    const csFiles: Record<string, { content: string }> = {};
    for (const [path, content] of Object.entries(files)) {
      // Remove leading slash for CodeSandbox
      const csPath = path.startsWith('/') ? path.slice(1) : path;
      csFiles[csPath] = { content };
    }

    // Ensure package.json exists
    if (!csFiles['package.json']) {
      csFiles['package.json'] = {
        content: JSON.stringify({
          name: projectId,
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
        }, null, 2),
      };
    }

    // Create sandbox via CodeSandbox API
    const response = await fetch(`${CODESANDBOX_API}?json=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: csFiles }),
    });

    if (!response.ok) {
      throw new Error('Failed to create CodeSandbox');
    }

    const data = await response.json() as { sandbox_id: string };
    const sandboxId = data.sandbox_id;

    return res.status(200).json({
      success: true,
      session: {
        id: sandboxId,
        projectId,
        status: 'running',
        iframeUrl: `https://codesandbox.io/embed/${sandboxId}?fontsize=14&hidenavigation=1&theme=light&view=preview`,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Start session error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start session',
    });
  }
}
