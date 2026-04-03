/**
 * Proxy Routes
 * 
 * Proxies requests to preview worker containers.
 * Route: /preview/:sessionId/* → container:4173/*
 */

import { Router, type Router as RouterType } from 'express';
import httpProxy from 'http-proxy';
import { sessionManager, logger } from '../server.js';

export const proxyRouter: RouterType = Router();

// Create proxy server
const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  xfwd: true,
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  logger.error({ error: err, path: req.url }, 'Proxy error');
  if (res && 'writeHead' in res) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Preview temporarily unavailable');
  }
});

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

  // Rewrite path to remove sessionId prefix
  const targetPath = req.url.replace(`/${sessionId}`, '') || '/';
  req.url = targetPath;

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

  proxy.web(req, res, {
    target: `http://localhost:${port}`,
  });
});
