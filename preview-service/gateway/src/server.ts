/**
 * Preview Gateway Server
 * 
 * Manages preview sessions and proxies requests to Vite worker containers.
 * 
 * Architecture:
 * - Gateway receives requests from the frontend
 * - Spawns Docker containers with Vite for each session
 * - Proxies iframe requests to the container
 * - Handles file patches via WebSocket to Vite HMR
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import pino from 'pino';

import { sessionRouter } from './routes/session.js';
import { proxyRouter } from './routes/proxy.js';
import { healthRouter } from './routes/health.js';
import { SessionManager } from './services/SessionManager.js';
import { setupWebSocket } from './services/websocket.js';

// ============================================
// CONFIGURATION
// ============================================

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ============================================
// LOGGER
// ============================================

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});

// ============================================
// EXPRESS APP
// ============================================

import type { Express } from 'express';
const app: Express = express();
const server = createServer(app);

// Initialize session manager (singleton)
export const sessionManager = new SessionManager();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow iframe embedding
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Request ID generation — must be early in the chain for correlation
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = req.headers['x-request-id'] as string ||
    `req_${crypto.randomUUID()}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// CORS — use explicit origin list in production
app.use(cors({
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
  maxAge: 86400,
}));

// Compression
app.use(compression());

// Rate limiting — tiered by route sensitivity
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req: express.Request) => {
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
});
app.use('/api/', globalLimiter);

// Stricter rate limit for session creation (expensive operation)
const sessionCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 session starts per 5 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many session creation requests. Please wait.' },
  keyGenerator: (req: express.Request) => {
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
});
app.use('/api/preview/start', sessionCreateLimiter);

// Body parsing with strict limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging with correlation ID
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'];

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId,
      ip: req.headers['x-forwarded-for'] || req.ip,
    }, 'Request completed');
  });

  next();
});

// ============================================
// ROUTES
// ============================================

// Health checks
app.use('/health', healthRouter);

// Preview session management
app.use('/api/preview', sessionRouter);

// Proxy requests to worker containers
app.use('/preview', proxyRouter);

// Root route - API info
app.get('/', (_req: express.Request, res: express.Response) => {
  res.json({
    name: 'Unison Preview Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      createSession: 'POST /api/preview/start',
      patchFile: 'PATCH /api/preview/:sessionId/file',
      getLogs: 'GET /api/preview/:sessionId/logs',
      stopSession: 'POST /api/preview/:sessionId/stop',
      preview: '/preview/:sessionId/',
      websocket: '/ws',
    },
  });
});

// ============================================
// WEBSOCKET
// ============================================

const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss, sessionManager);

// ============================================
// ERROR HANDLING
// ============================================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function shutdown() {
  logger.info('Shutting down...');
  
  // Stop all sessions
  await sessionManager.stopAllSessions();
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================
// START SERVER
// ============================================

server.listen(PORT, HOST, () => {
  logger.info({ port: PORT, host: HOST, env: NODE_ENV }, 'Preview Gateway started');
});

export { app, server };
