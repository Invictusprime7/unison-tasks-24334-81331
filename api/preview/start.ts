import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  getForwardedAuthHeaders,
  getPreviewGatewayUrl,
  handlePreflight,
  parseJsonSafely,
  sendError,
} from '../_lib/security';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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

  const gatewayUrl = getPreviewGatewayUrl();
  if (!gatewayUrl) {
    return sendError(
      res,
      410,
      'Server-side preview is not available in this environment',
      requestId,
    );
  }

  try {
    const upstream = await fetch(`${gatewayUrl}/api/preview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getForwardedAuthHeaders(req, requestId),
      },
      body: JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(10_000),
    });

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
