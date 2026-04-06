/**
 * DebugAgentPanel — Unified Debug Agent with 5-channel diagnostics
 * 
 * Channels: Editor | Preview | Terminal | Workspace | Unison
 * Each channel shows health status and grouped diagnostics.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bug, Shield, Bot, Send, Loader2, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronRight, FileCode, Terminal,
  Play, RotateCcw, Eye, Trash2, Check, X, Sparkles, Zap,
  Search, FolderOpen, Activity, Code, Globe, Layers, Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { debugAgentService, type DebugSession, type AgentStep } from '@/services/debugAgentService';
import { diagnosticsAggregator, type DiagnosticSnapshot, type Diagnostic, type DiagnosticChannel, type ChannelHealth } from '@/services/diagnosticsAggregator';
import { workspacePatchEngine, type PatchSet } from '@/services/workspacePatchEngine';
import { terminalOrchestrator, type CommandSpec } from '@/services/terminalOrchestrator';

// ============================================================================
// Types
// ============================================================================

export interface DebugAgentPanelProps {
  iframeErrors: Array<{ type: string; message: string; stack?: string; file?: string; line?: number; column?: number; timestamp: Date }>;
  onFixError?: (error: any) => void;
  onClearErrors?: () => void;
  onApplyPatch?: (files: Record<string, string>) => void;
  vfsFiles?: Record<string, string> | null;
  isFixing?: boolean;
}

// ============================================================================
// Channel health indicator
// ============================================================================

const CHANNEL_META: Record<DiagnosticChannel, { icon: React.ElementType; label: string; color: string }> = {
  editor: { icon: Code, label: 'Editor', color: 'text-blue-400' },
  preview: { icon: Globe, label: 'Preview', color: 'text-purple-400' },
  terminal: { icon: Terminal, label: 'Terminal', color: 'text-amber-400' },
  workspace: { icon: Layers, label: 'Workspace', color: 'text-sky-400' },
  unison: { icon: Workflow, label: 'Unison', color: 'text-emerald-400' },
};

const ChannelHealthBar: React.FC<{
  channels: ChannelHealth[];
  activeChannel: DiagnosticChannel | null;
  onSelect: (ch: DiagnosticChannel | null) => void;
}> = ({ channels, activeChannel, onSelect }) => (
  <div className="flex gap-1 px-3 py-1.5 border-b border-white/5 overflow-x-auto">
    <button
      onClick={() => onSelect(null)}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono transition-all border',
        !activeChannel ? 'bg-white/10 border-white/20 text-foreground/80' : 'border-transparent text-foreground/40 hover:text-foreground/60'
      )}
    >
      All
    </button>
    {channels.map(ch => {
      const meta = CHANNEL_META[ch.channel];
      const Icon = meta.icon;
      const isActive = activeChannel === ch.channel;
      return (
        <button
          key={ch.channel}
          onClick={() => onSelect(isActive ? null : ch.channel)}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono transition-all border',
            isActive ? 'bg-white/10 border-white/20' : 'border-transparent hover:bg-white/5',
            ch.status === 'error' && 'text-red-400',
            ch.status === 'warning' && 'text-amber-400',
            ch.status === 'healthy' && 'text-foreground/40',
          )}
        >
          <Icon className="w-3 h-3" />
          <span>{meta.label}</span>
          {ch.errorCount > 0 && (
            <span className="px-1 rounded-full bg-red-500/20 text-red-400 text-[8px]">{ch.errorCount}</span>
          )}
          {ch.errorCount === 0 && ch.warningCount > 0 && (
            <span className="px-1 rounded-full bg-amber-500/20 text-amber-400 text-[8px]">{ch.warningCount}</span>
          )}
          {ch.status === 'healthy' && <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />}
        </button>
      );
    })}
  </div>
);

// ============================================================================
// Sub-components
// ============================================================================

const DiagnosticItem: React.FC<{ diag: Diagnostic }> = ({ diag }) => {
  const channelMeta = CHANNEL_META[diag.channel];
  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded bg-black/20 border border-white/5">
      <div className={cn(
        'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
        diag.severity === 'error' && 'bg-red-400',
        diag.severity === 'warning' && 'bg-amber-400',
        diag.severity === 'info' && 'bg-blue-400',
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('text-[8px] h-3.5 border-white/10', channelMeta.color)}>
            {diag.source}
          </Badge>
          {diag.file && (
            <span className="text-[9px] text-muted-foreground/40 font-mono truncate">
              {diag.file}{diag.line ? `:${diag.line}` : ''}
            </span>
          )}
          {diag.code && (
            <span className="text-[8px] text-muted-foreground/30 font-mono">{diag.code}</span>
          )}
        </div>
        <p className="text-[11px] text-foreground/70 mt-0.5 leading-tight">{diag.message}</p>
      </div>
    </div>
  );
};

const StepItem: React.FC<{ step: AgentStep; isLast: boolean }> = ({ step, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const iconMap: Record<string, React.ReactNode> = {
    'context-gather': <FolderOpen className="w-3 h-3 text-blue-400" />,
    'diagnose': <Search className="w-3 h-3 text-amber-400" />,
    'plan': <Activity className="w-3 h-3 text-sky-400" />,
    'propose-edits': <FileCode className="w-3 h-3 text-green-400" />,
    'propose-command': <Terminal className="w-3 h-3 text-purple-400" />,
    'await-approval': <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />,
    'apply-edits': <Check className="w-3 h-3 text-green-400" />,
    'run-command': <Play className="w-3 h-3 text-blue-400" />,
    'verify': <Eye className="w-3 h-3 text-sky-400" />,
    'complete': <CheckCircle2 className="w-3 h-3 text-green-400" />,
    'blocked': <XCircle className="w-3 h-3 text-red-400" />,
    'error': <XCircle className="w-3 h-3 text-red-400" />,
  };

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center">
        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          {iconMap[step.type] || <Zap className="w-3 h-3" />}
        </div>
        {!isLast && <div className="w-px h-3 bg-white/10" />}
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <button
          onClick={() => step.details && setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-foreground/60 font-mono w-full text-left"
        >
          <span className="truncate">{step.message}</span>
          {step.details && (
            expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
          )}
        </button>
        {expanded && step.details && (
          <pre className="mt-1 px-2 py-1 bg-black/40 border border-white/5 rounded text-[9px] text-foreground/40 font-mono overflow-x-auto max-h-24">
            {step.details}
          </pre>
        )}
      </div>
    </div>
  );
};

const PatchReview: React.FC<{
  patchSet: PatchSet;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptPatch: (patchId: string) => void;
  onRejectPatch: (patchId: string) => void;
  onApply: () => void;
}> = ({ patchSet, onAcceptAll, onRejectAll, onAcceptPatch, onRejectPatch, onApply }) => {
  const [expandedPatch, setExpandedPatch] = useState<string | null>(null);
  const hasAccepted = patchSet.patches.some(p => p.status === 'accepted');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-foreground/50 font-mono">
          {patchSet.patches.length} file{patchSet.patches.length !== 1 ? 's' : ''} changed
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onAcceptAll} className="h-6 text-[10px] text-green-400 hover:bg-green-500/10">
            <Check className="w-3 h-3 mr-1" /> Accept All
          </Button>
          <Button size="sm" variant="ghost" onClick={onRejectAll} className="h-6 text-[10px] text-red-400 hover:bg-red-500/10">
            <X className="w-3 h-3 mr-1" /> Reject
          </Button>
        </div>
      </div>
      {patchSet.patches.map(patch => (
        <div key={patch.id} className={cn(
          'border rounded-lg overflow-hidden',
          patch.status === 'accepted' && 'border-green-500/30 bg-green-500/5',
          patch.status === 'rejected' && 'border-red-500/30 bg-red-500/5 opacity-50',
          patch.status === 'pending' && 'border-white/10 bg-black/20',
          patch.status === 'applied' && 'border-blue-500/30 bg-blue-500/5',
        )}>
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
            onClick={() => setExpandedPatch(expandedPatch === patch.id ? null : patch.id)}
          >
            <Badge variant="outline" className={cn(
              'text-[9px] h-4',
              patch.operation === 'create' && 'border-green-500/30 text-green-400',
              patch.operation === 'update' && 'border-blue-500/30 text-blue-400',
              patch.operation === 'delete' && 'border-red-500/30 text-red-400',
            )}>
              {patch.operation}
            </Badge>
            <span className="text-[11px] text-foreground/70 font-mono truncate flex-1">{patch.path}</span>
            <span className="text-[9px] text-green-400/60">+{patch.linesAdded}</span>
            <span className="text-[9px] text-red-400/60">-{patch.linesRemoved}</span>
            {patch.status === 'pending' && (
              <div className="flex gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); onAcceptPatch(patch.id); }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-green-500/20 text-green-400">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onRejectPatch(patch.id); }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {expandedPatch === patch.id ? <ChevronDown className="w-3 h-3 text-foreground/30" /> : <ChevronRight className="w-3 h-3 text-foreground/30" />}
          </button>
          {expandedPatch === patch.id && patch.diff && (
            <pre className="px-2 py-1.5 bg-black/60 text-[10px] font-mono overflow-x-auto max-h-48 border-t border-white/5">
              {patch.diff.split('\n').map((line, i) => (
                <div key={i} className={cn(
                  line.startsWith('+') && !line.startsWith('+++') && 'text-green-400/80 bg-green-500/5',
                  line.startsWith('-') && !line.startsWith('---') && 'text-red-400/80 bg-red-500/5',
                  line.startsWith('@@') && 'text-blue-400/60',
                  !line.startsWith('+') && !line.startsWith('-') && !line.startsWith('@@') && 'text-foreground/30',
                )}>
                  {line}
                </div>
              ))}
            </pre>
          )}
          {patch.justification && expandedPatch === patch.id && (
            <div className="px-2 py-1 border-t border-white/5 text-[10px] text-foreground/40 italic">
              {patch.justification}
            </div>
          )}
        </div>
      ))}
      {hasAccepted && (
        <Button size="sm" onClick={onApply} className="w-full gap-1.5 bg-green-600 hover:bg-green-500 text-white font-bold">
          <Play className="w-3 h-3" /> Apply Accepted Changes
        </Button>
      )}
    </div>
  );
};

const CommandApproval: React.FC<{
  commands: CommandSpec[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ commands, onApprove, onReject }) => {
  if (commands.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] text-amber-400/70 font-mono">Commands awaiting approval:</span>
      {commands.map(cmd => (
        <div key={cmd.id} className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded">
          <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <code className="text-[11px] text-amber-200 font-mono">{cmd.command} {cmd.args.join(' ')}</code>
            <p className="text-[9px] text-amber-400/50 mt-0.5">{cmd.rationale}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onApprove(cmd.id)} className="w-6 h-6 rounded flex items-center justify-center bg-green-500/20 hover:bg-green-500/30 text-green-400">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => onReject(cmd.id)} className="w-6 h-6 rounded flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const DebugAgentPanel: React.FC<DebugAgentPanelProps> = ({
  iframeErrors, onFixError, onClearErrors, onApplyPatch, vfsFiles, isFixing,
}) => {
  const [taskInput, setTaskInput] = useState('');
  const [session, setSession] = useState<DebugSession | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticSnapshot>(() => diagnosticsAggregator.getSnapshot());
  const [patchSets, setPatchSets] = useState<PatchSet[]>([]);
  const [pendingCommands, setPendingCommands] = useState<CommandSpec[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeChannel, setActiveChannel] = useState<DiagnosticChannel | null>(null);

  useEffect(() => {
    const unsubs = [
      debugAgentService.subscribe(setSession),
      diagnosticsAggregator.subscribe(setDiagnostics),
      workspacePatchEngine.subscribe(setPatchSets),
      terminalOrchestrator.subscribe((history) => {
        setPendingCommands(history.filter(c => c.status === 'pending'));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    if (iframeErrors.length > 0) diagnosticsAggregator.ingestIframeErrors(iframeErrors);
  }, [iframeErrors]);

  const handleStartSession = useCallback(() => {
    if (!taskInput.trim()) return;
    const newSession = debugAgentService.startSession({
      task: taskInput.trim(),
      goal: 'Analyze, debug, and fix the described issue',
      mode: 'debug-agent',
    });
    if (vfsFiles) {
      const fileTree = Object.keys(vfsFiles);
      debugAgentService.gatherContext(newSession.id, vfsFiles, fileTree);
      debugAgentService.runSecurityReview(newSession.id, vfsFiles);
      debugAgentService.validateUnisonIntegrity(newSession.id, vfsFiles);
    }
    setTaskInput('');
    setIsRunning(true);
  }, [taskInput, vfsFiles]);

  const handleApplyPatch = useCallback((patchSetId: string) => {
    const files = workspacePatchEngine.getAcceptedFiles(patchSetId);
    if (files && onApplyPatch) {
      onApplyPatch(files);
      workspacePatchEngine.markApplied(patchSetId);
    }
  }, [onApplyPatch]);

  const activePatchSet = useMemo(() => {
    if (session?.activePatchSetId) return workspacePatchEngine.getPatchSet(session.activePatchSetId);
    return patchSets[0];
  }, [session, patchSets]);

  const filteredDiagnostics = useMemo(() => {
    if (!activeChannel) return diagnostics.diagnostics.slice(0, 15);
    return diagnostics.diagnostics.filter(d => d.channel === activeChannel).slice(0, 20);
  }, [diagnostics, activeChannel]);

  const verificationBadge = useMemo(() => {
    if (!session?.verificationStatus) return null;
    const map = {
      'fixed': { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: '✓ Fixed' },
      'partially-fixed': { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: '◐ Partial' },
      'blocked': { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: '✗ Blocked' },
      'unknown': { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: '? Unknown' },
    };
    const s = map[session.verificationStatus];
    return <Badge variant="outline" className={`${s.color} text-[10px]`}>{s.label}</Badge>;
  }, [session]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0f1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
          <span className="text-sm font-bold text-amber-400 font-mono">Debug Agent</span>
          {diagnostics.errorCount > 0 && (
            <Badge variant="destructive" className="h-4 text-[9px] px-1.5 animate-pulse">
              {diagnostics.errorCount}
            </Badge>
          )}
          {verificationBadge}
        </div>
        <div className="flex items-center gap-1">
          {session && (
            <span className="text-[9px] text-foreground/30 font-mono">
              iter {session.iteration}/{session.maxIterations}
            </span>
          )}
          {iframeErrors.length > 0 && onClearErrors && (
            <Button size="sm" variant="ghost" onClick={onClearErrors} className="h-6 text-[10px] text-foreground/40 hover:text-foreground/60">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* 5-Channel Health Bar */}
      <ChannelHealthBar
        channels={diagnostics.channels}
        activeChannel={activeChannel}
        onSelect={setActiveChannel}
      />

      {/* Quick actions toolbar */}
      <div className="px-3 py-1.5 border-b border-white/5 flex gap-1 flex-wrap">
        {[
          { label: 'Typecheck', icon: CheckCircle2, cmd: 'tsc --noEmit' },
          { label: 'Lint', icon: Search, cmd: 'npx eslint src/' },
          { label: 'Test', icon: Play, cmd: 'npx vitest --run' },
          { label: 'Build', icon: Zap, cmd: 'npx vite build' },
          { label: 'Security', icon: Shield, cmd: '__security_scan__' },
        ].map(({ label, icon: Icon, cmd }) => (
          <button
            key={label}
            onClick={() => {
              if (cmd === '__security_scan__' && vfsFiles) {
                const s = session ?? debugAgentService.startSession({ task: 'Security scan', goal: 'Find vulnerabilities', mode: 'debug-agent' });
                debugAgentService.runSecurityReview(s.id, vfsFiles);
              } else {
                terminalOrchestrator.propose(cmd, `Run ${label.toLowerCase()}`, { expectedResult: 'Pass with no errors' });
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-foreground/50 hover:text-foreground/80 hover:bg-white/5 border border-white/5 transition-all"
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">

          {/* Section: Issue */}
          <section>
            <h3 className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider mb-1.5">Issue</h3>
            {!session ? (
              <div className="space-y-2">
                <Textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="Describe the issue, edit task, or what to debug..."
                  className="min-h-[60px] max-h-[100px] bg-black/40 border-white/10 text-sm resize-none text-foreground/80 placeholder:text-foreground/20 focus:border-amber-400/50"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStartSession(); } }}
                />
                <Button
                  size="sm"
                  onClick={handleStartSession}
                  disabled={!taskInput.trim() || isFixing}
                  className="w-full gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  <Bot className="w-3 h-3" />
                  Start Debug Agent
                </Button>
              </div>
            ) : (
              <div className="p-2 bg-black/20 border border-white/10 rounded">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">{session.mode}</Badge>
                  <Badge variant="outline" className={cn(
                    'text-[9px]',
                    session.status === 'running' && 'border-blue-500/30 text-blue-400',
                    session.status === 'completed' && 'border-green-500/30 text-green-400',
                    session.status === 'failed' && 'border-red-500/30 text-red-400',
                  )}>
                    {session.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground/60 mt-1">{session.task}</p>
                <Button size="sm" variant="ghost" onClick={() => { debugAgentService.completeSession(session.id); setIsRunning(false); }}
                  className="h-6 text-[10px] text-foreground/40 hover:text-foreground/60 mt-1">
                  <RotateCcw className="w-3 h-3 mr-1" /> New Session
                </Button>
              </div>
            )}
          </section>

          {/* Section: Diagnostics — grouped by channel */}
          <section>
            <h3 className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              {activeChannel ? `${CHANNEL_META[activeChannel].label} Diagnostics` : 'All Diagnostics'}
              <span className="text-foreground/20">
                {diagnostics.errorCount}E / {diagnostics.warningCount}W
              </span>
            </h3>
            <div className="space-y-1">
              {filteredDiagnostics.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 text-green-500/30 mx-auto mb-1" />
                  <p className="text-[11px] text-foreground/30 font-mono">
                    {activeChannel ? `${CHANNEL_META[activeChannel].label}: No issues` : 'No issues detected'}
                  </p>
                </div>
              ) : (
                filteredDiagnostics.map(d => <DiagnosticItem key={d.id} diag={d} />)
              )}
              {!activeChannel && diagnostics.diagnostics.length > 15 && (
                <p className="text-[9px] text-foreground/20 text-center font-mono">
                  +{diagnostics.diagnostics.length - 15} more
                </p>
              )}
            </div>
          </section>

          {/* Section: Agent Steps */}
          {session && session.steps.length > 0 && (
            <section>
              <h3 className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider mb-1.5">Agent Steps</h3>
              <div className="space-y-0">
                {session.steps.map((step, i) => (
                  <StepItem key={step.id} step={step} isLast={i === session.steps.length - 1} />
                ))}
              </div>
            </section>
          )}

          {/* Section: Command Approval */}
          {pendingCommands.length > 0 && (
            <section>
              <h3 className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider mb-1.5">Commands</h3>
              <CommandApproval
                commands={pendingCommands}
                onApprove={(id) => terminalOrchestrator.approve(id)}
                onReject={(id) => terminalOrchestrator.reject(id)}
              />
            </section>
          )}

          {/* Section: Proposed Changes */}
          {activePatchSet && activePatchSet.status !== 'applied' && (
            <section>
              <h3 className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider mb-1.5">Proposed Changes</h3>
              <PatchReview
                patchSet={activePatchSet}
                onAcceptAll={() => workspacePatchEngine.acceptAll(activePatchSet.id)}
                onRejectAll={() => {
                  for (const p of activePatchSet.patches) {
                    if (p.status === 'pending') workspacePatchEngine.rejectPatch(activePatchSet.id, p.id);
                  }
                }}
                onAcceptPatch={(patchId) => workspacePatchEngine.acceptPatch(activePatchSet.id, patchId)}
                onRejectPatch={(patchId) => workspacePatchEngine.rejectPatch(activePatchSet.id, patchId)}
                onApply={() => handleApplyPatch(activePatchSet.id)}
              />
            </section>
          )}

          {/* Section: Verification */}
          {session && session.status === 'completed' && (
            <section>
              <h3 className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider mb-1.5">Verification</h3>
              <div className="p-2 bg-black/20 border border-white/10 rounded space-y-1">
                {diagnostics.channels.map(ch => {
                  const meta = CHANNEL_META[ch.channel];
                  const Icon = meta.icon;
                  return (
                    <div key={ch.channel} className="flex items-center justify-between">
                      <span className={cn('text-[10px] font-mono flex items-center gap-1', meta.color)}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                      <Badge variant="outline" className={cn(
                        'text-[9px]',
                        ch.status === 'healthy' && 'border-green-500/30 text-green-400',
                        ch.status === 'warning' && 'border-amber-500/30 text-amber-400',
                        ch.status === 'error' && 'border-red-500/30 text-red-400',
                      )}>
                        {ch.status === 'healthy' ? 'Clean' : `${ch.errorCount}E ${ch.warningCount}W`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Legacy quick-fix for preview errors without session */}
          {!session && iframeErrors.length > 0 && (
            <section>
              <h3 className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider mb-1.5">Preview Errors</h3>
              <div className="space-y-2">
                {iframeErrors.map((error, i) => (
                  <div key={`${error.timestamp.getTime()}-${i}`} className="p-2 bg-red-500/5 border border-red-500/20 rounded">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400">{error.type}</Badge>
                        <p className="text-[11px] text-foreground/60 mt-0.5">{error.message}</p>
                      </div>
                    </div>
                    {onFixError && (
                      <Button size="sm" onClick={() => onFixError(error)} disabled={isFixing}
                        className="mt-1.5 w-full gap-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px]">
                        {isFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Auto-Fix
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DebugAgentPanel;
