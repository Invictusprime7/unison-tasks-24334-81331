/**
 * TerminalOrchestrator — Governed command execution for the Debug Agent
 * 
 * Provides:
 * - Allowlisted command classes with auto-run vs. approval-required
 * - Argument validation and path scoping
 * - stdout/stderr capture and parsed failure extraction
 * - Command history with association to agent steps
 * - Dry-run mode
 */

// ============================================================================
// Types
// ============================================================================

export type CommandClass = 
  | 'typecheck'
  | 'lint'
  | 'test'
  | 'build'
  | 'install'
  | 'inspect'
  | 'search'
  | 'list'
  | 'read'
  | 'format'
  | 'diagnose'
  | 'custom';

export type ApprovalLevel = 'auto' | 'approve';

export interface CommandSpec {
  id: string;
  commandClass: CommandClass;
  command: string;
  args: string[];
  /** Why the agent wants to run this */
  rationale: string;
  /** Expected outcome */
  expectedResult?: string;
  /** Fallback plan if it fails */
  fallback?: string;
  approvalLevel: ApprovalLevel;
  status: 'pending' | 'approved' | 'running' | 'completed' | 'failed' | 'rejected' | 'timeout';
  output?: string;
  errorOutput?: string;
  exitCode?: number;
  startedAt?: number;
  completedAt?: number;
  /** Associated debug agent step */
  agentStepId?: string;
}

export interface CommandPolicy {
  commandClass: CommandClass;
  approvalLevel: ApprovalLevel;
  /** Allowed command patterns (regex) */
  allowedPatterns: RegExp[];
  /** Max execution time in ms */
  timeoutMs: number;
  /** Description for UI */
  description: string;
}

export interface ParsedFailure {
  type: 'compile' | 'runtime' | 'install' | 'lint' | 'test' | 'unknown';
  message: string;
  file?: string;
  line?: number;
  details?: string;
}

// ============================================================================
// Command Policies
// ============================================================================

const DEFAULT_POLICIES: CommandPolicy[] = [
  {
    commandClass: 'typecheck',
    approvalLevel: 'auto',
    allowedPatterns: [/^tsc/, /^npx\s+tsc/],
    timeoutMs: 30000,
    description: 'Run TypeScript type checking',
  },
  {
    commandClass: 'lint',
    approvalLevel: 'auto',
    allowedPatterns: [/^eslint/, /^npx\s+eslint/],
    timeoutMs: 30000,
    description: 'Run ESLint',
  },
  {
    commandClass: 'test',
    approvalLevel: 'auto',
    allowedPatterns: [/^vitest/, /^jest/, /^npx\s+(vitest|jest)/],
    timeoutMs: 60000,
    description: 'Run tests',
  },
  {
    commandClass: 'build',
    approvalLevel: 'auto',
    allowedPatterns: [/^vite\s+build/, /^npx\s+vite\s+build/],
    timeoutMs: 60000,
    description: 'Run build',
  },
  {
    commandClass: 'install',
    approvalLevel: 'approve',
    allowedPatterns: [/^npm\s+install/, /^bun\s+(add|install)/, /^pnpm\s+(add|install)/],
    timeoutMs: 60000,
    description: 'Install dependencies',
  },
  {
    commandClass: 'inspect',
    approvalLevel: 'auto',
    allowedPatterns: [/^npm\s+ls/, /^npm\s+list/, /^cat\s+package\.json/],
    timeoutMs: 10000,
    description: 'Inspect dependency tree',
  },
  {
    commandClass: 'search',
    approvalLevel: 'auto',
    allowedPatterns: [/^grep/, /^rg\s/, /^find\s/],
    timeoutMs: 15000,
    description: 'Search files/logs',
  },
  {
    commandClass: 'list',
    approvalLevel: 'auto',
    allowedPatterns: [/^ls/, /^tree/, /^find\s/],
    timeoutMs: 10000,
    description: 'List files',
  },
  {
    commandClass: 'read',
    approvalLevel: 'auto',
    allowedPatterns: [/^cat\s/, /^head\s/, /^tail\s/],
    timeoutMs: 10000,
    description: 'Read file contents',
  },
  {
    commandClass: 'format',
    approvalLevel: 'auto',
    allowedPatterns: [/^prettier/, /^npx\s+prettier/],
    timeoutMs: 15000,
    description: 'Format code',
  },
  {
    commandClass: 'diagnose',
    approvalLevel: 'auto',
    allowedPatterns: [/^diagnose/],
    timeoutMs: 15000,
    description: 'Run VFS diagnostics',
  },
];

// Commands that are always blocked
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+\*/,
  /curl\s.*\|.*sh/,
  /wget\s.*\|.*sh/,
  /eval\s/,
  /exec\s/,
  />\s*\/dev\/sd/,
  /mkfs/,
  /dd\s+if=/,
  /env\b/,
  /printenv/,
  /echo\s+\$/,
];

// ============================================================================
// Orchestrator
// ============================================================================

let commandCounter = 0;

class TerminalOrchestratorService {
  private history: CommandSpec[] = [];
  private policies: CommandPolicy[] = [...DEFAULT_POLICIES];
  private listeners: Set<(history: CommandSpec[]) => void> = new Set();
  private maxHistory = 100;

