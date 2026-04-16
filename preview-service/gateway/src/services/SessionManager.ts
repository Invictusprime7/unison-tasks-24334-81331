/**
 * Session Manager
 * 
 * Manages the lifecycle of preview sessions and their Docker containers.
 */

import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import type { PreviewSession, FileMap, SessionStatus } from '../types.js';
import { logger } from '../server.js';
import { createPreviewAccessToken } from '../lib/previewAccess.js';
import {
  assertPreviewFileContent,
  normalizePreviewFilePath,
  resolveSessionPath,
} from '../lib/fileSecurity.js';

// ============================================
// CONFIGURATION
// ============================================

const CONTAINER_IMAGE = process.env.PREVIEW_IMAGE || 'unison-preview-worker:latest';
const CONTAINER_NETWORK = process.env.CONTAINER_NETWORK || 'preview-network';
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT || '300000', 10); // 5 minutes
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '50', 10);
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001';

// Port range for containers
const PORT_RANGE_START = 4200;
const PORT_RANGE_END = 4300;

function getSessionBasePath(): string {
  return process.env.SESSION_VOLUME_PATH || path.join(os.tmpdir(), 'preview-sessions');
}

function getSessionWorkDir(sessionId: string): string {
  return path.join(getSessionBasePath(), sessionId);
}

// ============================================
// SESSION MANAGER
// ============================================

