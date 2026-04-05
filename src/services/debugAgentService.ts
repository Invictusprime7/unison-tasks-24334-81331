/**
 * DebugAgentService — Observe → Plan → Patch → Verify loop
 * 
 * Provides three modes:
 * - Surgical Edit: file-scoped, minimal surface area, no autonomous commands
 * - Debug Agent: iterative multi-file debugging with command loop
 * - Security Review: defensive code scanning
 * 
 * Each step is logged as a structured event for full auditability.
 */

import { diagnosticsAggregator, type Diagnostic, type DiagnosticSnapshot } from './diagnosticsAggregator';
import { workspacePatchEngine, type PatchSet, type FilePatch } from './workspacePatchEngine';
import { terminalOrchestrator, type CommandSpec } from './terminalOrchestrator';

// ============================================================================
// Types
// ============================================================================

export type DebugMode = 'surgical-edit' | 'debug-agent' | 'security-review';

export type AgentStepType = 
  | 'context-gather'
  | 'diagnose'
  | 'plan'
  | 'propose-edits'
  | 'propose-command'
  | 'await-approval'
  | 'apply-edits'
  | 'run-command'
  | 'verify'
  | 'complete'
  | 'blocked'
  | 'error';

export interface AgentStep {
  id: string;
  type: AgentStepType;
  message: string;
  timestamp: number;
  details?: string;
  /** Associated patch set */
  patchSetId?: string;
  /** Associated command */
  commandId?: string;
  /** Duration in ms */
  durationMs?: number;
}

export interface DebugSession {
  id: string;
  mode: DebugMode;
  task: string;
  goal: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  steps: AgentStep[];
  /** Files the agent has chosen to work with */
  selectedFiles: string[];
  /** Current diagnostics snapshot */
  diagnosticsSnapshot?: DiagnosticSnapshot;
  /** Active patch set being reviewed */
  activePatchSetId?: string;
  /** Pending commands needing approval */
  pendingCommands: string[];
  /** Iteration count */
  iteration: number;
  /** Max iterations before auto-stop */
  maxIterations: number;
  /** Token budget used */
  tokensUsed: number;
  /** Max token budget */
  tokenBudget: number;
  createdAt: number;
  updatedAt: number;
  /** Verification result */
  verificationStatus?: 'fixed' | 'partially-fixed' | 'blocked' | 'unknown';
}

export interface DebugSessionInput {
  task: string;
  goal: string;
  mode: DebugMode;
  selectedFiles?: string[];
  maxIterations?: number;
  tokenBudget?: number;
}

export interface WorkspaceContext {
  /** Compact file tree */
  fileTree: string[];
  /** Files with content (selected by agent) */
  fileContents: Record<string, string>;
  /** Diagnostics */
  diagnostics: string;
  /** Recent terminal output */
  terminalOutput: string;
  /** Preview errors */
  previewErrors: string;
  /** Project config summary */
  projectConfig: {
    framework: string;
    language: string;
    style: string;
  };
}

