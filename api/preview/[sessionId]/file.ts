/**
 * Vercel API Route: Patch File in Preview Session
 * 
 * Accepts file content updates for HMR-like behavior.
 * If a Docker gateway is configured, proxies the patch there.
 * Otherwise, acknowledges the patch (client-side Sandpack handles the update).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  getForwardedAuthHeaders,
  getPreviewGatewayUrl,
  handlePreflight,
  isValidSessionId,
  parseJsonSafely,
  sendError,
} from '../../_lib/security';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestId = applyApiSecurityHeaders(req, res, {
    methods: ['PATCH', 'OPTIONS'],
    allowCredentials: true,
  });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'PATCH') {
    return sendError(res, 405, 'Method not allowed', requestId);
  }

  const { sessionId } = req.query;
  if (!isValidSessionId(sessionId)) {
    return sendError(res, 400, 'Invalid session id', requestId);
  }

  const body = req.body as { path?: string; content?: string } | undefined;

  if (!body?.path || typeof body.content !== 'string') {
    return sendError(res, 400, 'Missing path or content', requestId);
  }

  // Proxy to Docker gateway if available
  const gatewayUrl = getPreviewGatewayUrl();
  if (gatewayUrl) {
    try {
      const upstream = await fetch(
        `${gatewayUrl}/api/preview/${sessionId}/file`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getForwardedAuthHeaders(req, requestId),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        }
      );
      const data = await parseJsonSafely(upstream);
      if (data && typeof data === 'object') {
        return res.status(upstream.status).json(data);
      }

      if (!upstream.ok) {
        return sendError(res, upstream.status, 'Preview gateway unavailable', requestId);
      }

      return res.status(upstream.status).json(data);
    } catch {
      return sendError(res, 502, 'Preview gateway unavailable', requestId);
    }
  }

  // Vercel-native: acknowledge patch (Sandpack handles update client-side)
  return res.status(200).json({ success: true, requestId });
}
