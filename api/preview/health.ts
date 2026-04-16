/**
 * Vercel API Route: Health Check
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyApiSecurityHeaders, handlePreflight, sendError } from '../_lib/security';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, {
    methods: ['GET', 'OPTIONS'],
  });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed', requestId);
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: 'vercel',
    requestId,
  });
}