// Security review patterns
const SECURITY_PATTERNS = [
  { pattern: /eval\s*\(/, severity: 'error' as const, message: 'Unsafe eval() usage detected', code: 'SEC001' },
  { pattern: /dangerouslySetInnerHTML/, severity: 'warning' as const, message: 'dangerouslySetInnerHTML usage — ensure input is sanitized', code: 'SEC002' },
  { pattern: /innerHTML\s*=/, severity: 'warning' as const, message: 'Direct innerHTML assignment — potential XSS vector', code: 'SEC003' },
  { pattern: /document\.write/, severity: 'warning' as const, message: 'document.write usage detected', code: 'SEC004' },
  { pattern: /localStorage\.setItem\s*\(\s*['"](?:token|secret|password|api[_-]?key)/i, severity: 'error' as const, message: 'Sensitive data stored in localStorage', code: 'SEC005' },
  { pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/, severity: 'error' as const, message: 'Potential hardcoded secret/API key', code: 'SEC006' },
  { pattern: /fetch\s*\([^)]*\{[^}]*credentials\s*:\s*['"]include['"]/, severity: 'info' as const, message: 'Fetch with credentials:include — verify CORS is configured', code: 'SEC007' },
  { pattern: /window\.postMessage\s*\(/, severity: 'info' as const, message: 'postMessage usage — verify origin checking', code: 'SEC008' },
  { pattern: /new\s+Function\s*\(/, severity: 'error' as const, message: 'new Function() is equivalent to eval()', code: 'SEC009' },
  { pattern: /\.createObjectURL\s*\(/, severity: 'info' as const, message: 'Blob URL created — ensure proper revocation', code: 'SEC010' },
];

// ============================================================================
// Agent Service
// ============================================================================

let sessionCounter = 0;
let stepCounter = 0;

class DebugAgentServiceImpl {
  private sessions: Map<string, DebugSession> = new Map();
  private activeSessionId: string | null = null;
  private listeners: Set<(session: DebugSession | null) => void> = new Set();

  /** Start a new debug session */
  startSession(input: DebugSessionInput): DebugSession {
    const session: DebugSession = {
      id: `dbg-${++sessionCounter}-${Date.now()}`,
      mode: input.mode,
      task: input.task,
      goal: input.goal,
      status: 'idle',
      steps: [],
      selectedFiles: input.selectedFiles ?? [],
      pendingCommands: [],
      iteration: 0,
      maxIterations: input.maxIterations ?? (input.mode === 'surgical-edit' ? 3 : 10),
      tokensUsed: 0,
      tokenBudget: input.tokenBudget ?? (input.mode === 'surgical-edit' ? 20000 : 80000),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    this.addStep(session.id, 'context-gather', `Session started in ${input.mode} mode`);
    this.notify();
    return session;
  }

  /** Add a step to the active session */
  addStep(sessionId: string, type: AgentStepType, message: string, details?: string): AgentStep {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const step: AgentStep = {
      id: `step-${++stepCounter}`,
      type,
      message,
      timestamp: Date.now(),
      details,
    };

    session.steps.push(step);
    session.updatedAt = Date.now();
    this.notify();
    return step;
  }

  /** Gather workspace context for the AI prompt */
  gatherContext(
    sessionId: string,
    vfsFiles: Record<string, string>,
    fileTree: string[],
  ): WorkspaceContext {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = 'running';
    session.diagnosticsSnapshot = diagnosticsAggregator.getSnapshot();

    // Select relevant files based on diagnostics
    const diagFiles = new Set<string>();
    for (const d of session.diagnosticsSnapshot.diagnostics) {
      if (d.file) diagFiles.add(d.file);
    }

    // Include explicitly selected files + diagnostic files
    const relevantPaths = new Set([...session.selectedFiles, ...diagFiles]);
    const fileContents: Record<string, string> = {};
    for (const path of relevantPaths) {
      if (vfsFiles[path]) {
        fileContents[path] = vfsFiles[path];
      }
    }

    const ctx: WorkspaceContext = {
      fileTree,
      fileContents,
      diagnostics: diagnosticsAggregator.getContextForAI(),
      terminalOutput: terminalOrchestrator.getRecentOutputForAI(),
      previewErrors: session.diagnosticsSnapshot.diagnostics
        .filter(d => d.source === 'preview')
        .map(d => `${d.file || '?'}:${d.line || '?'} — ${d.message}`)
        .join('\n') || 'None',
      projectConfig: {
        framework: 'react-vite',
        language: 'typescript',
        style: 'tailwind-hsl',
      },
    };

    this.addStep(sessionId, 'context-gather', 
      `Gathered context: ${Object.keys(fileContents).length} files, ${session.diagnosticsSnapshot.errorCount} errors`,
      `Files: ${Object.keys(fileContents).join(', ')}`
    );

    return ctx;
  }

  /** Run security review on file contents */
  runSecurityReview(sessionId: string, files: Record<string, string>): Diagnostic[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    this.addStep(sessionId, 'diagnose', 'Running security scan...');
    const findings: Diagnostic[] = [];

    for (const [path, content] of Object.entries(files)) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const rule of SECURITY_PATTERNS) {
          if (rule.pattern.test(lines[i])) {
            const diag = diagnosticsAggregator.add({
              source: 'workflow',
              severity: rule.severity,
              file: path,
              line: i + 1,
              code: rule.code,
              message: rule.message,
              raw: lines[i].trim(),
            });
            findings.push(diag);
          }
        }
      }
    }

    this.addStep(sessionId, 'diagnose',
      `Security scan complete: ${findings.filter(f => f.severity === 'error').length} issues, ${findings.filter(f => f.severity === 'warning').length} warnings`,
    );

    return findings;
  }

  /** Record that the agent has proposed file edits */
  recordProposedEdits(sessionId: string, patchSetId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.activePatchSetId = patchSetId;
    const ps = workspacePatchEngine.getPatchSet(patchSetId);
    this.addStep(sessionId, 'propose-edits',
      `Proposed ${ps?.patches.length ?? 0} file changes`,
      ps?.patches.map(p => `${p.operation} ${p.path} (+${p.linesAdded}/-${p.linesRemoved})`).join('\n')
    );
  }

  /** Record that the agent wants to run a command */
  recordProposedCommand(sessionId: string, commandId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const cmd = terminalOrchestrator.getHistory().find(c => c.id === commandId);
    if (!cmd) return;

    if (cmd.status === 'pending') {
      session.pendingCommands.push(commandId);
      this.addStep(sessionId, 'await-approval', `Awaiting approval: ${cmd.command} ${cmd.args.join(' ')}`, cmd.rationale);
    } else if (cmd.status === 'approved') {
      this.addStep(sessionId, 'run-command', `Running: ${cmd.command} ${cmd.args.join(' ')}`);
    } else if (cmd.status === 'rejected') {
      this.addStep(sessionId, 'blocked', `Command rejected: ${cmd.command}`);
    }
  }

  /** Increment iteration and check limits */
  incrementIteration(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.iteration++;
    if (session.iteration >= session.maxIterations) {
      session.status = 'completed';
      session.verificationStatus = 'blocked';
      this.addStep(sessionId, 'blocked', `Max iterations (${session.maxIterations}) reached`);
      this.notify();
      return false;
    }
    return true;
  }

  /** Record verification result */
  recordVerification(sessionId: string, status: DebugSession['verificationStatus'], details?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.verificationStatus = status;
    if (status === 'fixed') session.status = 'completed';
    this.addStep(sessionId, status === 'fixed' ? 'complete' : 'verify',
      `Verification: ${status}`, details
    );
    this.notify();
  }

  /** Complete the session */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = 'completed';
    session.updatedAt = Date.now();
    if (this.activeSessionId === sessionId) this.activeSessionId = null;
    this.notify();
  }

  /** Get session by ID */
  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Get active session */
  getActiveSession(): DebugSession | null {
    return this.activeSessionId ? (this.sessions.get(this.activeSessionId) ?? null) : null;
  }

  /** Get session summary for AI context */
  getSessionSummaryForAI(sessionId: string): string {
    const s = this.sessions.get(sessionId);
    if (!s) return '';
    const lines = [
      `## Debug Session: ${s.mode}`,
      `Task: ${s.task}`,
      `Goal: ${s.goal}`,
      `Status: ${s.status} | Iteration ${s.iteration}/${s.maxIterations}`,
      `Steps:`,
      ...s.steps.slice(-10).map(st => `  [${st.type}] ${st.message}`),
    ];
    if (s.verificationStatus) lines.push(`Verification: ${s.verificationStatus}`);
    return lines.join('\n');
  }

  subscribe(listener: (session: DebugSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const session = this.getActiveSession();
    for (const l of this.listeners) {
      try { l(session); } catch (e) { console.error('[DebugAgent]', e); }
    }
  }
}

export const debugAgentService = new DebugAgentServiceImpl();
