/**
 * DebugAgentService — Observe → Plan → Patch → Verify loop
 * 
 * Unified Debug Agent with 5-channel diagnostic context:
 * 1. Editor (TS/ESLint/imports/JSX)
 * 2. Preview (runtime/React/route/hydration)
 * 3. Terminal (build/install/test/stack traces)
 * 4. Workspace graph (file tree/imports/route map/configs)
 * 5. Unison-specific (blueprint/SiteBundle/PageRegistry/intents/workflows)
 */

import { diagnosticsAggregator, type Diagnostic, type DiagnosticSnapshot, type DiagnosticChannel } from './diagnosticsAggregator';
import { workspacePatchEngine, type PatchSet, type FilePatch } from './workspacePatchEngine';
import { terminalOrchestrator, type CommandSpec } from './terminalOrchestrator';
import { getGraphSummaryForAI } from './importGraphAnalyzer';

// ============================================================================
// Types
// ============================================================================

export type DebugMode = 'debug-agent';

export type AgentStepType =
  | 'context-gather' | 'diagnose' | 'plan' | 'propose-edits'
  | 'propose-command' | 'await-approval' | 'apply-edits'
  | 'run-command' | 'verify' | 'complete' | 'blocked' | 'error';

export interface AgentStep {
  id: string;
  type: AgentStepType;
  message: string;
  timestamp: number;
  details?: string;
  patchSetId?: string;
  commandId?: string;
  durationMs?: number;
}

