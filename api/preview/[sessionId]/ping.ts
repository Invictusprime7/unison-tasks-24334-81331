/**
 * Vercel API Route: Ping Preview Session
 * 
 * Keeps the preview session alive. Proxies to Docker gateway if available.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  getForwardedAuthHeaders,
  getPreviewGatewayUrl,
  handlePreflight,
  isValidSessionId,
  sendError,
} from '../../_lib/security';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, {
    methods: ['POST', 'OPTIONS'],
    allowCredentials: true,
  });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed', requestId);
  }

  const { sessionId } = req.query;
  if (!isValidSessionId(sessionId)) {
    return sendError(res, 400, 'Invalid session id', requestId);
  }

  const gatewayUrl = getPreviewGatewayUrl();

  if (gatewayUrl) {
    try {
      const upstream = await fetch(`${gatewayUrl}/api/preview/${sessionId}/ping`, {
        method: 'POST',
        headers: getForwardedAuthHeaders(req, requestId),
        signal: AbortSignal.timeout(3000),
      });

      if (!upstream.ok) {
        return sendError(res, upstream.status, 'Failed to ping preview session', requestId);
      }
    } catch {
      return sendError(res, 502, 'Preview gateway unavailable', requestId);
    }
  }

  res.status(200).json({ success: true, requestId });
}
