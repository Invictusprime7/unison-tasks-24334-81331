/**
 * Vercel API Route: Ping Session (No-op for CodeSandbox)
 * 
 * CodeSandbox handles session persistence automatically.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // CodeSandbox handles persistence - just acknowledge the ping
  res.status(200).json({ success: true });
}
