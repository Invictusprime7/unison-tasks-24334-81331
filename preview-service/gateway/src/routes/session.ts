/**
 * Session Routes
 * 
 * API endpoints for managing preview sessions:
 * - POST /start - Create new session
 * - PATCH /:sessionId/file - Update file
 * - GET /:sessionId/logs - Get logs
 * - POST /:sessionId/ping - Keep alive
 * - POST /:sessionId/stop - Stop session
 * - GET /:sessionId - Get session status
 * 
 * All endpoints require authentication and enforce org quotas.
 */

import { Router, type Router as RouterType } from 'express';
import { sessionManager, logger } from '../server.js';
import { 
  authMiddleware, 
  apiKeyAuth,
  requirePermission, 
  checkQuota, 
  verifySessionOwnership,
  type AuthenticatedRequest 
} from '../middleware/auth.js';
import type { 
  StartSessionRequest, 
  PatchFileRequest,
  StartSessionResponse,
  PatchFileResponse,
  SessionLogsResponse,
  SessionStatusResponse,
} from '../types.js';
import {
  assertPreviewFileContent,
  normalizePreviewFilePath,
} from '../lib/fileSecurity.js';

export const sessionRouter: RouterType = Router();
const MAX_START_SESSION_FILES = 250;

// Apply auth middleware to all routes
sessionRouter.use(apiKeyAuth);

/**
 * POST /start
 * Create a new preview session
 * 
 * Requires: authentication, preview:create permission, session quota
 */
sessionRouter.post('/start', 
  requirePermission('preview:create'),
  checkQuota('session'),
  checkQuota('session_daily'),
  async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, files } = req.body as StartSessionRequest;

    if (typeof projectId !== 'string' || !projectId.trim() || !files || typeof files !== 'object' || Array.isArray(files)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing projectId or files' 
      });
    }

    const fileEntries = Object.entries(files);
    if (fileEntries.length === 0 || fileEntries.length > MAX_START_SESSION_FILES) {
      return res.status(400).json({
        success: false,
        error: 'Invalid files payload',
      });
    }

    const normalizedFiles: Record<string, string> = {};
    for (const [filePath, content] of fileEntries) {
      const normalizedPath = normalizePreviewFilePath(filePath);
      if (!normalizedPath) {
        return res.status(400).json({
          success: false,
          error: `Invalid file path: ${filePath}`,
        });
      }

      try {
        assertPreviewFileContent(content);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid file content',
        });
      }

      normalizedFiles[normalizedPath] = content;
    }

    const session = await sessionManager.startSession(projectId.trim(), normalizedFiles, {
      userId: req.user!.id,
      organizationId: req.user?.organizationId,
    });

    const response: StartSessionResponse = {
      success: true,
      session: {
        id: session.id,
        projectId: session.projectId,
        status: session.status,
        iframeUrl: session.iframeUrl,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error({ error }, 'Failed to start session');
    const response: StartSessionResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start session',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /:sessionId/file
 * Update a file in the session (triggers HMR)
 * 
 * Requires: session ownership verification
 */
sessionRouter.patch('/:sessionId/file', 
  verifySessionOwnership,
  async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { path, content } = req.body as PatchFileRequest;
    const normalizedPath = normalizePreviewFilePath(path);

    if (!normalizedPath || content === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing path or content' 
      });
    }

    try {
      assertPreviewFileContent(content);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid file content',
      });
    }

    await sessionManager.patchFile(sessionId, normalizedPath, content);

    const response: PatchFileResponse = { success: true };
    res.json(response);
  } catch (error) {
    logger.error({ error, sessionId: req.params.sessionId }, 'Failed to patch file');
    const response: PatchFileResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to patch file',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /:sessionId/logs
 * Get session logs
 * 
 * Requires: session ownership verification
 */
sessionRouter.get('/:sessionId/logs', 
  verifySessionOwnership,
  async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = req.params.sessionId as string;
    const sinceQuery = req.query.since;
    const since = typeof sinceQuery === 'string' ? sinceQuery : undefined;

    const logs = await sessionManager.getSessionLogs(sessionId, since);

    const response: SessionLogsResponse = {
      logs,
      hasMore: false,
    };
    res.json(response);
  } catch (error) {
    logger.error({ error, sessionId: req.params.sessionId }, 'Failed to get logs');
    res.status(500).json({ logs: [], hasMore: false });
  }
});

/**
 * POST /:sessionId/ping
 * Keep session alive
 * 
 * Requires: session ownership verification
 */
sessionRouter.post('/:sessionId/ping', 
  verifySessionOwnership,
  (req: AuthenticatedRequest, res) => {
  const sessionId = req.params.sessionId as string;
  const success = sessionManager.pingSession(sessionId);
  
  if (!success) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ success: true });
});

/**
 * POST /:sessionId/stop
 * Stop a session
 * 
 * Requires: session ownership verification
 */
sessionRouter.post('/:sessionId/stop', 
  verifySessionOwnership,
  async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = req.params.sessionId as string;
    await sessionManager.stopSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error, sessionId: req.params.sessionId }, 'Failed to stop session');
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to stop session' 
    });
  }
});

/**
 * GET /:sessionId
 * Get session status
 * 
 * Requires: session ownership verification
 */
sessionRouter.get('/:sessionId', 
  verifySessionOwnership,
  (req: AuthenticatedRequest, res) => {
  const sessionId = req.params.sessionId as string;
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const response: SessionStatusResponse = {
    id: session.id,
    projectId: session.projectId,
    status: session.status,
    iframeUrl: session.iframeUrl,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    error: session.error,
  };

  res.json(response);
});