export interface DebugSession {
  id: string;
  mode: DebugMode;
  task: string;
  goal: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  steps: AgentStep[];
  selectedFiles: string[];
  diagnosticsSnapshot?: DiagnosticSnapshot;
  activePatchSetId?: string;
  pendingCommands: string[];
  iteration: number;
  maxIterations: number;
  tokensUsed: number;
  tokenBudget: number;
  createdAt: number;
  updatedAt: number;
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

/** Rich workspace context fed to the AI prompt — all 5 channels */
export interface WorkspaceContext {
  // Channel 1: Editor
  editorDiagnostics: string;
  // Channel 2: Preview
  previewDiagnostics: string;
  // Channel 3: Terminal
  terminalDiagnostics: string;
  terminalOutput: string;
  // Channel 4: Workspace graph
  workspaceGraph: {
    fileTree: string[];
    importGraph: string;
    routeMap: string[];
    packageDeps: string[];
    configSummary: string;
  };
  // Channel 5: Unison-specific
  unisonContext: {
    blueprint: string;
    pageRegistry: string;
    intentBindings: string;
    workflowGraph: string;
    creatorData: string;
  };
  // Files selected for the task
  fileContents: Record<string, string>;
  // Aggregated summary
  aggregatedDiagnostics: string;
  projectConfig: { framework: string; language: string; style: string };
}

// Security review patterns
const SECURITY_PATTERNS = [
  { pattern: /eval\s*\(/, severity: 'error' as const, message: 'Unsafe eval() usage detected', code: 'SEC001' },
  { pattern: /dangerouslySetInnerHTML/, severity: 'warning' as const, message: 'dangerouslySetInnerHTML — ensure input is sanitized', code: 'SEC002' },
  { pattern: /innerHTML\s*=/, severity: 'warning' as const, message: 'Direct innerHTML assignment — potential XSS vector', code: 'SEC003' },
  { pattern: /document\.write/, severity: 'warning' as const, message: 'document.write usage detected', code: 'SEC004' },
  { pattern: /localStorage\.setItem\s*\(\s*['"](?:token|secret|password|api[_-]?key)/i, severity: 'error' as const, message: 'Sensitive data stored in localStorage', code: 'SEC005' },
  { pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/, severity: 'error' as const, message: 'Potential hardcoded secret/API key', code: 'SEC006' },
  { pattern: /fetch\s*\([^)]*\{[^}]*credentials\s*:\s*['"]include['"]/, severity: 'info' as const, message: 'Fetch with credentials:include — verify CORS', code: 'SEC007' },
  { pattern: /window\.postMessage\s*\(/, severity: 'info' as const, message: 'postMessage usage — verify origin checking', code: 'SEC008' },
  { pattern: /new\s+Function\s*\(/, severity: 'error' as const, message: 'new Function() is equivalent to eval()', code: 'SEC009' },
  { pattern: /\.createObjectURL\s*\(/, severity: 'info' as const, message: 'Blob URL created — ensure proper revocation', code: 'SEC010' },
];

// ============================================================================
// Workspace Graph Extractors
// ============================================================================

function extractRouteMap(vfsFiles: Record<string, string>): string[] {
  const routes: string[] = [];
  for (const [path, content] of Object.entries(vfsFiles)) {
    if (!path.match(/\.(tsx?|jsx?)$/)) continue;
    const routeMatches = content.matchAll(/path\s*[:=]\s*['"]([^'"]+)['"]/g);
    for (const m of routeMatches) routes.push(`${m[1]} → ${path}`);
  }
  return routes.length > 0 ? routes : ['No routes detected'];
}

function extractPackageDeps(vfsFiles: Record<string, string>): string[] {
  const pkgContent = vfsFiles['package.json'] || vfsFiles['/package.json'];
  if (!pkgContent) return ['package.json not in VFS'];
  try {
    const pkg = JSON.parse(pkgContent);
    const deps = Object.keys(pkg.dependencies ?? {}).slice(0, 30);
    const devDeps = Object.keys(pkg.devDependencies ?? {}).slice(0, 10);
    return [`deps(${deps.length}): ${deps.join(', ')}`, `devDeps(${devDeps.length}): ${devDeps.join(', ')}`];
  } catch { return ['package.json parse error']; }
}

function extractConfigSummary(vfsFiles: Record<string, string>): string {
  const configs: string[] = [];
  for (const key of Object.keys(vfsFiles)) {
    if (key.match(/tsconfig|vite\.config|tailwind\.config|postcss|\.env/)) configs.push(key);
  }
  return configs.length > 0 ? `Config files: ${configs.join(', ')}` : 'No config files in VFS';
}

function extractUnisonContext(vfsFiles: Record<string, string>): WorkspaceContext['unisonContext'] {
  const result = { blueprint: 'Not detected', pageRegistry: 'Not detected', intentBindings: 'Not detected', workflowGraph: 'Not detected', creatorData: 'Not detected' };

  for (const [path, content] of Object.entries(vfsFiles)) {
    if (content.includes('BusinessBlueprint') || content.includes('blueprint')) {
      const match = content.match(/industry:\s*['"]([^'"]+)['"]/);
      if (match) result.blueprint = `Industry: ${match[1]} (${path})`;
    }
    if (content.includes('pageRegistry') || content.includes('PageRegistry')) {
      const pageMatches = [...content.matchAll(/pageId:\s*['"]([^'"]+)['"]/g)];
      if (pageMatches.length > 0) result.pageRegistry = `${pageMatches.length} pages: ${pageMatches.map(m => m[1]).join(', ')}`;
    }
    if (content.includes('data-ut-intent') || content.includes('intentBindings')) {
      const intentMatches = [...content.matchAll(/data-ut-intent=['"]([^'"]+)['"]/g)];
      if (intentMatches.length > 0) result.intentBindings = `${intentMatches.length} bindings: ${[...new Set(intentMatches.map(m => m[1]))].join(', ')}`;
    }
    if (content.includes('CreatorData') || content.includes('creatorData')) {
      const hasProducts = content.includes('products');
      const hasServices = content.includes('services');
      const parts = [hasProducts && 'products', hasServices && 'services'].filter(Boolean);
      if (parts.length > 0) result.creatorData = `Has: ${parts.join(', ')} (${path})`;
    }
  }
  return result;
}

// ============================================================================
// Agent Service
// ============================================================================

let sessionCounter = 0;
let stepCounter = 0;

class DebugAgentServiceImpl {
  private sessions: Map<string, DebugSession> = new Map();
  private activeSessionId: string | null = null;
  private listeners: Set<(session: DebugSession | null) => void> = new Set();

  startSession(input: DebugSessionInput): DebugSession {
    const session: DebugSession = {
      id: `dbg-${++sessionCounter}-${Date.now()}`,
      mode: input.mode, task: input.task, goal: input.goal,
      status: 'idle', steps: [], selectedFiles: input.selectedFiles ?? [],
      pendingCommands: [], iteration: 0,
      maxIterations: input.maxIterations ?? 10,
      tokensUsed: 0, tokenBudget: input.tokenBudget ?? 80000,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    this.addStep(session.id, 'context-gather', 'Session started — gathering 5-channel context');
    this.notify();
    return session;
  }

  addStep(sessionId: string, type: AgentStepType, message: string, details?: string): AgentStep {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    const step: AgentStep = { id: `step-${++stepCounter}`, type, message, timestamp: Date.now(), details };
    session.steps.push(step);
    session.updatedAt = Date.now();
    this.notify();
    return step;
  }

  /** Gather rich 5-channel workspace context */
  gatherContext(sessionId: string, vfsFiles: Record<string, string>, fileTree: string[]): WorkspaceContext {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.status = 'running';
    session.diagnosticsSnapshot = diagnosticsAggregator.getSnapshot();

    // Run workspace analysis
    this.analyzeWorkspace(sessionId, vfsFiles);

    // Select relevant files based on diagnostics + explicit selection
    const diagFiles = new Set<string>();
    for (const d of session.diagnosticsSnapshot.diagnostics) { if (d.file) diagFiles.add(d.file); }
    const relevantPaths = new Set([...session.selectedFiles, ...diagFiles]);
    const fileContents: Record<string, string> = {};
    for (const path of relevantPaths) { if (vfsFiles[path]) fileContents[path] = vfsFiles[path]; }

    // Build import graph
    let importGraphSummary = 'Import graph not available';
    try {
      importGraphSummary = getGraphSummaryForAI(vfsFiles);
    } catch { importGraphSummary = 'Import graph analysis failed'; }

    // Channel-specific diagnostics
    const editorDiags = diagnosticsAggregator.getChannelDiagnostics('editor');
    const previewDiags = diagnosticsAggregator.getChannelDiagnostics('preview');
    const terminalDiags = diagnosticsAggregator.getChannelDiagnostics('terminal');

    const ctx: WorkspaceContext = {
      editorDiagnostics: editorDiags.length > 0
        ? editorDiags.map(d => `[${d.source}] ${d.file ?? '?'}:${d.line ?? '?'} — ${d.message}`).join('\n')
        : 'Clean',
      previewDiagnostics: previewDiags.length > 0
        ? previewDiags.map(d => `[${d.source}] ${d.file ?? '?'}:${d.line ?? '?'} — ${d.message}`).join('\n')
        : 'Clean',
      terminalDiagnostics: terminalDiags.length > 0
        ? terminalDiags.map(d => `[${d.source}] ${d.message}`).join('\n')
        : 'Clean',
      terminalOutput: terminalOrchestrator.getRecentOutputForAI(),
      workspaceGraph: {
        fileTree,
        importGraph: importGraphSummary,
        routeMap: extractRouteMap(vfsFiles),
        packageDeps: extractPackageDeps(vfsFiles),
        configSummary: extractConfigSummary(vfsFiles),
      },
      unisonContext: extractUnisonContext(vfsFiles),
      fileContents,
      aggregatedDiagnostics: diagnosticsAggregator.getContextForAI(),
      projectConfig: { framework: 'react-vite', language: 'typescript', style: 'tailwind-hsl' },
    };

    const channelStatus = session.diagnosticsSnapshot.channels
      .filter(c => c.status !== 'healthy')
      .map(c => `${c.channel}:${c.errorCount}E/${c.warningCount}W`)
      .join(', ') || 'all channels healthy';

    this.addStep(sessionId, 'context-gather',
      `Context: ${Object.keys(fileContents).length} files, ${session.diagnosticsSnapshot.errorCount} errors [${channelStatus}]`,
      `Files: ${Object.keys(fileContents).join(', ')}\nChannels: ${channelStatus}`
    );

    return ctx;
  }

  /** Analyze workspace for structural issues — feeds into Channel 4 */
  private analyzeWorkspace(sessionId: string, vfsFiles: Record<string, string>): void {
    const issues: Array<{ type: 'circular-dep' | 'missing-config' | 'orphan-file' | 'dep-conflict' | 'missing-entry'; file?: string; message: string }> = [];

    try {
      const graph = analyzeImportGraph(vfsFiles);
      // Circular dependencies
      for (const cycle of graph.circularDeps) {
        issues.push({ type: 'circular-dep', message: `Circular: ${cycle.join(' → ')}`, file: cycle[0] });
      }
      // Orphan files
      for (const orphan of graph.orphanFiles.slice(0, 5)) {
        issues.push({ type: 'orphan-file', file: orphan, message: `Orphan file: ${orphan} (not imported anywhere)` });
      }
    } catch { /* graph analysis failed, skip */ }

    // Missing entry points
    const hasAppTsx = 'src/App.tsx' in vfsFiles || '/App.tsx' in vfsFiles;
    if (!hasAppTsx) issues.push({ type: 'missing-entry', message: 'Missing App.tsx entry point' });

    if (issues.length > 0) {
      diagnosticsAggregator.ingestWorkspaceIssues(issues);
      this.addStep(sessionId, 'diagnose', `Workspace analysis: ${issues.length} structural issues`);
    }
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
              source: 'security', severity: rule.severity,
              file: path, line: i + 1, code: rule.code,
              message: rule.message, raw: lines[i].trim(),
            });
            findings.push(diag);
          }
        }
      }
    }
    this.addStep(sessionId, 'diagnose',
      `Security scan: ${findings.filter(f => f.severity === 'error').length} issues, ${findings.filter(f => f.severity === 'warning').length} warnings`
    );
    return findings;
  }

  /** Validate Unison-specific constraints — feeds into Channel 5 */
  validateUnisonIntegrity(sessionId: string, vfsFiles: Record<string, string>): void {
    const unisonIssues: Array<{ domain: 'intent' | 'workflow' | 'page-registry' | 'blueprint'; message: string; file?: string; severity?: 'error' | 'warning' | 'info' }> = [];

    for (const [path, content] of Object.entries(vfsFiles)) {
      // Check for dangling intent references
      const intentRefs = [...content.matchAll(/data-ut-intent=['"]([^'"]+)['"]/g)];
      for (const ref of intentRefs) {
        const intent = ref[1];
        if (!intent.includes('.')) {
          unisonIssues.push({ domain: 'intent', file: path, message: `Malformed intent ID '${intent}' — should be 'domain.action'`, severity: 'warning' });
        }
      }

      // Check for CTA slots without intents
      const ctaSlots = [...content.matchAll(/data-ut-cta=['"]([^'"]+)['"]/g)];
      for (const slot of ctaSlots) {
        const line = content.substring(0, content.indexOf(slot[0])).split('\n').length;
        const surrounding = content.substring(Math.max(0, content.indexOf(slot[0]) - 200), content.indexOf(slot[0]) + 200);
        if (!surrounding.includes('data-ut-intent')) {
          unisonIssues.push({ domain: 'intent', file: path, message: `CTA slot '${slot[1]}' at line ~${line} has no data-ut-intent`, severity: 'warning' });
        }
      }
    }

    if (unisonIssues.length > 0) {
      diagnosticsAggregator.ingestUnisonDiagnostics(unisonIssues);
      this.addStep(sessionId, 'diagnose', `Unison validation: ${unisonIssues.length} issues`);
    }
  }

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

  recordVerification(sessionId: string, status: DebugSession['verificationStatus'], details?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.verificationStatus = status;
    if (status === 'fixed') session.status = 'completed';
    this.addStep(sessionId, status === 'fixed' ? 'complete' : 'verify', `Verification: ${status}`, details);
    this.notify();
  }

  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = 'completed';
    session.updatedAt = Date.now();
    if (this.activeSessionId === sessionId) this.activeSessionId = null;
    this.notify();
  }

  getSession(sessionId: string): DebugSession | undefined { return this.sessions.get(sessionId); }
  getActiveSession(): DebugSession | null { return this.activeSessionId ? (this.sessions.get(this.activeSessionId) ?? null) : null; }

  /** Get session summary for AI context — includes channel health */
  getSessionSummaryForAI(sessionId: string): string {
    const s = this.sessions.get(sessionId);
    if (!s) return '';
    const snap = s.diagnosticsSnapshot;
    const lines = [
      `## Debug Session`,
      `Task: ${s.task}`,
      `Goal: ${s.goal}`,
      `Status: ${s.status} | Iteration ${s.iteration}/${s.maxIterations}`,
    ];
    if (snap) {
      lines.push(`Channel health: ${snap.channels.map(c => `${c.channel}:${c.status}`).join(', ')}`);
    }
    lines.push(`Steps:`, ...s.steps.slice(-10).map(st => `  [${st.type}] ${st.message}`));
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