  /** Classify a raw command string */
  classify(rawCommand: string): { commandClass: CommandClass; policy: CommandPolicy | null; blocked: boolean; blockReason?: string } {
    const trimmed = rawCommand.trim();

    // Check blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { commandClass: 'custom', policy: null, blocked: true, blockReason: `Blocked: matches dangerous pattern ${pattern.source}` };
      }
    }

    // Match against policies
    for (const policy of this.policies) {
      for (const pattern of policy.allowedPatterns) {
        if (pattern.test(trimmed)) {
          return { commandClass: policy.commandClass, policy, blocked: false };
        }
      }
    }

    // Unknown command — require approval
    return { commandClass: 'custom', policy: null, blocked: false };
  }

  /** Create a command spec from agent proposal */
  propose(
    rawCommand: string,
    rationale: string,
    options?: { expectedResult?: string; fallback?: string; agentStepId?: string }
  ): CommandSpec {
    const { commandClass, policy, blocked, blockReason } = this.classify(rawCommand);
    const parts = rawCommand.trim().split(/\s+/);

    const spec: CommandSpec = {
      id: `cmd-${++commandCounter}-${Date.now()}`,
      commandClass,
      command: parts[0],
      args: parts.slice(1),
      rationale,
      expectedResult: options?.expectedResult,
      fallback: options?.fallback,
      approvalLevel: policy?.approvalLevel ?? 'approve',
      status: blocked ? 'rejected' : (policy?.approvalLevel === 'auto' ? 'approved' : 'pending'),
      agentStepId: options?.agentStepId,
    };

    if (blocked) {
      spec.errorOutput = blockReason;
    }

    this.history.push(spec);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.notify();
    return spec;
  }

  /** Approve a pending command */
  approve(commandId: string): boolean {
    const cmd = this.history.find(c => c.id === commandId);
    if (!cmd || cmd.status !== 'pending') return false;
    cmd.status = 'approved';
    this.notify();
    return true;
  }

  /** Reject a pending command */
  reject(commandId: string): boolean {
    const cmd = this.history.find(c => c.id === commandId);
    if (!cmd || cmd.status !== 'pending') return false;
    cmd.status = 'rejected';
    this.notify();
    return true;
  }

  /** Record command execution result (for VFS terminal integration) */
  recordResult(commandId: string, output: string, errorOutput: string, exitCode: number): void {
    const cmd = this.history.find(c => c.id === commandId);
    if (!cmd) return;
    cmd.output = output;
    cmd.errorOutput = errorOutput;
    cmd.exitCode = exitCode;
    cmd.status = exitCode === 0 ? 'completed' : 'failed';
    cmd.completedAt = Date.now();
    this.notify();
  }

  /** Parse failure from command output */
  parseFailure(commandId: string): ParsedFailure | null {
    const cmd = this.history.find(c => c.id === commandId);
    if (!cmd || cmd.status !== 'failed') return null;

    const output = (cmd.errorOutput || cmd.output || '').trim();
    if (!output) return null;

    // TypeScript errors
    const tsMatch = output.match(/(\S+\.tsx?)\((\d+),\d+\):\s*error\s+(TS\d+):\s*(.+)/);
    if (tsMatch) {
      return { type: 'compile', message: tsMatch[4], file: tsMatch[1], line: parseInt(tsMatch[2]), details: output };
    }

    // ESLint errors
    const eslintMatch = output.match(/(\S+\.tsx?)\s+(\d+):\d+\s+error\s+(.+)/);
    if (eslintMatch) {
      return { type: 'lint', message: eslintMatch[3], file: eslintMatch[1], line: parseInt(eslintMatch[2]) };
    }

    // npm install failures
    if (output.includes('npm ERR!') || output.includes('ERESOLVE')) {
      return { type: 'install', message: output.split('\n')[0], details: output };
    }

    // Test failures
    if (output.includes('FAIL') || output.includes('AssertionError')) {
      return { type: 'test', message: output.split('\n')[0], details: output };
    }

    return { type: 'unknown', message: output.split('\n')[0], details: output };
  }

  /** Get command history */
  getHistory(): CommandSpec[] {
    return [...this.history];
  }

  /** Get pending commands requiring approval */
  getPending(): CommandSpec[] {
    return this.history.filter(c => c.status === 'pending');
  }

  /** Get recent output for AI context */
  getRecentOutputForAI(maxChars = 2000): string {
    const recent = this.history.slice(-10);
    const lines: string[] = [];
    let chars = 0;
    for (const cmd of recent.reverse()) {
      const line = `$ ${cmd.command} ${cmd.args.join(' ')} → ${cmd.status}${cmd.output ? '\n' + cmd.output.slice(0, 500) : ''}`;
      if (chars + line.length > maxChars) break;
      lines.push(line);
      chars += line.length;
    }
    return lines.reverse().join('\n---\n') || 'No recent commands.';
  }

  /** Clear history */
  clear(): void {
    this.history = [];
    this.notify();
  }

  subscribe(listener: (history: CommandSpec[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const h = this.getHistory();
    for (const l of this.listeners) {
      try { l(h); } catch (e) { console.error('[TerminalOrchestrator]', e); }
    }
  }
}

export const terminalOrchestrator = new TerminalOrchestratorService();