export class SessionManager {
  private docker: Docker;
  private sessions: Map<string, PreviewSession> = new Map();
  private usedPorts: Set<number> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.docker = new Docker();
    this.startCleanupLoop();
  }

  /**
   * Start a new preview session
   */
  async startSession(
    projectId: string,
    files: FileMap,
    owner?: { userId: string; organizationId?: string }
  ): Promise<PreviewSession> {
    // Check session limit
    if (this.sessions.size >= MAX_SESSIONS) {
      throw new Error('Maximum session limit reached');
    }

    const sessionId = uuidv4();
    const port = this.allocatePort();
    const previewToken = createPreviewAccessToken(sessionId);
    
    // Create session record
    const session: PreviewSession = {
      id: sessionId,
      projectId,
      ownerUserId: owner?.userId,
      organizationId: owner?.organizationId,
      status: 'pending',
      containerPort: port,
      iframeUrl: `${GATEWAY_URL}/preview/${sessionId}?token=${encodeURIComponent(previewToken)}`,
      files,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      logs: [],
    };

    this.sessions.set(sessionId, session);
    logger.info({ sessionId, projectId }, 'Creating session');

    try {
      // Write files to temp directory
      const workDir = await this.writeFilesToDisk(sessionId, files);
      
      // Start container
      session.status = 'starting';
      const container = await this.startContainer(sessionId, workDir, port);
      session.containerId = container.id;
      
      // Wait for container to be ready
      await this.waitForReady(sessionId, port);
      
      session.status = 'running';
      logger.info({ sessionId, containerId: container.id, port }, 'Session started');
      
      return session;
    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Failed to start session';
      logger.error({ sessionId, error }, 'Failed to start session');
      
      // Cleanup on failure
      await this.cleanupSession(sessionId);
      throw error;
    }
  }

  /**
   * Patch a file in a running session
   */
  async patchFile(sessionId: string, filePath: string, content: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'running') {
      throw new Error('Session not running');
    }

    const normalizedPath = normalizePreviewFilePath(filePath);
    if (!normalizedPath) {
      throw new Error('Invalid file path');
    }

    assertPreviewFileContent(content);

    // Update session files
    session.files[normalizedPath] = content;
    session.lastActivityAt = new Date();

    // Write file to container volume
    const workDir = getSessionWorkDir(sessionId);
    const fullPath = resolveSessionPath(workDir, normalizedPath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    
    logger.debug({ sessionId, filePath: normalizedPath }, 'File patched');

    // If package.json was updated, re-run dependency installation inside the container
    if (normalizedPath === 'package.json') {
      await this.reinstallDependencies(sessionId);
    }
  }

  /**
   * Re-run pnpm install inside a running container after package.json changes
   */
  private async reinstallDependencies(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.containerId) {
      logger.warn({ sessionId }, 'Cannot reinstall deps: no container');
      return;
    }

    try {
      logger.info({ sessionId }, 'package.json changed — reinstalling dependencies');
      const container = this.docker.getContainer(session.containerId);

      const exec = await container.exec({
        Cmd: ['pnpm', 'install', '--prefer-offline', '--no-frozen-lockfile', '--ignore-scripts'],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: '/app/session-work',
      });

      const stream = await exec.start({ hijack: true, stdin: false });

      // Collect output for logging
      let output = '';
      stream.on('data', (chunk: Buffer) => { output += chunk.toString(); });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
        // Timeout after 60 seconds
        setTimeout(() => { stream.destroy(); resolve(); }, 60_000);
      });

      logger.info({ sessionId, output: output.slice(-500) }, 'Dependency reinstall completed');
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to reinstall dependencies');
      // Non-fatal — Vite will show import errors but won't crash
    }
  }

  /**
   * Get session logs
   */
  async getSessionLogs(sessionId: string, since?: string): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.containerId) {
      return session.logs;
    }

    try {
      const container = this.docker.getContainer(session.containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        since: since ? Math.floor(new Date(since).getTime() / 1000) : 0,
        tail: 100,
      });

      // Parse Docker logs format
      const logLines = logs.toString('utf-8').split('\n').filter(Boolean);
      session.logs = logLines;
      return logLines;
    } catch (error) {
      logger.error({ sessionId, error }, 'Failed to get logs');
      return session.logs;
    }
  }

  /**
   * Stop a session
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'stopping';
    logger.info({ sessionId }, 'Stopping session');

    await this.cleanupSession(sessionId);
    
    session.status = 'stopped';
    this.sessions.delete(sessionId);
  }

  /**
   * Ping a session to keep it alive
   */
  pingSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.lastActivityAt = new Date();
    return true;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): PreviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get container port for a session
   */
  getContainerPort(sessionId: string): number | undefined {
    return this.sessions.get(sessionId)?.containerPort;
  }

  /**
   * Stop all sessions
   */
  async stopAllSessions(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map(id => this.stopSession(id));
    await Promise.all(promises);
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private allocatePort(): number {
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports');
  }

  private async writeFilesToDisk(sessionId: string, files: FileMap): Promise<string> {
    const workDir = getSessionWorkDir(sessionId);
    await fs.mkdir(workDir, { recursive: true });

    for (const [filePath, content] of Object.entries(files)) {
      const normalizedPath = normalizePreviewFilePath(filePath);
      if (!normalizedPath) {
        throw new Error(`Invalid file path: ${filePath}`);
      }

      assertPreviewFileContent(content);

      const fullPath = resolveSessionPath(workDir, normalizedPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    // Copy worker config files if not provided
    const requiredFiles = [
      'package.json',
      'vite.config.ts',
      'tsconfig.json',
      'postcss.config.js',
      'tailwind.config.js',
      'index.html',
    ];

    const templateDir = path.join(process.cwd(), 'worker-template');

    for (const file of requiredFiles) {
      const filePath = `/${file}`;
      if (!files[filePath] && !files[file]) {
        // Look for template files in the gateway's worker-template directory
        const workerFile = path.join(templateDir, file);
        try {
          const content = await fs.readFile(workerFile, 'utf-8');
          await fs.writeFile(path.join(workDir, file), content, 'utf-8');
        } catch {
          // File not found in worker, skip
        }
      }
    }

    // Copy src directory template files if not provided
    const srcTemplateFiles = ['main.tsx', 'App.tsx', 'index.css'];
    const srcDir = path.join(workDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    for (const file of srcTemplateFiles) {
      const filePath = `src/${file}`;
      if (!files[filePath] && !files[`/src/${file}`]) {
        const templateFile = path.join(templateDir, 'src', file);
        try {
          const content = await fs.readFile(templateFile, 'utf-8');
          await fs.writeFile(path.join(srcDir, file), content, 'utf-8');
        } catch {
          // File not found, skip
        }
      }
    }

    return workDir;
  }

  private async startContainer(sessionId: string, workDir: string, port: number): Promise<Docker.Container> {
    // Enterprise-grade container resource limits
    const MEMORY_LIMIT = parseInt(process.env.CONTAINER_MEMORY_MB || '512', 10) * 1024 * 1024;
    const MEMORY_SWAP = MEMORY_LIMIT * 2; // Allow some swap for npm install
    const CPU_PERIOD = 100000; // microseconds
    const CPU_QUOTA = parseInt(process.env.CONTAINER_CPU_PERCENT || '25', 10) * 1000; // 25% CPU by default
    const PIDS_LIMIT = 64; // Max number of processes
    const DISK_QUOTA = parseInt(process.env.CONTAINER_DISK_MB || '100', 10) * 1024 * 1024;
    
    // Use named volume for Docker-in-Docker compatibility
    const volumeName = process.env.SESSION_VOLUME_NAME || 'preview-service_preview-sessions';
    
    const container = await this.docker.createContainer({
      Image: CONTAINER_IMAGE,
      name: `preview-${sessionId}`,
      Hostname: `preview-${sessionId}`,
      WorkingDir: `/sessions/${sessionId}`,
      ExposedPorts: {
        '4173/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '4173/tcp': [{ HostPort: port.toString() }],
        },
        // Use named volume with subpath via docker's volume syntax
        Binds: [`${volumeName}:/sessions:rw`],
        
        // Memory limits
        Memory: MEMORY_LIMIT,
        MemorySwap: MEMORY_SWAP,
        MemoryReservation: Math.floor(MEMORY_LIMIT * 0.5),
        OomKillDisable: false, // Allow OOM killer if memory exceeded
        
        // CPU limits
        CpuPeriod: CPU_PERIOD,
        CpuQuota: CPU_QUOTA,
        CpuShares: 256,
        
        // Process limits
        PidsLimit: PIDS_LIMIT,
        
        // Security settings
        ReadonlyRootfs: false, // Vite needs to write
        SecurityOpt: ['no-new-privileges:true'],
        CapDrop: ['ALL'],
        CapAdd: ['CHOWN', 'SETUID', 'SETGID'], // Minimal capabilities for Node
        
        // Network restrictions (only allow specific egress)
        // In production, use a restricted network with allowlist
        NetworkMode: CONTAINER_NETWORK,
        
        // Filesystem limits (requires disk quota support)
        StorageOpt: process.env.ENABLE_DISK_QUOTA === 'true' ? {
          size: `${DISK_QUOTA}`,
        } : undefined,
        
        // Cleanup - disable in dev for debugging
        AutoRemove: process.env.NODE_ENV !== 'development',
        
        // Resource monitoring (only if supported by OS - not available on Windows Docker)
        BlkioWeight: process.env.ENABLE_BLKIO_WEIGHT === 'true' ? 300 : undefined,
        
        // DNS - use internal resolver only (limits network access)
        Dns: process.env.CONTAINER_DNS ? [process.env.CONTAINER_DNS] : undefined,
      },
      Env: [
        `SESSION_ID=${sessionId}`,
        'NODE_ENV=development',
        // Allow npm to fetch packages - worker might need to install deps
        'DISABLE_TELEMETRY=1',
        'DO_NOT_TRACK=1',
      ],
      Labels: {
        'unison.session.id': sessionId,
        'unison.service': 'preview-worker',
        'unison.created': new Date().toISOString(),
      },
      // Healthcheck
      Healthcheck: {
        Test: ['CMD', 'curl', '-f', 'http://localhost:4173/', '||', 'exit', '1'],
        Interval: 10 * 1000000000, // 10 seconds in nanoseconds
        Timeout: 5 * 1000000000,
        Retries: 3,
        StartPeriod: 30 * 1000000000,
      },
    });

    await container.start();
    return container;
  }

  private async waitForReady(sessionId: string, port: number, timeout = 60000): Promise<void> {
    const start = Date.now();
    // Use the container hostname for internal Docker network resolution
    const containerHost = `preview-${sessionId}`;
    const checkPort = 4173; // Container internal port, not the mapped host port
    
    logger.debug({ containerHost, checkPort }, 'Waiting for container to be ready');
    
    while (Date.now() - start < timeout) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`http://${containerHost}:${checkPort}`, { signal: controller.signal });
        clearTimeout(id);
        // Accept any response as "ready" - Vite may return 403 for security reasons
        const status = response.status;
        logger.debug({ containerHost, status }, 'Got response from container');
        if (status === 200 || status === 404 || status === 403 || status < 500) {
          logger.info({ containerHost, checkPort, status }, 'Container is ready');
          return; // Vite is responding
        }
      } catch (err) {
        // Not ready yet, will retry
        logger.debug({ containerHost, err: (err as Error).message }, 'Container not ready yet');
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    throw new Error('Container failed to become ready');
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    // Stop container
    if (session?.containerId) {
      try {
        const container = this.docker.getContainer(session.containerId);
        await container.stop({ t: 5 });
      } catch (error) {
        // Container may already be stopped
        logger.debug({ sessionId, error }, 'Container stop error (may be expected)');
      }
    }

    // Release port
    if (session?.containerPort) {
      this.usedPorts.delete(session.containerPort);
    }

    // Clean up temp directory
    const workDir = getSessionWorkDir(sessionId);
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
  }

  private startCleanupLoop(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      
      for (const [sessionId, session] of this.sessions) {
        const idle = now - session.lastActivityAt.getTime();
        
        if (idle > SESSION_TIMEOUT_MS && session.status === 'running') {
          logger.info({ sessionId, idleMs: idle }, 'Session timed out');
          await this.stopSession(sessionId);
        }
      }
    }, 30000); // Check every 30 seconds
  }
}
