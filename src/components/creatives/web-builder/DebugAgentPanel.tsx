/**
 * DebugAgentPanel — Chat-style unified Debug Agent
 * Single agent chatbox for all debug/edit/lint/test/security tasks.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bug, Bot, Send, Loader2, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronRight, FileCode, Terminal,
  Play, RotateCcw, Eye, Check, X, Sparkles, Zap,
  Search, FolderOpen, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { debugAgentService, type DebugSession, type AgentStep } from '@/services/debugAgentService';
import { diagnosticsAggregator } from '@/services/diagnosticsAggregator';
import { workspacePatchEngine, type PatchSet } from '@/services/workspacePatchEngine';
import { terminalOrchestrator, type CommandSpec } from '@/services/terminalOrchestrator';

export interface DebugAgentPanelProps {
  iframeErrors: Array<{ type: string; message: string; stack?: string; file?: string; line?: number; column?: number; timestamp: Date }>;
  onFixError?: (error: any) => void;
  onClearErrors?: () => void;
  onApplyPatch?: (files: Record<string, string>) => void;
  vfsFiles?: Record<string, string> | null;
  isFixing?: boolean;
}

// ── Step renderer ──────────────────────────────────────────────────────────────

const StepBubble: React.FC<{ step: AgentStep; isLast: boolean }> = ({ step, isLast }) => {
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
    <div className="flex items-start gap-2 group">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {iconMap[step.type] || <Zap className="w-3 h-3" />}
        </div>
        {!isLast && <div className="w-px h-full min-h-[8px] bg-white/10" />}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div
          className={cn(
            'px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5',
            step.type === 'error' && 'border-red-500/20 bg-red-500/5',
            step.type === 'complete' && 'border-green-500/20 bg-green-500/5',
          )}
        >
          <button
            onClick={() => step.details && setExpanded(!expanded)}
            className="flex items-center gap-1.5 w-full text-left"
          >
            <span className="text-[11px] text-foreground/70 font-mono leading-snug flex-1">{step.message}</span>
            {step.details && (
              expanded ? <ChevronDown className="w-3 h-3 text-foreground/30 shrink-0" /> : <ChevronRight className="w-3 h-3 text-foreground/30 shrink-0" />
            )}
          </button>
          {expanded && step.details && (
            <pre className="mt-2 px-2 py-1.5 bg-black/40 border border-white/5 rounded text-[9px] text-foreground/40 font-mono overflow-x-auto max-h-32 whitespace-pre-wrap">
              {step.details}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Inline patch review ────────────────────────────────────────────────────────

const InlinePatchReview: React.FC<{
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
    <div className="space-y-1.5 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-foreground/50 font-mono">
          {patchSet.patches.length} file{patchSet.patches.length !== 1 ? 's' : ''} changed
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onAcceptAll} className="h-5 text-[9px] text-green-400 hover:bg-green-500/10 px-1.5">
            <Check className="w-3 h-3 mr-0.5" /> Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={onRejectAll} className="h-5 text-[9px] text-red-400 hover:bg-red-500/10 px-1.5">
            <X className="w-3 h-3 mr-0.5" /> Reject
          </Button>
        </div>
      </div>
      {patchSet.patches.map(patch => (
        <div key={patch.id} className={cn(
          'border rounded overflow-hidden',
          patch.status === 'accepted' && 'border-green-500/30 bg-green-500/5',
          patch.status === 'rejected' && 'border-red-500/30 bg-red-500/5 opacity-50',
          patch.status === 'pending' && 'border-white/10 bg-black/20',
          patch.status === 'applied' && 'border-blue-500/30 bg-blue-500/5',
        )}>
          <button
            className="w-full flex items-center gap-2 px-2 py-1 text-left"
            onClick={() => setExpandedPatch(expandedPatch === patch.id ? null : patch.id)}
          >
            <Badge variant="outline" className={cn(
              'text-[8px] h-3.5',
              patch.operation === 'create' && 'border-green-500/30 text-green-400',
              patch.operation === 'update' && 'border-blue-500/30 text-blue-400',
              patch.operation === 'delete' && 'border-red-500/30 text-red-400',
            )}>
              {patch.operation}
            </Badge>
            <span className="text-[10px] text-foreground/70 font-mono truncate flex-1">{patch.path}</span>
            <span className="text-[8px] text-green-400/60">+{patch.linesAdded}</span>
            <span className="text-[8px] text-red-400/60">-{patch.linesRemoved}</span>
            {patch.status === 'pending' && (
              <div className="flex gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); onAcceptPatch(patch.id); }}
                  className="w-4 h-4 rounded flex items-center justify-center hover:bg-green-500/20 text-green-400">
                  <Check className="w-2.5 h-2.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onRejectPatch(patch.id); }}
                  className="w-4 h-4 rounded flex items-center justify-center hover:bg-red-500/20 text-red-400">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </button>
          {expandedPatch === patch.id && patch.diff && (
            <pre className="px-2 py-1 bg-black/60 text-[9px] font-mono overflow-x-auto max-h-40 border-t border-white/5">
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
        </div>
      ))}
      {hasAccepted && (
        <Button size="sm" onClick={onApply} className="w-full gap-1 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] h-7">
          <Play className="w-3 h-3" /> Apply Changes
        </Button>
      )}
    </div>
  );
};

// ── Command approval inline ────────────────────────────────────────────────────

const InlineCommandApproval: React.FC<{
  commands: CommandSpec[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ commands, onApprove, onReject }) => {
  if (commands.length === 0) return null;
  return (
    <div className="px-3 py-2 space-y-1.5">
      {commands.map(cmd => (
        <div key={cmd.id} className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded">
          <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <code className="text-[10px] text-amber-200 font-mono">{cmd.command} {cmd.args.join(' ')}</code>
            <p className="text-[8px] text-amber-400/50 mt-0.5">{cmd.rationale}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onApprove(cmd.id)} className="w-5 h-5 rounded flex items-center justify-center bg-green-500/20 hover:bg-green-500/30 text-green-400">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => onReject(cmd.id)} className="w-5 h-5 rounded flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const DebugAgentPanel: React.FC<DebugAgentPanelProps> = ({
  iframeErrors, onFixError, onClearErrors, onApplyPatch, vfsFiles, isFixing,
}) => {
  const [input, setInput] = useState('');
  const [session, setSession] = useState<DebugSession | null>(null);
  const [patchSets, setPatchSets] = useState<PatchSet[]>([]);
  const [pendingCommands, setPendingCommands] = useState<CommandSpec[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubs = [
      debugAgentService.subscribe(setSession),
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

  // Auto-scroll to bottom on new steps
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [session?.steps.length, pendingCommands.length, patchSets.length]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const newSession = debugAgentService.startSession({
      task: input.trim(),
      goal: 'Analyze, debug, and fix the described issue',
      mode: 'debug-agent',
    });
    if (vfsFiles) {
      debugAgentService.gatherContext(newSession.id, vfsFiles, Object.keys(vfsFiles));
      debugAgentService.runSecurityReview(newSession.id, vfsFiles);
      debugAgentService.validateUnisonIntegrity(newSession.id, vfsFiles);
    }
    setInput('');
  }, [input, vfsFiles]);

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

  const handleReset = useCallback(() => {
    if (session) debugAgentService.completeSession(session.id);
  }, [session]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0f1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20 shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
          <span className="text-sm font-bold text-amber-400 font-mono">Debug Agent</span>
          {session && (
            <Badge variant="outline" className={cn(
              'text-[9px] h-4',
              session.status === 'running' && 'border-blue-500/30 text-blue-400',
              session.status === 'completed' && 'border-green-500/30 text-green-400',
              session.status === 'failed' && 'border-red-500/30 text-red-400',
            )}>
              {session.status}
            </Badge>
          )}
        </div>
        {session && (
          <button onClick={handleReset} className="text-foreground/30 hover:text-foreground/60 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Chat area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-1">
          {/* Empty state */}
          {!session && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="w-10 h-10 text-amber-400/20 mb-3" />
              <p className="text-[12px] text-foreground/30 font-mono max-w-[220px]">
                Describe a bug, request an edit, or ask to lint/test/typecheck your project.
              </p>
            </div>
          )}

          {/* Session task bubble (user message) */}
          {session && (
            <div className="flex justify-end mb-3">
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-[85%]">
                <p className="text-[11px] text-amber-200/80 font-mono leading-snug">{session.task}</p>
              </div>
            </div>
          )}

          {/* Agent steps as chat bubbles */}
          {session?.steps.map((step, i) => (
            <StepBubble key={step.id} step={step} isLast={i === session.steps.length - 1 && !activePatchSet && pendingCommands.length === 0} />
          ))}

          {/* Command approvals inline in chat */}
          {pendingCommands.length > 0 && (
            <InlineCommandApproval
              commands={pendingCommands}
              onApprove={(id) => terminalOrchestrator.approve(id)}
              onReject={(id) => terminalOrchestrator.reject(id)}
            />
          )}

          {/* Patch review inline in chat */}
          {activePatchSet && activePatchSet.status !== 'applied' && (
            <InlinePatchReview
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
          )}
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="shrink-0 border-t border-white/10 px-3 py-2 bg-black/30">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={session ? 'Follow-up or new task...' : 'Debug, edit, lint, test, typecheck...'}
            className="flex-1 bg-transparent text-sm text-foreground/80 placeholder:text-foreground/20 font-mono outline-none"
            disabled={isFixing}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isFixing}
            className="h-7 w-7 p-0 bg-amber-500 hover:bg-amber-400 text-black shrink-0"
          >
            {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DebugAgentPanel;
