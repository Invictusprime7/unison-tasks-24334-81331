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
  async startSession(projectId: string, files: FileMap): Promise<PreviewSession> {
    // Check session limit
    if (this.sessions.size >= MAX_SESSIONS) {
      throw new Error('Maximum session limit reached');
    }

    const sessionId = uuidv4();
    const port = this.allocatePort();
    
    // Create session record
    const session: PreviewSession = {
      id: sessionId,
      projectId,
      status: 'pending',
      containerPort: port,
      iframeUrl: `${GATEWAY_URL}/preview/${sessionId}`,
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
      await this.waitForReady(port);
      
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

    // Update session files
    session.files[filePath] = content;
    session.lastActivityAt = new Date();

    // Write file to container volume
    const workDir = path.join(os.tmpdir(), 'preview-sessions', sessionId);
    const fullPath = path.join(workDir, filePath);
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    
    logger.debug({ sessionId, filePath }, 'File patched');
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
    const workDir = path.join(os.tmpdir(), 'preview-sessions', sessionId);
    await fs.mkdir(workDir, { recursive: true });

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(workDir, filePath);
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
    const MEMORY_LIMIT = parseInt(process.env.CONTAINER_MEMORY_MB || '256', 10) * 1024 * 1024;
    const MEMORY_SWAP = MEMORY_LIMIT; // No swap allowed (prevents OOM swapping)
    const CPU_PERIOD = 100000; // microseconds
    const CPU_QUOTA = parseInt(process.env.CONTAINER_CPU_PERCENT || '25', 10) * 1000; // 25% CPU by default
    const PIDS_LIMIT = 64; // Max number of processes
    const DISK_QUOTA = parseInt(process.env.CONTAINER_DISK_MB || '100', 10) * 1024 * 1024;
    
    const container = await this.docker.createContainer({
      Image: CONTAINER_IMAGE,
      name: `preview-${sessionId}`,
      Hostname: `preview-${sessionId}`,
      ExposedPorts: {
        '4173/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '4173/tcp': [{ HostPort: port.toString() }],
        },
        Binds: [`${workDir}:/app:rw`],
        
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
        
        // Cleanup
        AutoRemove: true,
        
        // Resource monitoring
        BlkioWeight: 300, // Lower disk I/O priority
        
        // DNS - use internal resolver only (limits network access)
        Dns: process.env.CONTAINER_DNS ? [process.env.CONTAINER_DNS] : undefined,
      },
      Env: [
        `SESSION_ID=${sessionId}`,
        'NODE_ENV=development',
        // Limit npm/node network access
        'npm_config_offline=true', // Disable npm network calls
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

  private async waitForReady(port: number, timeout = 30000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}`);
        if (response.ok || response.status === 404) {
          return; // Vite is responding
        }
      } catch {
        // Not ready yet
      }
      await new Promise(r => setTimeout(r, 500));
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
    const workDir = path.join(os.tmpdir(), 'preview-sessions', sessionId);
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
