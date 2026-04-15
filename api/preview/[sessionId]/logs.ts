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
    methods: ['GET', 'OPTIONS'],
    allowCredentials: true,
  });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed', requestId);
  }

  const { sessionId } = req.query;
  if (!isValidSessionId(sessionId)) {
    return sendError(res, 400, 'Invalid session id', requestId);
  }

  const gatewayUrl = getPreviewGatewayUrl();

  if (!gatewayUrl) {
    return res.status(200).json({ logs: [], hasMore: false, requestId });
  }

  try {
    const search = new URLSearchParams();
    if (typeof req.query.since === 'string') {
      search.set('since', req.query.since);
    }

    const upstreamUrl = `${gatewayUrl}/api/preview/${sessionId}/logs${
      search.size > 0 ? `?${search.toString()}` : ''
    }`;

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        ...getForwardedAuthHeaders(req, requestId),
      },
      signal: AbortSignal.timeout(5_000),
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
