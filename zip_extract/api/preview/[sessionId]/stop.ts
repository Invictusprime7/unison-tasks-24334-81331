/**
 * Vercel API Route: Stop Session (No-op for CodeSandbox)
 * 
 * CodeSandbox handles cleanup automatically.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // CodeSandbox handles cleanup - just acknowledge
  res.status(200).json({ success: true });
}
