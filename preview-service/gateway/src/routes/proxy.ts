/**
 * Proxy Routes
 * 
 * Proxies requests to preview worker containers.
 * Route: /preview/:sessionId/* → container:4173/*
 */

import { Router, type Router as RouterType } from 'express';
import httpProxy from 'http-proxy';
import { sessionManager, logger } from '../server.js';
import { verifyPreviewAccessToken } from '../lib/previewAccess.js';

export const proxyRouter: RouterType = Router();

// Create proxy server
const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  xfwd: true,
});

const PREVIEW_COOKIE_NAME = 'unison_preview_token';

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  logger.error({ error: err, path: req.url }, 'Proxy error');
  if (res && 'writeHead' in res) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Preview temporarily unavailable');
  }
});

function getPreviewToken(req: any): string | null {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  if (queryToken) {
    return queryToken;
  }

  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const tokenCookie = cookieHeader
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith(`${PREVIEW_COOKIE_NAME}=`));

    if (tokenCookie) {
      return decodeURIComponent(tokenCookie.slice(PREVIEW_COOKIE_NAME.length + 1));
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  return null;
}

function ensureAuthorized(req: any, res: any, sessionId: string): boolean {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = getPreviewToken(req);

  if (!verifyPreviewAccessToken(token || '', sessionId)) {
    res.status(401).json({ error: 'Unauthorized preview access' });
    return false;
  }

  if (queryToken) {
    const secure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    res.setHeader(
      'Set-Cookie',
      `${PREVIEW_COOKIE_NAME}=${encodeURIComponent(queryToken)}; Path=/preview/${sessionId}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
    );
  }

  return true;
}

function rewritePreviewPath(req: any, sessionId: string): void {
  const requestUrl = new URL(req.originalUrl || req.url, 'http://localhost');
  const targetPathname = requestUrl.pathname.replace(`/preview/${sessionId}`, '') || '/';
  requestUrl.pathname = targetPathname;
  requestUrl.searchParams.delete('token');
  req.url = `${requestUrl.pathname}${requestUrl.search}`;
}

/**
 * GET/POST/etc /preview/:sessionId/*
 * Proxy all requests to the session's container
 */
proxyRouter.all('/:sessionId/*', (req, res) => {
  const { sessionId } = req.params;
  const port = sessionManager.getContainerPort(sessionId);

  if (!port) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!ensureAuthorized(req, res, sessionId)) {
    return;
  }

  rewritePreviewPath(req, sessionId);

  // Proxy to container
  proxy.web(req, res, {
    target: `http://localhost:${port}`,
  });
});

/**
 * GET /preview/:sessionId
 * Proxy root request
 */
proxyRouter.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const port = sessionManager.getContainerPort(sessionId);

  if (!port) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!ensureAuthorized(req, res, sessionId)) {
    return;
  }

  rewritePreviewPath(req, sessionId);

  proxy.web(req, res, {
    target: `http://localhost:${port}`,
  });
});
