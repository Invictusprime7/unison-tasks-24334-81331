/**
 * AIBuilderPanel - Enhanced AI interface for Web Builder
 * 
 * Features:
 * - Static left side panel (always visible when builder opens)
 * - Cascade output showing AI thinking process
 * - "View Edits" button to redirect to VFS changes
 * - Two tabs only: Code and Debug
 * - Debug tab for iframe error handling with Supabase access
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Code2,
  Bug,
  Send,
  Sparkles,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  Database,
  FileCode,
  Trash2,
  Copy,
  Play,
  ExternalLink,
  Brain,
  Zap,
  Paperclip,
  ImageIcon,
  FileText,
  FileCode2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BusinessSystemType } from '@/data/templates/types';
import type { SystemsBuildContext } from '@/types/systemsBuildContext';
import { generateLibraryPrompt } from '@/data/siteElementsLibrary';
import { analyzeReactSite, resolveEditTarget } from '@/utils/reactSiteAnalysis';
import { htmlDocToReactComponent as htmlDocToReactComponentFn } from '@/utils/htmlToJsx';

// ============================================================================
/**
 * Strip module.exports blocks using brace-counting so nested objects are fully removed.
 * Also strips leading comment lines (e.g. "// tailwind.config.js") before the block.
 */
function stripModuleExportsBlocks(code: string): string {
  // First strip comment-prefixed config sections
  code = code.replace(/(?:\/\/[^\n]*(?:tailwind|config)[^\n]*\n)+/gi, (match, offset) => {
    // Only strip if followed by module.exports
    const after = code.slice(offset + match.length).trimStart();
    return after.startsWith('module.exports') ? '' : match;
  });

  let result = code;
  let safetyCounter = 0;
  while (safetyCounter++ < 5) {
    const idx = result.indexOf('module.exports');
    if (idx === -1) break;

    // Find the opening brace
    const braceStart = result.indexOf('{', idx);
    if (braceStart === -1) {
      result = result.slice(0, idx) + result.slice(result.indexOf('\n', idx) + 1);
      continue;
    }

    // Count braces to find matching close
    let depth = 0;
    let end = braceStart;
    for (; end < result.length; end++) {
      if (result[end] === '{') depth++;
      else if (result[end] === '}') { depth--; if (depth === 0) break; }
    }

    let removeEnd = end + 1;
    if (result[removeEnd] === ';') removeEnd++;
    while (result[removeEnd] === '\n' || result[removeEnd] === '\r') removeEnd++;

    result = result.slice(0, idx) + result.slice(removeEnd);
  }

  return result.trim();
}

/**
 * Strip inline backtick code references from AI reasoning text.
 * Converts "`<style>`" → "STYLE_TAG" etc. to prevent HTML tag matching in reasoning.
 */
function stripInlineCodeRefs(content: string): string {
  return content.replace(/`[^`]*`/g, 'CODE_REF');
}

/**
 * Extract HTML from AI response that mixes reasoning text with raw HTML.
 * Handles cases like: "I will generate...<!DOCTYPE html><html>...</html>"
 * Returns the extracted HTML or null if no HTML found.
 * 
 * IMPORTANT: Ignores HTML tags mentioned inside backtick code references
 * in reasoning text (e.g. "`<html>`", "`<style>`").
 */
function extractRawHtmlFromMixed(content: string): string | null {
  // Strip inline code refs so `<html>` in reasoning doesn't trigger false match
  const cleaned = stripInlineCodeRefs(content);

  // Case 1: Content contains <!DOCTYPE html> — extract everything from there
  const doctypeIdx = cleaned.indexOf('<!DOCTYPE');
  if (doctypeIdx >= 0) {
    // Use the index from cleaned to slice from the ORIGINAL content
    const originalDoctypeIdx = content.indexOf('<!DOCTYPE', Math.max(0, doctypeIdx - 50));
    if (originalDoctypeIdx >= 0) {
      return content.slice(originalDoctypeIdx).trim();
    }
  }
  
  // Case 2: Content contains <html — but only if it looks like an actual tag (not inside prose)
  // Match <html followed by > or whitespace+attributes, NOT inside backticks
  const htmlTagRegex = /<html[\s>]/gi;
  let match: RegExpExecArray | null;
  while ((match = htmlTagRegex.exec(cleaned)) !== null) {
    // Find the corresponding position in original content
    const originalIdx = content.indexOf('<html', Math.max(0, match.index - 50));
    if (originalIdx >= 0) {
      const extracted = content.slice(originalIdx).trim();
      if (extracted.includes('</html>')) return extracted;
    }
  }
  
  return null;
}

/**
 * Convert raw HTML into a proper React component with native JSX.
 */
function wrapHtmlInReactComponent(html: string): string {
  return htmlDocToReactComponentFn(html, 'App');
}

// Types
// ============================================================================

interface ThinkingStep {
  id: string;
  type: 'analyzing' | 'planning' | 'generating' | 'validating' | 'complete' | 'error' | 'reasoning';
  message: string;
  timestamp: Date;
  details?: string;
  isExpanded?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinking?: ThinkingStep[];
  /** Raw extended-thinking text returned by Claude Sonnet 4.6 */
  claudeReasoning?: string;
  code?: string;
  edits?: VFSEdit[];
  error?: IframeError;
  isStreaming?: boolean;
}

export interface VFSEdit {
  path: string;
  type: 'create' | 'modify' | 'delete';
  linesChanged?: number;
  preview?: string;
}

export interface IframeError {
  type: 'runtime' | 'syntax' | 'network' | 'supabase';
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: Date;
}

interface AIBuilderPanelProps {
  currentCode?: string;
  systemType?: BusinessSystemType | null;
  templateName?: string | null;
  onCodeGenerated?: (code: string) => void;
  onFilesPatch?: (files: Record<string, string>) => boolean;
  onViewEdits?: (edits: VFSEdit[]) => void;
  iframeErrors?: IframeError[];
  onClearErrors?: () => void;
  onClose?: () => void;
  className?: string;
  /** User's design profile for personalised AI generation */
  userDesignProfile?: {
    projectCount?: number;
    dominantStyle?: 'dark' | 'light' | 'colorful' | 'minimal' | 'mixed';
    industryHints?: string[];
  } | null;
  /** Structural summary of the current page (sections, elements) */
  pageStructureContext?: string | null;
  /** Current backend / Supabase integration state */
  backendStateContext?: string | null;
  /** Real business data (products, services, hours, etc.) */
  businessDataContext?: string | null;
  /** Structured business blueprint from systems-build (brand, palette, intents, sections) */
  systemsBuildContext?: SystemsBuildContext | null;
  /** Current VFS file list + dependency summary for AI awareness */
  vfsContext?: string | null;
  /** Full VFS file map for component-level site analysis */
  vfsFiles?: Record<string, string> | null;
  /** Direct VFS apply callback — bypasses legacy onCodeGenerated pipeline, uses AI→VFS orchestrator */
  onApplyToVFS?: (files: Record<string, string>) => void;
}

// ============================================================================
// Dropped File Type
// ============================================================================

interface DroppedFile {
  id: string;
  name: string;
  type: 'image' | 'text' | 'code' | 'other';
  /** Data URL for images, raw text for text/code */
  preview?: string;
  /** Full text content for text/code files */
  content?: string;
  size: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============================================================================
// Thinking Step Component
// ============================================================================

const ThinkingStepItem: React.FC<{
  step: ThinkingStep;
  isLast: boolean;
  onToggle: () => void;
}> = ({ step, isLast, onToggle }) => {
  const icons = {
    analyzing: <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />,
    planning: <FileCode className="w-3 h-3 text-sky-400" />,
    generating: <Code2 className="w-3 h-3 text-blue-400 animate-pulse" />,
    validating: <CheckCircle2 className="w-3 h-3 text-sky-400" />,
    complete: <CheckCircle2 className="w-3 h-3 text-blue-400" />,
    error: <XCircle className="w-3 h-3 text-red-400" />,
    reasoning: <Brain className="w-3 h-3 text-violet-400" />,
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <div className="flex flex-col items-center">
        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          {icons[step.type]}
        </div>
        {!isLast && <div className="w-px h-4 bg-blue-500/20" />}
      </div>
      <div className="flex-1 min-w-0">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs text-blue-400/70 hover:text-blue-400 transition-colors w-full text-left"
        >
          {step.details && (
            step.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          )}
          <span className="truncate font-mono">{step.message}</span>
          <span className="text-blue-400/30 text-[10px] ml-auto font-mono">{formatTimestamp(step.timestamp)}</span>
        </button>
        {step.isExpanded && step.details && (
          <pre className="mt-1 p-2 bg-black/40 border border-blue-500/20 rounded text-[10px] text-blue-400/50 overflow-x-auto font-mono">
            {step.details}
          </pre>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Message Component with Cascade Thinking
// ============================================================================

const MessageItem: React.FC<{
  message: Message;
  onViewEdits?: (edits: VFSEdit[]) => void;
  onRetryError?: (error: IframeError) => void;
}> = ({ message, onViewEdits, onRetryError }) => {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>(message.thinking || []);
  const [showThinking, setShowThinking] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const toggleStep = (stepId: string) => {
    setThinkingSteps(prev =>
      prev.map(s => s.id === stepId ? { ...s, isExpanded: !s.isExpanded } : s)
    );
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
      <div className="max-w-[85%] bg-sky-500/20 border border-sky-500/30 rounded-lg px-3 py-2">
          <p className="text-sm text-sky-100">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.role === 'system') {
    return (
      <div className="flex justify-center mb-3">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
          <p className="text-xs text-blue-400/70 font-mono">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message with cascade thinking
  return (
    <div className="mb-4">
      {/* AI Extended Reasoning — shown for all models when thinking tags are present */}
      {message.claudeReasoning && (
        <div className="mb-2 rounded-lg border border-violet-500/30 bg-violet-950/30 overflow-hidden">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-violet-300/80 hover:text-violet-200 transition-colors font-mono"
          >
            {showReasoning ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Brain className="w-3 h-3 text-violet-400" />
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="font-semibold">AI Reasoning</span>
            <span className="ml-auto text-violet-400/40 text-[10px]">{message.claudeReasoning.length.toLocaleString()} chars</span>
          </button>
          {showReasoning && (
            <div className="px-3 pb-3">
              <div className="text-[10px] text-violet-300/40 font-mono mb-1 uppercase tracking-widest">Extended Reasoning · Internal Thought Process</div>
              <pre className="text-[11px] text-violet-100/70 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto rounded bg-black/30 p-2 border border-violet-500/10">
                {message.claudeReasoning}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Thinking Process (collapsible cascade) */}
      {thinkingSteps.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-1 text-xs text-blue-400/50 hover:text-blue-400/70 transition-colors mb-1 font-mono"
          >
            {showThinking ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>AI Thinking ({thinkingSteps.length} steps)</span>
          </button>
          {showThinking && (
            <div className="ml-2 pl-2 border-l border-blue-500/20">
              {thinkingSteps.map((step, i) => (
                <ThinkingStepItem
                  key={step.id}
                  step={step}
                  isLast={i === thinkingSteps.length - 1}
                  onToggle={() => toggleStep(step.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main message content */}
      <div className="bg-black/40 border border-blue-500/20 rounded-lg px-3 py-2">
        {message.isStreaming && (
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            <span className="text-xs text-blue-400/50 font-mono">Generating...</span>
          </div>
        )}
        <p className="text-sm text-blue-100/90 whitespace-pre-wrap">{message.content}</p>

        {/* View Edits Button */}
        {message.edits && message.edits.length > 0 && onViewEdits && (
          <div className="mt-3 pt-2 border-t border-blue-500/20">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewEdits(message.edits!)}
              className="gap-2 bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20 hover:shadow-[0_0_10px_rgba(56,189,248,0.3)]"
            >
              <Eye className="w-3 h-3" />
              View Edits ({message.edits.length} file{message.edits.length > 1 ? 's' : ''})
              <ExternalLink className="w-3 h-3" />
            </Button>
            <div className="mt-2 space-y-1">
              {message.edits.map((edit, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-blue-400/50 font-mono">
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-1",
                    edit.type === 'create' && "border-blue-500/50 text-blue-400",
                    edit.type === 'modify' && "border-sky-500/50 text-sky-400",
                    edit.type === 'delete' && "border-red-500/50 text-red-400"
                  )}>
                    {edit.type}
                  </Badge>
                  <span className="truncate">{edit.path}</span>
                  {edit.linesChanged && (
                    <span className="text-blue-400/30">+{edit.linesChanged} lines</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code is auto-applied to VFS — no manual "Apply" button needed */}

        {/* Error with retry */}
        {message.error && onRetryError && (
          <div className="mt-3 pt-2 border-t border-red-500/20">
            <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-red-300 font-medium">{message.error.type} error</p>
                <p className="text-xs text-red-400/80 truncate">{message.error.message}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRetryError(message.error!)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Debug Panel Component
// ============================================================================

const DebugPanel: React.FC<{
  errors: IframeError[];
  onFixError: (error: IframeError) => void;
  onClearErrors?: () => void;
  isFixing: boolean;
}> = ({ errors, onFixError, onClearErrors, isFixing }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Debug Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-fuchsia-500/20 bg-[#0a0f1e]">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]" />
          <span className="text-sm font-bold text-fuchsia-400 font-mono">
            {errors.length} Error{errors.length !== 1 ? 's' : ''}
          </span>
        </div>
        {errors.length > 0 && onClearErrors && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearErrors}
            className="h-7 text-xs text-fuchsia-400/50 hover:text-fuchsia-400 hover:bg-fuchsia-500/10"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Error List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {errors.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-blue-500/50 mx-auto mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
              <p className="text-sm text-blue-400/60 font-mono">No errors detected</p>
              <p className="text-xs text-blue-400/30 mt-1 font-mono">Errors from the preview will appear here</p>
            </div>
          ) : (
            errors.map((error, i) => (
              <div
                key={`${error.timestamp.getTime()}-${i}`}
                className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center shrink-0",
                    error.type === 'runtime' && "bg-red-500/20",
                    error.type === 'syntax' && "bg-orange-500/20",
                    error.type === 'network' && "bg-yellow-500/20",
                    error.type === 'supabase' && "bg-fuchsia-500/20"
                  )}>
                    {error.type === 'supabase' ? (
                      <Database className="w-3 h-3 text-fuchsia-400" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-fuchsia-500/30 text-fuchsia-400">
                        {error.type}
                      </Badge>
                      {error.file && (
                        <span className="text-[10px] text-fuchsia-400/40 font-mono truncate">
                          {error.file}
                          {error.line && `:${error.line}`}
                          {error.column && `:${error.column}`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-fuchsia-100/80 mt-1">{error.message}</p>
                    {error.stack && (
                      <pre className="mt-2 p-2 bg-black/40 border border-fuchsia-500/10 rounded text-[10px] text-fuchsia-400/40 overflow-x-auto max-h-20 font-mono">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => onFixError(error)}
                    disabled={isFixing}
                    className="gap-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-black font-bold shadow-[0_0_15px_rgba(255,0,255,0.4)] hover:shadow-[0_0_20px_rgba(255,0,255,0.6)] transition-all duration-200"
                  >
                    {isFixing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    Auto-Fix with AI
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Supabase CLI Access Info */}
      <div className="px-3 py-2 border-t border-blue-500/20 bg-[#0a0f1e]">
        <div className="flex items-center gap-2 text-xs text-blue-400/40 font-mono">
          <Database className="w-3 h-3" />
          <span>Backend CLI access enabled</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AIBuilderPanel: React.FC<AIBuilderPanelProps> = ({
  currentCode,
  systemType,
  templateName,
  onCodeGenerated,
  onFilesPatch,
  onViewEdits,
  iframeErrors = [],
  onClearErrors,
  onClose,
  className,
  userDesignProfile,
  pageStructureContext,
  backendStateContext,
  businessDataContext,
  systemsBuildContext,
  vfsContext,
  vfsFiles,
  onApplyToVFS,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'debug'>('code');
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File processing helpers ───────────────────────────────────────────────
  const classifyFile = (file: File): DroppedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md', '.py', '.sql'];
    if (codeExts.some(ext => file.name.endsWith(ext))) return 'code';
    if (file.type.startsWith('text/')) return 'text';
    return 'other';
  };

  const processFile = useCallback((file: File): Promise<DroppedFile> => {
    return new Promise((resolve) => {
      const id = generateId();
      const fileType = classifyFile(file);
      if (fileType === 'image') {
        const reader = new FileReader();
        reader.onload = () => resolve({ id, name: file.name, type: 'image', preview: reader.result as string, size: file.size });
        reader.onerror = () => resolve({ id, name: file.name, type: 'image', size: file.size });
        reader.readAsDataURL(file);
      } else if (fileType === 'text' || fileType === 'code') {
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          resolve({ id, name: file.name, type: fileType, content: text, preview: text.slice(0, 500), size: file.size });
        };
        reader.onerror = () => resolve({ id, name: file.name, type: fileType, size: file.size });
        reader.readAsText(file);
      } else {
        resolve({ id, name: file.name, type: 'other', size: file.size });
      }
    });
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 5); // max 5 files
    const processed = await Promise.all(arr.map(processFile));
    setDroppedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = processed.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles].slice(0, 5);
    });
  }, [processFile]);

  const removeFile = useCallback((id: string) => {
    setDroppedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Drag-and-drop handlers for the input zone
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      await addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: `👋 Welcome to the AI Builder!\n\nI can help you:\n• Generate and modify code\n• Fix errors in your preview\n• Debug Supabase integrations\n\nJust describe what you want to build or switch to Debug tab to fix errors.`,
        timestamp: new Date(),
        thinking: [
          { id: '1', type: 'complete', message: 'Ready to assist', timestamp: new Date() }
        ],
      }]);
    }
  }, [messages.length]);

  // Simulate thinking steps for AI response
  const simulateThinking = useCallback(async (userPrompt: string): Promise<ThinkingStep[]> => {
    const steps: ThinkingStep[] = [];
    
    steps.push({
      id: generateId(),
      type: 'analyzing',
      message: 'Analyzing request...',
      timestamp: new Date(),
      details: `User prompt: "${userPrompt.substring(0, 100)}${userPrompt.length > 100 ? '...' : ''}"`,
    });

    await new Promise(r => setTimeout(r, 300));
    
    steps.push({
      id: generateId(),
      type: 'planning',
      message: 'Planning changes...',
      timestamp: new Date(),
      details: currentCode ? `Current template: ${currentCode.length} chars` : 'No existing template',
    });

    await new Promise(r => setTimeout(r, 400));
    
    steps.push({
      id: generateId(),
      type: 'generating',
      message: 'Generating code...',
      timestamp: new Date(),
    });

    return steps;
  }, [currentCode]);

  // Send message to AI
  const handleSend = async () => {
    if ((!input.trim() && droppedFiles.length === 0) || isLoading) return;

    // Build file context suffix
    const fileContext = droppedFiles.length > 0 ? (() => {
      const parts: string[] = [];
      for (const f of droppedFiles) {
        if (f.type === 'image') {
          parts.push(`\n\n[Attached image: ${f.name} — apply relevant visuals/style from this image to the design]`);
        } else if (f.content) {
          parts.push(`\n\n[Attached file: ${f.name}]\n\`\`\`\n${f.content.slice(0, 4000)}${f.content.length > 4000 ? '\n// ...truncated...' : ''}\n\`\`\``);
        }
      }
      return parts.join('');
    })() : '';

    // Build attachments for the edge function
    const attachments = droppedFiles
      .filter(f => f.type === 'image' && f.preview)
      .map(f => ({ name: f.name, type: 'image', data: f.preview! }));

    const userContent = input.trim() || `Analyse the attached file${droppedFiles.length > 1 ? 's' : ''} and incorporate them into the design.`;
    const displayContent = userContent + (droppedFiles.length > 0 ? `\n📎 ${droppedFiles.length} file${droppedFiles.length > 1 ? 's' : ''} attached` : '');

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: displayContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setDroppedFiles([]);
    setIsLoading(true);

    // Keep fileContext & attachments in closure for the rest of handleSend
    const _fileContext = fileContext;
    const _attachments = attachments;
    const _userContent = userContent;

    try {
      // Simulate thinking process
      const thinkingSteps = await simulateThinking(input);
      
      // Add streaming message
      const streamingId = generateId();
      setMessages(prev => [...prev, {
        id: streamingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        thinking: thinkingSteps,
        isStreaming: true,
      }]);

      // Detect whether this is a targeted (surgical) edit or a full generation
      const rawInput = _userContent; // input is already cleared; use the captured value
      const lowerInput = rawInput.toLowerCase();
      const isFullGeneration = !!lowerInput.match(/\b(full control|full reign|revamp|overhaul|transform|reimagine|build|create|generate|make)\b.*\b(landing page|page|website|store|site|template)\b/);
      const hasSurgicalKeyword = !isFullGeneration && !!(
        lowerInput.match(/\b(change|modify|update|edit|adjust|tweak|fix|add|insert|include|remove|delete|hide|replace|restyle|redesign|change color|change style|move|swap|reposition|resize|enlarge|shrink|center|align|increase|decrease|make the|make it|set the|set it|should be|needs to be|wire|connect|hook up|integrate|link|bind|attach|submit|send data|save data|api|backend|database|supabase|fetch|endpoint)\b/)
      );
      const isSurgicalEdit = hasSurgicalKeyword && !!currentCode;

      // Analyze VFS site structure for component-level targeting
      let siteAnalysisContext = '';
      let editTargetContext = '';
      let resolvedTargetFile: string | null = null;
      let isReactProject = false;
      if (vfsFiles && Object.keys(vfsFiles).length > 0) {
        // Detect if the VFS project is React-based (has .tsx/.jsx component files)
        const vfsPaths = Object.keys(vfsFiles);
        isReactProject = vfsPaths.some(p => /\.(tsx|jsx)$/.test(p) && !/\.d\.ts$/.test(p));
        
        try {
          const analysis = analyzeReactSite(vfsFiles);
          if (analysis.sectionMap) {
            siteAnalysisContext = analysis.sectionMap;
          }
          // For surgical edits, resolve which component/file the user is targeting
          if (isSurgicalEdit) {
            const target = resolveEditTarget(rawInput, analysis);
            if (target) {
              resolvedTargetFile = target.file;
              const targetFileContent = vfsFiles[target.file];
              const contentSnippet = targetFileContent
                ? targetFileContent.slice(0, 8000)
                : '';
              editTargetContext = [
                '',
                `🎯 EDIT TARGET RESOLVED (confidence: ${target.confidence}):`,
                `  File: ${target.file}`,
                `  Component: ${target.component}`,
                target.section ? `  Section: ${target.section}` : '',
                '',
                contentSnippet ? `Current source of ${target.file}:` : '',
                contentSnippet ? '```tsx' : '',
                contentSnippet,
                contentSnippet ? '```' : '',
              ].filter(Boolean).join('\n');
            }
          }
        } catch { /* analysis is best-effort */ }
      } else if (currentCode) {
        // Fallback: detect React from currentCode if no vfsFiles available
        isReactProject = currentCode.includes('import ') && (
          currentCode.includes('from \'react\'') ||
          currentCode.includes('from "react"') ||
          currentCode.includes('export default function') ||
          currentCode.includes('export default const')
        );
      }

      // Build theme/styling context from Systems AI blueprint so in-builder edits stay consistent
      const themeContextBlock = (() => {
        if (!systemsBuildContext) return '';
        const { brand, design, identity } = systemsBuildContext;
        const lines: string[] = ['[🎨 Theme & Styling — Match this design language for all new elements]'];
        if (brand?.business_name) lines.push(`Business: ${brand.business_name}`);
        if (brand?.tone) lines.push(`Tone: ${brand.tone}`);
        if (brand?.palette) {
          const p = brand.palette;
          const colors = [
            p.primary && `Primary: ${p.primary}`,
            p.secondary && `Secondary: ${p.secondary}`,
            p.accent && `Accent: ${p.accent}`,
            p.background && `BG: ${p.background}`,
            p.foreground && `FG: ${p.foreground}`,
          ].filter(Boolean).join(' | ');
          if (colors) lines.push(`Palette: ${colors}`);
        }
        if (brand?.typography) {
          const t = brand.typography;
          if (t.heading || t.body) lines.push(`Typography: ${t.heading || 'auto'} (headings) / ${t.body || 'auto'} (body)`);
        }
        if (design?.layout?.hero_style) lines.push(`Hero: ${design.layout.hero_style}`);
        if (design?.buttons?.style) lines.push(`Buttons: ${design.buttons.style}`);
        if (design?.effects?.glassmorphism) lines.push(`Effects: glassmorphism`);
        if (design?.effects?.shadows) lines.push(`Shadows: ${design.effects.shadows}`);
        if (design?.content?.writing_style) lines.push(`Writing Style: ${design.content.writing_style}`);
        if (identity?.industry) lines.push(`Industry: ${identity.industry.replace(/_/g, ' ')}`);
        return lines.length > 1 ? lines.join('\n') : '';
      })();

      // Build rich context block for full-generation requests
      const contextLines: string[] = [];
      if (systemType) contextLines.push(`Business type: ${systemType}`);
      if (templateName) contextLines.push(`Template: ${templateName}`);
      if (userDesignProfile) {
        contextLines.push(`Design style: ${userDesignProfile.dominantStyle || 'mixed'}`);
        if (userDesignProfile.industryHints?.length) contextLines.push(`Industry: ${userDesignProfile.industryHints.join(', ')}`);
      }
      if (businessDataContext) contextLines.push(`\nBusiness data:\n${businessDataContext.slice(0, 800)}`);
      if (pageStructureContext) contextLines.push(`\nPage structure:\n${pageStructureContext.slice(0, 600)}`);
      if (backendStateContext) contextLines.push(`\nBackend state:\n${backendStateContext.slice(0, 400)}`);
      if (vfsContext) contextLines.push(`\nCurrent VFS project files:\n${vfsContext.slice(0, 2400)}`);
      if (siteAnalysisContext && !isSurgicalEdit) contextLines.push(`\nSite component structure:\n${siteAnalysisContext.slice(0, 1500)}`);
      if (themeContextBlock) contextLines.push(`\n${themeContextBlock}`);
      const richContext = contextLines.length ? `\n\n[Context]\n${contextLines.join('\n')}` : '';

      // For surgical edits, inject a strict prompt guard so the AI makes ONLY the targeted change
      // AND mandate that it outputs actual code, not just reasoning
      const promptForAI = isSurgicalEdit
        ? [
            '🚨 SURGICAL EDIT MODE — CHANGE ONLY THE TARGETED ELEMENT/COMPONENT 🚨',
            '',
            `User Request: ${_userContent}${_fileContext}`,
            editTargetContext,
            siteAnalysisContext ? `\nSite component map:\n${siteAnalysisContext.slice(0, 1500)}` : '',
            '',
            '⚠️ MANDATORY: You MUST output the modified code, not just explain the change.',
            'For multi-file React projects: output JSON {"files": {"/path/file.tsx": "...content..."}, "explanation": "..."}',
            'For single-file: output the full modified file in a ```tsx code fence.',
            '',
            '⚠️ CRITICAL SURGICAL EDIT RULES:',
            '1. Output ONLY the file(s) that need to change — do NOT regenerate the entire project',
            '2. If the edit targets a specific component, output ONLY that component file with the change applied',
            '3. For multi-file projects, use JSON format: {"files": {"/path/file.tsx": "...content..."}}',
            '4. Every section, style, and data attribute NOT mentioned MUST stay IDENTICAL',
            '5. DO NOT re-generate, rephrase, or "improve" unmentioned sections or components',
            '6. DO NOT change colors, fonts, layout, or content outside the targeted element',
            '7. If the change is purely CSS/class-based, only modify the class list on that one element',
            '8. Think of this like a diff — your output should be identical to the input except for the one change',
            '9. For React projects: preserve all imports, hooks, state, and component structure — only change the targeted JSX/logic',
            '10. When adding new elements or modifying styles, match the existing theme — use the same colors, fonts, spacing, and design patterns',
            themeContextBlock ? `\n${themeContextBlock}` : '',
          ].filter(Boolean).join('\n')
        : `${_userContent}${_fileContext}${richContext}`;

      // Detect templateAction for the backend
      const detectTemplateAction = (msg: string): string | undefined => {
        const lm = msg.toLowerCase();
        if (lm.match(/\b(full control|revamp|overhaul|transform|reimagine)\b/)) return 'full-control';
        if (lm.match(/\b(add|insert|include|create new|put|place)\b.*\b(section|element|component|button|image|form|card|hero|footer|header|nav)/)) return 'add';
        if (lm.match(/\b(remove|delete|hide|get rid of|take out)\b/)) return 'remove';
        if (lm.match(/\b(change|modify|update|edit|adjust|tweak|fix)\b/)) return 'modify';
        if (lm.match(/\b(restyle|redesign|new look|change color|change style|theme|recolor)\b/)) return 'restyle';
        return currentCode ? 'modify' : undefined;
      };
      const templateAction = detectTemplateAction(rawInput);

      // Call AI service with retry logic
      const MAX_RETRIES = 2;
      let response = null;
      let lastError = null;
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            // Update thinking to show retry
            thinkingSteps.push({
              id: generateId(),
              type: 'analyzing',
              message: `Retrying (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`,
              timestamp: new Date(),
            });
            setMessages(prev => prev.map(m =>
              m.id === streamingId ? { ...m, thinking: [...thinkingSteps] } : m
            ));
            // Exponential backoff: 1s, 2s
            await new Promise(r => setTimeout(r, attempt * 1000));
          }
          
          // Truncate currentCode to stay within edge function limits
          const MAX_CODE_LENGTH = 180_000;
          const truncatedCode = currentCode && currentCode.length > MAX_CODE_LENGTH
            ? currentCode.substring(0, MAX_CODE_LENGTH) + '\n<!-- ... truncated for AI processing -->'
            : currentCode;

          // Generate AI Site Elements Library context for the request
          // Skeletons are NEVER included — the library provides structural reference
          // and intent wiring only. Visual design comes from the industry variation system.
          // SKIP library context entirely for surgical edits — it pressures the AI
          // toward full-page generation and conflicts with targeted edit instructions.
          const siteElementsLibraryContext = isSurgicalEdit
            ? undefined
            : generateLibraryPrompt({
                systemType,
                userPrompt: _userContent,
                includeSkeletons: false,
                maxElements: 10,
              });

          // Build compact VFS files payload for surgical edits (only relevant files, capped)
          let vfsPayload: Record<string, string> | undefined;
          if (isSurgicalEdit && isReactProject && vfsFiles) {
            const MAX_VFS_PAYLOAD = 120_000;
            let totalSize = 0;
            vfsPayload = {};
            // Prioritize resolved target file, then .tsx/.jsx, then .css
            const sortedPaths = Object.keys(vfsFiles).sort((a, b) => {
              if (resolvedTargetFile) {
                if (a === resolvedTargetFile) return -1;
                if (b === resolvedTargetFile) return 1;
              }
              const aReact = /\.(tsx|jsx)$/.test(a) ? 0 : /\.css$/.test(a) ? 1 : 2;
              const bReact = /\.(tsx|jsx)$/.test(b) ? 0 : /\.css$/.test(b) ? 1 : 2;
              return aReact - bReact;
            });
            for (const p of sortedPaths) {
              const content = vfsFiles[p];
              if (totalSize + content.length > MAX_VFS_PAYLOAD) continue;
              vfsPayload[p] = content;
              totalSize += content.length;
            }
          }

          response = await supabase.functions.invoke('ai-code-assistant', {
            body: {
              messages: [{ role: 'user', content: promptForAI }],
              // Always use template-react for React projects (even surgical edits)
              // to ensure the AI generates React/TSX output, not raw HTML.
              // The surgicalEdit flag tells the edge function to apply surgical constraints.
              // Only fall back to 'code' mode for non-React (HTML template) surgical edits.
              mode: isSurgicalEdit && !isReactProject ? 'code' : 'template-react',
              currentCode: truncatedCode,
              editMode: !!currentCode,
              surgicalEdit: isSurgicalEdit,
              systemType,
              templateName,
              templateAction,
              userDesignProfile: userDesignProfile ?? undefined,
              systemsBuildContext: systemsBuildContext ?? undefined,
              siteElementsLibraryContext,
              attachments: _attachments.length > 0 ? _attachments : undefined,
              // Send VFS files for surgical edit context
              vfsFiles: vfsPayload,
            },
          });
          
          // Check for retryable errors
          if (response.error) {
            // Try to get the real error message from the edge function response body
            const bodyError: string = (response.data as { error?: string } | null)?.error || '';
            const errorMsg = bodyError || response.error.message || '';
            const isRetryable = errorMsg.includes('non-2xx') || 
                               errorMsg.includes('timeout') ||
                               errorMsg.includes('temporarily unavailable') ||
                               errorMsg.includes('All AI providers failed');
            
            if (isRetryable && attempt < MAX_RETRIES) {
              console.log(`[AIBuilderPanel] Retryable error, attempt ${attempt + 1}:`, errorMsg);
              lastError = response.error;
              continue;
            }
            // Throw an error with the descriptive message from the edge function
            throw new Error(bodyError || response.error.message || 'Edge function error');
          }
          
          // Success
          break;
        } catch (err) {
          lastError = err;
          if (attempt >= MAX_RETRIES) throw err;
        }
      }
      
      if (!response || response.error) {
        throw lastError || new Error('AI service failed after retries');
      }

      // Extract AI reasoning (works for all models: thinking-tag extraction or native Anthropic blocks)
      const aiReasoning: string | undefined = response.data?.thinking || undefined;

      // The edge function returns { content, generatedImage?, imagePlacement? }
      const aiContent = response.data?.content || 'I processed your request but have no specific output to show.';
      
      // ====== ROBUST CODE EXTRACTION (React/TSX Mode) ======
      // Extract React component code from AI response
      let generatedCode: string | null = null;
      let explanationText = '';
      let multiFileOutput: Record<string, string> | null = null;

      if (aiContent) {
        const trimmed = aiContent.trim();

        // Strategy 0: Strip markdown JSON fences before checking for JSON structure
        // AI often returns: ```json\n{ "files": {...} }\n```
        let jsonCandidate = trimmed;
        const jsonFenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
        if (jsonFenceMatch) {
          jsonCandidate = jsonFenceMatch[1].trim();
        }

      // Pre-processing: Detect if content is AI reasoning/prose with no usable code
      // AI sometimes outputs planning text with inline HTML tag refs like `<style>`, `<nav>`
      // For surgical edits, we're stricter — if there are code fences OR JSON, always try extraction
      const isLikelyPureReasoning = (() => {
        if (isSurgicalEdit) {
          // In surgical edit mode, only skip if there's truly zero code anywhere
          const hasAnyCode = /```\w*\s*\n/m.test(trimmed) || 
            (trimmed.includes('"files"') && trimmed.includes('{')) ||
            trimmed.includes('import ') ||
            trimmed.includes('export ');
          return !hasAnyCode && !trimmed.includes('className') && !trimmed.includes('function ');
        }
        const stripped = stripInlineCodeRefs(trimmed);
        const hasNoCodeStructure = !stripped.includes('import ') && 
          !stripped.includes('export ') && 
          !stripped.includes('function ') &&
          !/<!DOCTYPE/i.test(stripped) &&
          !/<html[\s>]/i.test(stripped);
        const hasProseIndicators = /\b(I will|I need to|I'll|Let me|Here's|inspired|simplified)\b/i.test(trimmed);
        const hasNoCodeFences = !/```\w*\s*\n/m.test(trimmed);
        return hasNoCodeStructure && hasProseIndicators && hasNoCodeFences;
      })();

      if (isLikelyPureReasoning) {
        console.warn('[AIBuilderPanel] Content appears to be pure AI reasoning — skipping code extraction');
        explanationText = trimmed;
      }

        // Strategy 1: Check for JSON multi-file output: {"files": {...}}
        if (jsonCandidate.startsWith('{') && jsonCandidate.includes('"files"')) {
          try {
            const parsed = JSON.parse(jsonCandidate);
            if (parsed.files && typeof parsed.files === 'object') {
              multiFileOutput = parsed.files;
              explanationText = parsed.explanation || '✅ Multi-file project generated and applied.';
              console.log('[AIBuilderPanel] Parsed multi-file JSON output:', Object.keys(multiFileOutput));
            }
          } catch (parseErr) { 
            console.warn('[AIBuilderPanel] JSON parse failed:', parseErr);
          }
        }

        // Strategy 2: Check if content IS a React component (starts with import/export/function)
        if (!multiFileOutput && !generatedCode) {
          // Skip if content has markdown fences — let Strategy 3 handle it
          const hasMarkdownFences = /```\w*\s*\n/m.test(trimmed);
          
          const isReactComponent = !hasMarkdownFences && (
            /^import\s+/m.test(trimmed) ||
            /^export\s+default\s+function/m.test(trimmed) ||
            /^(?:const|function)\s+\w+.*=.*(?:=>|\{)/m.test(trimmed)
          );

          // Reject if it contains config file content (module.exports, tailwind.config)
          const hasConfigContent = /module\.exports\s*=/.test(trimmed) || 
            /tailwind\.config\s*=/.test(trimmed);
          // Reject if it contains raw HTML (should be wrapped first)
          const hasRawHtml = /<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/im.test(trimmed);

          if (isReactComponent && trimmed.includes('return') && trimmed.includes('<') && !hasConfigContent && !hasRawHtml) {
            generatedCode = trimmed;
            explanationText = '✅ Component applied to your project.';
          }
        }

        // Strategy 3: Extract from markdown code fences (```tsx ... ``` or ```jsx ... ```)
        if (!multiFileOutput && !generatedCode) {
          const fenceRegex = /```(?:tsx|jsx|typescript|javascript|ts|js|html|htm|css)?\s*\n([\s\S]*?)```/gi;
          const fenceMatches = [...aiContent.matchAll(fenceRegex)];

          if (fenceMatches.length > 0) {
            // Find the largest code block
            let bestBlock = '';
            for (const m of fenceMatches) {
              const block = m[1].trim();
              if (block.length > bestBlock.length) bestBlock = block;
            }
            // Check if it has React/JSX structure OR valid HTML structure
            const hasReactStructure = bestBlock.includes('import ') ||
              bestBlock.includes('export ') ||
              bestBlock.includes('function ') ||
              bestBlock.includes('return (') ||
              (bestBlock.includes('<') && bestBlock.includes('className'));
            // Also accept HTML output (has tags but uses class= instead of className)
            const hasHtmlStructure = bestBlock.includes('<') && (
              bestBlock.includes('class=') || 
              bestBlock.includes('<!DOCTYPE') ||
              bestBlock.includes('<html') ||
              bestBlock.includes('<body') ||
              bestBlock.includes('<section') ||
              bestBlock.includes('<div')
            );
            // Check if it's pure CSS (e.g. :root { ... })
            const isCssOnly = /^\s*(?::root|body|html|\*|@import|@font-face|@media|\/\*)/m.test(bestBlock) &&
              !bestBlock.includes('import ') && !bestBlock.includes('export ');
            
            if (hasReactStructure) {
              generatedCode = bestBlock;
              console.log('[AIBuilderPanel] Extracted React code from fence');
            } else if (isCssOnly) {
              // CSS extracted from fence — inject via useEffect (no dangerouslySetInnerHTML)
              const cssJsonStr = JSON.stringify(bestBlock);
              generatedCode = `import React, { useEffect } from 'react';\n\nconst CSS_CONTENT = ${cssJsonStr};\n\nexport default function App() {\n  useEffect(() => {\n    const s = document.createElement('style');\n    s.textContent = CSS_CONTENT;\n    document.head.appendChild(s);\n    return () => { s.remove(); };\n  }, []);\n\n  return (\n    <div style={{ minHeight: '100vh' }}><p>Styles applied.</p></div>\n  );\n}`;
              console.log('[AIBuilderPanel] Extracted CSS from fence, wrapped in React component');
            } else if (hasHtmlStructure) {
              generatedCode = wrapHtmlInReactComponent(bestBlock);
              console.log('[AIBuilderPanel] Extracted HTML from fence, wrapped in React component');
            }
          }
        }

        // Strategy 4: Raw HTML mixed with reasoning text (e.g. "I will generate...<!DOCTYPE html>...")
        if (!multiFileOutput && !generatedCode) {
          const rawHtml = extractRawHtmlFromMixed(trimmed);
          if (rawHtml) {
            console.log('[AIBuilderPanel] Extracted raw HTML from mixed content, wrapping in React component');
            generatedCode = wrapHtmlInReactComponent(rawHtml);
            // Extract explanation from the text before the HTML
            const doctypeIdx = trimmed.indexOf('<!DOCTYPE');
            const htmlIdx = doctypeIdx >= 0 ? doctypeIdx : trimmed.indexOf('<html');
            if (htmlIdx > 0) {
              explanationText = trimmed.slice(0, htmlIdx).trim();
            }
            if (!explanationText) {
              explanationText = '✅ HTML site generated and wrapped for preview.';
            }
          }
        }

        // Strategy 5: Content is purely raw HTML (starts with <!DOCTYPE or <html)
        if (!multiFileOutput && !generatedCode) {
          if (/^\s*<!DOCTYPE/i.test(trimmed) || /^\s*<html[\s>]/i.test(trimmed)) {
            console.log('[AIBuilderPanel] Content is raw HTML, wrapping in React component');
            generatedCode = wrapHtmlInReactComponent(trimmed);
            explanationText = '✅ HTML site generated and wrapped for preview.';
          }
        }

        // Strategy 6 (surgical edit fallback): Extract JSON {"files": {...}} from prose
        // AI may return: "Here's the change:\n```json\n{\"files\": {...}}\n```\nI changed X"
        if (!multiFileOutput && !generatedCode && isSurgicalEdit) {
          // Try to find {"files": embedded anywhere in the content
          const filesJsonMatch = trimmed.match(/\{[\s\S]*?"files"\s*:\s*\{[\s\S]*?\}\s*\}/);
          if (filesJsonMatch) {
            try {
              const parsed = JSON.parse(filesJsonMatch[0]);
              if (parsed.files && typeof parsed.files === 'object') {
                multiFileOutput = parsed.files;
                explanationText = parsed.explanation || '✅ Surgical edit applied.';
                console.log('[AIBuilderPanel] Strategy 6: Extracted multi-file JSON from prose:', Object.keys(multiFileOutput!));
              }
            } catch { /* not valid JSON, continue */ }
          }
        }

        // Extract explanation: everything that's NOT inside code fences
        if (!explanationText) {
          explanationText = aiContent
            .replace(/```[\s\S]*?```/g, '')
            .replace(/^\s*\n/gm, '\n')
            .trim();

          if (!explanationText && (generatedCode || multiFileOutput)) {
            explanationText = isSurgicalEdit ? '✅ Edit applied successfully.' : '✅ Code generated and applied to your project.';
          }
        }
      }

      // Handle multi-file output — prefer orchestrator, fall back to legacy callback
      if (multiFileOutput) {
        console.log('[AIBuilderPanel] Multi-file output detected:', Object.keys(multiFileOutput));
        
        // Normalize paths, filter config files, and strip module.exports from component content
        const BLOCKED_FILES = /\/(tailwind\.config|postcss\.config|vite\.config|tsconfig|package\.json|package-lock)/i;
        const normalizedFiles: Record<string, string> = {};
        for (const [path, content] of Object.entries(multiFileOutput)) {
          const normalizedPath = path.startsWith('/') ? path : `/${path}`;
          if (BLOCKED_FILES.test(normalizedPath)) {
            console.warn('[AIBuilderPanel] Filtered out config file from AI output:', normalizedPath);
            continue;
          }
          // Strip module.exports blocks from .tsx/.jsx files
          let fileContent = content;
          if (/\.(tsx|jsx)$/.test(normalizedPath) && content.includes('module.exports')) {
            fileContent = stripModuleExportsBlocks(content);
          }
          normalizedFiles[normalizedPath] = fileContent;
        }
        
        if (onApplyToVFS) {
          console.log('[AIBuilderPanel] Calling onApplyToVFS with normalized paths:', Object.keys(normalizedFiles));
          onApplyToVFS(normalizedFiles);
          toast.success('✅ Multi-file project applied with dependencies');
        } else if (onFilesPatch) {
          onFilesPatch(normalizedFiles);
          toast.success('✅ Multi-file project applied to VFS');
        } else {
          console.warn('[AIBuilderPanel] No VFS callback available for multi-file output!');
        }
      }

      // SAFETY NET 1: If generatedCode is still raw HTML (not wrapped in React), wrap it now
      if (generatedCode && (/^\s*<!DOCTYPE/i.test(generatedCode) || /^\s*<html[\s>]/i.test(generatedCode))) {
        console.warn('[AIBuilderPanel] Safety net: wrapping raw HTML that escaped extraction strategies');
        generatedCode = wrapHtmlInReactComponent(generatedCode);
      }

      // SAFETY NET 2: If generatedCode is raw CSS (:root, body {, @import, etc.), wrap in React component
      if (generatedCode && /^\s*(?::root|body|html|\*|@import|@font-face|@media|\/\*)\s*[{\/(]/m.test(generatedCode.trim()) && !generatedCode.includes('import ') && !generatedCode.includes('export ')) {
        console.warn('[AIBuilderPanel] Safety net: detected raw CSS being applied as TSX — wrapping in React component');
        const cssJsonStr = JSON.stringify(generatedCode);
        generatedCode = `import React from 'react';

const CSS_CONTENT = ${cssJsonStr};

export default function App() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_CONTENT }} />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Styles applied. Waiting for page content...</p>
      </div>
    </>
  );
}`;
      }

      // Determine the target file path for single-file output.
      // If site analysis resolved a specific component file, use that path
      // to avoid overwriting the entire App.tsx with a single component's code.
      const singleFilePath = resolvedTargetFile || '/src/App.tsx';

      // Determine VFS edits from response
      const edits: VFSEdit[] = [];
      if (multiFileOutput) {
        Object.keys(multiFileOutput).forEach(path => {
          edits.push({
            path,
            type: 'create',
            linesChanged: multiFileOutput![path].split('\n').length,
            preview: multiFileOutput![path].substring(0, 200),
          });
        });
      } else if (generatedCode) {
        edits.push({
          path: singleFilePath,
          type: currentCode ? 'modify' : 'create',
          linesChanged: generatedCode.split('\n').length,
          preview: generatedCode.substring(0, 200),
        });
      }

      // Add final thinking step — include a reasoning summary badge if AI thinking was returned
      thinkingSteps.push({
        id: generateId(),
        type: aiReasoning ? 'reasoning' : 'complete',
        message: aiReasoning
          ? `Extended reasoning complete (${(aiReasoning.length / 1000).toFixed(1)}k chars)`
          : 'Generation complete',
        timestamp: new Date(),
        details: aiReasoning ? aiReasoning.slice(0, 500) + (aiReasoning.length > 500 ? '…' : '') : undefined,
      });
      if (aiReasoning) {
        thinkingSteps.push({
          id: generateId(),
          type: 'complete',
          message: 'Response generated',
          timestamp: new Date(),
        });
      }

      // Update message — show ONLY the explanation text, NOT raw code
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? {
              ...m,
              content: explanationText || aiContent,
              thinking: thinkingSteps,
              claudeReasoning: aiReasoning,
              // DO NOT set `code` — we auto-apply instead of showing "Apply" buttons
              edits: edits.length > 0 ? edits : undefined,
              isStreaming: false,
            }
          : m
      ));

      // AUTO-APPLY: Push generated code to VFS — prefer orchestrator for dep resolution
      if (generatedCode) {
        // Strip any module.exports / tailwind.config blocks that AI embedded in component code
        generatedCode = stripModuleExportsBlocks(generatedCode);
        
        // FINAL VALIDATION: Reject code that looks like AI reasoning/prose, not actual code
        const looksLikeCode = generatedCode.includes('import ') || 
          generatedCode.includes('export ') || 
          generatedCode.includes('function ') ||
          generatedCode.includes('dangerouslySetInnerHTML') ||
          generatedCode.includes('return (') ||
          /^\s*<!DOCTYPE/i.test(generatedCode) ||
          /^\s*<html[\s>]/i.test(generatedCode);
        
        const looksLikeProse = /\b(I will|I need to|I'll|Let me|inspired|simplified|Here's my|I'm going to)\b/i.test(generatedCode.slice(0, 300));
        
        if (!looksLikeCode || (looksLikeProse && !generatedCode.includes('dangerouslySetInnerHTML'))) {
          console.warn('[AIBuilderPanel] REJECTED: Generated code looks like AI reasoning, not actual code');
          console.warn('[AIBuilderPanel] First 200 chars:', generatedCode.slice(0, 200));
          generatedCode = null;
        }

        if (generatedCode) {
          if (onApplyToVFS && !multiFileOutput) {
            console.log('[AIBuilderPanel] Auto-applying to VFS:', { targetPath: singleFilePath, codeLength: generatedCode.length });
            onApplyToVFS({ [singleFilePath]: generatedCode });
            toast.success(isSurgicalEdit ? '✅ Edit applied with deps' : '✅ Code applied with dependencies');
          } else if (onCodeGenerated) {
            onCodeGenerated(generatedCode);
            toast.success(isSurgicalEdit ? '✅ Edit applied to preview' : '✅ Code applied to preview');
          }
        }
      }

    } catch (error) {
      console.error('[AIBuilderPanel] Error:', error);
      
      // Extract more descriptive error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Parse edge function errors for better messaging
        if (errorMessage.includes('All AI providers failed') || errorMessage.includes('All AI models failed')) {
          errorMessage = 'AI service unavailable — no API key is working. Please check your LOVABLE_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in Supabase secrets.';
        } else if (errorMessage.includes('non-2xx status code')) {
          errorMessage = 'AI service temporarily unavailable. Please try again in a moment.';
        } else if (errorMessage.includes('Rate limit') || errorMessage.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          errorMessage = 'Request timed out. Try a shorter prompt or try again.';
        } else if (errorMessage.includes('Payment required') || errorMessage.includes('402')) {
          errorMessage = 'AI credits needed. Please check your subscription or API billing.';
        } else if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
          errorMessage = 'AI API key is invalid or expired. Please update your API key in Supabase secrets.';
        } else if (errorMessage.includes('not available') || errorMessage.includes('LOVABLE_API_KEY')) {
          errorMessage = 'AI service not configured. Please set OPENAI_API_KEY or LOVABLE_API_KEY in your Supabase project secrets.';
        }
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase FunctionsHttpError
        const err = error as { message?: string; context?: { body?: string } };
        errorMessage = err.message || 'Edge function error';
        if (err.context?.body) {
          try {
            const body = JSON.parse(err.context.body);
            if (body.error) errorMessage = body.error;
            if (body.details) errorMessage += ` (${JSON.stringify(body.details)})`;
          } catch {
            // Ignore parse errors
          }
        }
      }
      
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again or simplify your request.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fix iframe error with AI
  const handleFixError = async (error: IframeError) => {
    setIsFixing(true);
    setActiveTab('code'); // Switch to code tab to show the fix

    const errorPrompt = `Fix this ${error.type} error:\n\nError: ${error.message}${error.stack ? `\n\nStack trace:\n${error.stack}` : ''}${error.file ? `\n\nFile: ${error.file}:${error.line}:${error.column}` : ''}`;

    const userMessage: Message = {
      id: generateId(),
      role: 'system',
      content: `🔧 Auto-fixing ${error.type} error...`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await supabase.functions.invoke('ai-code-assistant', {
        body: {
          messages: [{ role: 'user', content: errorPrompt }],
          mode: 'debug',
          currentCode,
          editMode: true,
          systemType,
          templateName,
          systemsBuildContext: systemsBuildContext ?? undefined,
        },
      });

      if (response.error) throw response.error;

      const fix = response.data?.code || response.data?.response;
      
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: response.data?.response || '✅ Fix generated! Review and apply the changes below.',
        timestamp: new Date(),
        code: fix,
        error,
        thinking: [
          { id: '1', type: 'analyzing', message: 'Analyzing error...', timestamp: new Date() },
          { id: '2', type: 'planning', message: 'Determining fix strategy...', timestamp: new Date() },
          { id: '3', type: 'generating', message: 'Generating fix...', timestamp: new Date() },
          { id: '4', type: 'validating', message: 'Validating solution...', timestamp: new Date() },
          { id: '5', type: 'complete', message: 'Fix ready', timestamp: new Date() },
        ],
      }]);

    } catch (err) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Failed to auto-fix: ${err instanceof Error ? err.message : 'Unknown error'}. Try describing the issue manually.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsFixing(false);
    }
  };

  // handleApplyCode removed — code is now auto-applied to VFS

  // Handle viewing edits
  const handleViewEdits = (edits: VFSEdit[]) => {
    if (onViewEdits) {
      onViewEdits(edits);
    } else {
      toast.info('VFS file explorer will open with changes highlighted');
    }
  };

  // Quick prompts for code tab
  const quickPrompts = [
    'Add a hero section',
    'Make it mobile responsive',
    'Add smooth animations',
    'Wire up the contact form',
  ];

  return (
    <div className={cn(
      "flex flex-col h-full bg-[#060a14] border-r border-blue-500/20",
      "shadow-[inset_0_0_30px_rgba(59,130,246,0.03)]",
      className
    )}>
      {/* Retro Header with Blue Glow */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-blue-500/30 bg-[#0a0f1e]">
        <div className="p-1.5 rounded-lg bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">
            🤖 AI Builder
          </h2>
          <p className="text-[10px] text-blue-300/50 truncate font-mono">
            {templateName || 'New Project'} • {systemType || 'General'}
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all duration-200"
            title="Close AI Panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Retro Tabs with Glow Effects */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'debug')} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-2 rounded-none h-10 bg-[#070b16] border-b border-blue-500/20">
          <TabsTrigger
            value="code"
            className="text-xs gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 data-[state=active]:bg-blue-500/10 data-[state=active]:shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400/50 hover:text-blue-400/70 transition-all duration-200"
          >
            <Code2 className="w-3.5 h-3.5" />
            Code
          </TabsTrigger>
          <TabsTrigger
            value="debug"
            className="text-xs gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-amber-400 data-[state=active]:bg-amber-500/10 data-[state=active]:shadow-[0_0_10px_rgba(245,158,11,0.3)] text-amber-400/50 hover:text-amber-400/70 transition-all duration-200"
          >
            <Bug className="w-3.5 h-3.5" />
            Debug
            {iframeErrors.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center animate-pulse">
                {iframeErrors.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
          {/* Messages */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="py-3 px-3">
              {messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  onViewEdits={handleViewEdits}
                  onRetryError={handleFixError}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-2 text-blue-400/50 text-sm py-2 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>▸ Processing...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Prompts with Retro Style */}
          {messages.length <= 1 && (
            <div className="flex-shrink-0 px-3 pb-2">
              <p className="text-[10px] text-blue-400/40 mb-1.5 font-mono">▸ Quick start:</p>
              <div className="flex flex-wrap gap-1">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="text-[10px] px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded border border-blue-500/20 hover:border-blue-500/40 text-blue-400/70 hover:text-blue-400 transition-all duration-200 hover:shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input with Retro Styling + File Drop */}
          <div className="flex-shrink-0 mt-auto p-3 border-t border-blue-500/20 bg-[#0a0f1e]">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.ts,.tsx,.js,.jsx,.css,.html,.json,.sql,.py"
              className="hidden"
              onChange={async (e) => { if (e.target.files?.length) { await addFiles(e.target.files); e.target.value = ''; } }}
            />

            {/* Attached file chips */}
            {droppedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {droppedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-[10px] text-blue-300 max-w-[140px]"
                    title={f.name}
                  >
                    {f.type === 'image' ? (
                      f.preview
                        ? <img src={f.preview} alt={f.name} className="w-3.5 h-3.5 rounded object-cover flex-shrink-0" />
                        : <ImageIcon className="w-3 h-3 flex-shrink-0" />
                    ) : f.type === 'code' ? (
                      <FileCode2 className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <FileText className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{f.name}</span>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="ml-0.5 text-blue-400/50 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone + textarea */}
            <div
              className={cn(
                'relative rounded-md transition-all duration-200',
                isDragging && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#0a0f1e]'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-blue-500/20 border-2 border-dashed border-blue-400 pointer-events-none">
                  <div className="flex flex-col items-center gap-1">
                    <Paperclip className="w-5 h-5 text-blue-400" />
                    <span className="text-[11px] text-blue-300 font-mono">Drop files here</span>
                  </div>
                </div>
              )}
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={droppedFiles.length > 0 ? 'Add instructions for the attached files (optional)...' : 'Describe what you want to build, or drop files here...'}
                className="min-h-[60px] max-h-[120px] bg-black/40 border-blue-500/30 text-sm resize-none text-blue-100 placeholder:text-blue-400/30 focus:border-blue-400 focus:ring-blue-400/20"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {/* Attach file button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || droppedFiles.length >= 5}
                  className="flex items-center gap-1 text-[10px] text-blue-400/50 hover:text-blue-400 disabled:opacity-30 transition-colors"
                  title="Attach files (images, code, text)"
                >
                  <Paperclip className="w-3 h-3" />
                  {droppedFiles.length > 0 ? `${droppedFiles.length}/5` : 'Attach'}
                </button>
                <span className="text-[10px] text-blue-400/20 font-mono">|</span>
                <span className="text-[10px] text-blue-400/30 font-mono">Enter → send</span>
              </div>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={(!input.trim() && droppedFiles.length === 0) || isLoading}
                className="gap-1.5 bg-blue-500 hover:bg-blue-400 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-200"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                Send
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
          <DebugPanel
            errors={iframeErrors}
            onFixError={handleFixError}
            onClearErrors={onClearErrors}
            isFixing={isFixing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIBuilderPanel;
