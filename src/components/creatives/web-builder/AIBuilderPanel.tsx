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
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIConversationMessage } from './ai-chat/AIConversationMessage';
import { AIConversationWelcome } from './ai-chat/AIConversationWelcome';
import { AIConversationInput } from './ai-chat/AIConversationInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BusinessSystemType } from '@/data/templates/types';
import type { SystemsBuildContext } from '@/types/systemsBuildContext';
import { generateLibraryPrompt } from '@/data/siteElementsLibrary';
import { analyzeReactSite, resolveEditTarget } from '@/utils/reactSiteAnalysis';
import { buildComponentBehaviorMap, formatBehaviorMapForPrompt } from '@/services/aiVFSOrchestrator';
import { htmlDocToReactComponent as htmlDocToReactComponentFn } from '@/utils/htmlToJsx';
import { AIGatewayOptions, type GatewayConfig } from './AIGatewayOptions';
import { vfsEventBus } from '@/services/vfsEventBus';
import { enhancePromptForAI, type AnalyzedPrompt } from '@/services/promptIntelligence';
import { DebugAgentPanel } from './DebugAgentPanel';
import { interpretPrompt, type TaskPlan } from '@/unison';
import type { PlanStepStatus } from '@/unison/nlTypes';
import { TaskPlanSteps } from './TaskPlanSteps';
import {
  hydrateAIHistoryFromSupabase,
  loadAIHistory,
  setMessages as persistMessages,
  type PersistedMessage,
} from '@/services/aiHistoryStore';
import { parseLayoutIntent } from '@/utils/layoutIntentEngine';
import { executeLayoutIntent } from '@/utils/layoutIntentExecutor';
import { parseGhlWireIntent } from '@/utils/ghlWireIntent';
// Side-effect import: registers GHL skill pack with global registry
import { wireGhlBinding } from '@/services/skills/ghlSkillPack';
import { detectSections } from '@/utils/sectionSwapper';

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

/**
 * Client-side scope guard — blocks auto-apply if a scoped edit
 * touches unauthorized files or creates too many new files.
 */
function getScopedEditAutoApplyBlockReason(opts: {
  files: Record<string, string>;
  resolvedTargetFile: string | null;
  existingFileKeys: string[];
}): string | null {
  const normalizePath = (p: string) => (p.startsWith('/') ? p : `/${p}`);
  const paths = Object.keys(opts.files).map(normalizePath);

  // If we resolved a target, the patch must include it
  if (opts.resolvedTargetFile) {
    const normTarget = normalizePath(opts.resolvedTargetFile);
    if (!paths.includes(normTarget)) {
      return `Scoped edit did not update the resolved target file (${normTarget}).`;
    }
  }

  // Scoped edits should not produce more than 3 files
  if (paths.length > 3) {
    return `Scoped edit produced ${paths.length} files — likely a full regeneration.`;
  }

  // Should not create more than 1 new file
  const existingNorm = opts.existingFileKeys.map(normalizePath);
  const newFiles = paths.filter((p) => !existingNorm.includes(p));
  if (newFiles.length > 1) {
    return `Scoped edit created ${newFiles.length} new files — expected at most 1.`;
  }

  return null;
}


export interface ThinkingStep {
  id: string;
  type: 'analyzing' | 'planning' | 'generating' | 'validating' | 'complete' | 'error' | 'reasoning';
  message: string;
  timestamp: Date;
  details?: string;
  isExpanded?: boolean;
}

export interface MessageMeta {
  actionType?: string;
  modelUsed?: string;
  filesDetected?: string[];
  warnings?: Array<{ severity: string; message: string }>;
  requiresApproval?: boolean;
  removedFiles?: string[];
  reviewSummary?: string;
}

export interface Message {
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
  /** Unison TaskPlan for this message */
  taskPlan?: TaskPlan;
  /** Rich metadata from the AI response */
  meta?: MessageMeta;
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
  defaultTargetFile?: string | null;
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
  onApplyToVFS?: (
    files: Record<string, string>,
    meta?: {
      prompt?: string;
      model?: string;
      summary?: string;
      actionType?: string;
      origin?: string;
      requiresApproval?: boolean;
      warnings?: Array<{ severity?: string; message?: string }>;
    },
  ) => void;
  /** Preview handle ref for building component behavior maps (DOM inspection) */
  previewRef?: React.RefObject<{ getIframe?: () => HTMLIFrameElement | null } | null>;
  /** Active project id — used to scope persisted prompt + edit history. */
  projectId?: string | null;
  /** Active business id — required for GHL fast-path bindings. */
  businessId?: string | null;
  /**
   * Layout-intent fast path. When provided, the panel will pre-flight every
   * prompt through the deterministic layout intent engine (center / move /
   * align / reorder section / etc). Matched intents skip the LLM round-trip
   * entirely and apply via these callbacks.
   */
  layoutOps?: {
    /** Currently selected element selector from the floating toolbar (if any). */
    selectionSelector?: string | null;
    /** Section name guess for the current selection (e.g. "hero"). */
    selectionSection?: string | null;
    /** Apply a class-edit / section-reorder result. Returns true on success. */
    applyLayoutCode: (nextCode: string, summary: string) => boolean;
    /** Move the currently-selected element up among its siblings. */
    moveElementUp: () => void;
    /** Move the currently-selected element down among its siblings. */
    moveElementDown: () => void;
    /** Resolve a CSS-ish selector to JSX bounds in the current preview source. */
    findBounds: (jsx: string, selector: string) => { start: number; end: number } | null;
    /** Live preview source — required for deterministic mutations. */
    getPreviewCode: () => string;
  };
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

// Old ThinkingStepItem and MessageItem components removed — replaced by ai-chat/ sub-components


// ============================================================================
// Main Component
// ============================================================================

export const AIBuilderPanel: React.FC<AIBuilderPanelProps> = ({
  currentCode,
  systemType,
  templateName,
  defaultTargetFile,
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
  previewRef,
  projectId,
  businessId,
  layoutOps,
}) => {
  // Hydrate persisted messages synchronously so a refresh never wipes history.
  const [messages, setMessages] = useState<Message[]>(() => {
    const persisted = loadAIHistory(projectId).messages;
    return persisted.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      thinking: (m.thinking as ThinkingStep[] | undefined) || undefined,
      claudeReasoning: m.claudeReasoning,
      code: m.code,
      edits: (m.edits as VFSEdit[] | undefined) || undefined,
      taskPlan: (m.taskPlan as TaskPlan | undefined) || undefined,
      meta: (m.meta as MessageMeta | undefined) || undefined,
    }));
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'debug'>('code');
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPromptRef = useRef<string | null>(null);

  // Auto-send when a welcome prompt is selected
  useEffect(() => {
    if (pendingPromptRef.current && input === pendingPromptRef.current && !isLoading) {
      pendingPromptRef.current = null;
      handleSend();
    }
  }, [input]);

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

  // Persist messages so a Preview / page refresh never loses prompt history.
  // Skip while a streaming assistant turn is in progress to avoid thrash —
  // we'll save on the next stable update.
  useEffect(() => {
    const isStreaming = messages.some((m) => m.isStreaming);
    if (isStreaming) return;
    const persisted: PersistedMessage[] = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: (m.timestamp instanceof Date ? m.timestamp : new Date()).toISOString(),
      thinking: m.thinking as unknown,
      claudeReasoning: m.claudeReasoning,
      code: m.code,
      edits: m.edits as unknown,
      taskPlan: m.taskPlan as unknown,
      meta: m.meta as unknown,
    }));
    persistMessages(projectId, persisted);
  }, [messages, projectId]);

  // Re-hydrate when projectId changes (e.g. switching projects in builder).
  const lastProjectRef = useRef<string | null | undefined>(projectId);
  useEffect(() => {
    if (lastProjectRef.current === projectId) return;
    lastProjectRef.current = projectId;
    const persisted = loadAIHistory(projectId).messages;
    setMessages(persisted.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      thinking: (m.thinking as ThinkingStep[] | undefined) || undefined,
      claudeReasoning: m.claudeReasoning,
      code: m.code,
      edits: (m.edits as VFSEdit[] | undefined) || undefined,
      taskPlan: (m.taskPlan as TaskPlan | undefined) || undefined,
      meta: (m.meta as MessageMeta | undefined) || undefined,
    })));
  }, [projectId]);

  // Best-effort remote hydrate for cross-device continuity.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hydrated = await hydrateAIHistoryFromSupabase(projectId);
      if (cancelled) return;
      setMessages(hydrated.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        thinking: (m.thinking as ThinkingStep[] | undefined) || undefined,
        claudeReasoning: m.claudeReasoning,
        code: m.code,
        edits: (m.edits as VFSEdit[] | undefined) || undefined,
        taskPlan: (m.taskPlan as TaskPlan | undefined) || undefined,
        meta: (m.meta as MessageMeta | undefined) || undefined,
      })));
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // No initial welcome message — AIConversationWelcome handles the empty state

  // Live thinking step pusher — updates the streaming message in real-time
  const pushThinkingStep = useCallback((
    streamingId: string,
    step: ThinkingStep,
    existingSteps: ThinkingStep[],
  ) => {
    existingSteps.push(step);
    setMessages(prev => prev.map(m =>
      m.id === streamingId ? { ...m, thinking: [...existingSteps] } : m
    ));
  }, []);

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

    // ── GHL Wire Fast Path ───────────────────────────────────────────────
    // Deterministic NL → site_intent_bindings write for GoHighLevel workflows.
    if (droppedFiles.length === 0 && projectId && businessId) {
      try {
        const wire = parseGhlWireIntent(userContent);
        if (wire && wire.confidence >= 0.75) {
          const elementKey =
            (layoutOps?.selectionSelector as string | undefined) ||
            (wire.elementHint ? `hint:${wire.elementHint}` : null);
          if (elementKey) {
            const binding = await wireGhlBinding({
              businessId,
              projectId,
              pagePath: '/',
              elementKey,
              elementLabel: wire.elementHint ?? layoutOps?.selectionSection ?? null,
              intent: 'button.click',
              workflowId: wire.workflowRef,
            });
            const summary = binding
              ? `✓ Wired **${wire.elementHint ?? 'selected element'}** to GHL workflow \`${wire.workflowRef}\`. It will fire on click via the runtime intent executor.`
              : `⚠ Could not persist GHL binding — check business membership and try again.`;
            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: 'assistant',
                content: `${summary}\n\n_Applied instantly — no model call. Manage from the Intent Inspector._`,
                timestamp: new Date(),
              },
            ]);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('[AIBuilderPanel] GHL wire fast-path error:', err);
      }
    }

    // ── Layout-Intent Fast Path ──────────────────────────────────────────
    // Deterministic NL → layout-op (center / move / align / reorder).
    // Skips the LLM round-trip entirely on a confident match.
    if (layoutOps && droppedFiles.length === 0) {
      try {
        const previewSrc = layoutOps.getPreviewCode();
        const detected = previewSrc ? detectSections(previewSrc) : [];
        const intent = parseLayoutIntent({
          prompt: userContent,
          selectionSelector: layoutOps.selectionSelector,
          selectionSection: layoutOps.selectionSection,
          detectedSections: detected,
        });

        // Auto-apply class edits (high confidence). Structural reorders also
        // execute (the user already chose to send), but we surface a richer
        // summary so they can revert from history.
        if (intent && intent.confidence >= 0.75) {
          let summary = intent.operation.describe;
          let success = false;

          if (intent.operation.kind === 'element-move') {
            if (intent.operation.direction === 'up') layoutOps.moveElementUp();
            else layoutOps.moveElementDown();
            success = true;
          } else {
            const result = executeLayoutIntent(intent, {
              previewCode: previewSrc,
              findBounds: layoutOps.findBounds,
              selectionSelector: layoutOps.selectionSelector,
            });
            if (result.ok && result.nextCode) {
              success = layoutOps.applyLayoutCode(result.nextCode, result.summary);
              summary = result.summary;
            } else if (!result.ok) {
              console.warn('[AIBuilderPanel] Layout intent matched but executor failed:', result.reason);
            }
          }

          if (success) {
            const assistantMsg: Message = {
              id: generateId(),
              role: 'assistant',
              content: `✓ ${summary}\n\n_Applied instantly via the layout engine — no model call. Revert anytime from the edit history._`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
            setIsLoading(false);
            return;
          }
          // If we matched but couldn't execute, fall through to the LLM with
          // a hint added to the prompt for better targeting.
        }
      } catch (err) {
        console.error('[AIBuilderPanel] Layout intent fast path error:', err);
        // Non-fatal — fall through to the LLM.
      }
    }


    // Keep fileContext & attachments in closure for the rest of handleSend
    const _fileContext = fileContext;
    const _attachments = attachments;
    const _userContent = userContent;

    let streamingId: string | null = null;

    try {
      // Initialize live thinking cascade
      const thinkingSteps: ThinkingStep[] = [];
      streamingId = generateId();
      
      // Add streaming message immediately (visible with empty thinking)
      setMessages(prev => [...prev, {
        id: streamingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        thinking: [],
        isStreaming: true,
      }]);

      // Helper to push a live step
      const liveStep = (type: ThinkingStep['type'], message: string, details?: string) => {
        pushThinkingStep(streamingId, {
          id: generateId(),
          type,
          message,
          timestamp: new Date(),
          details,
        }, thinkingSteps);
      };

      // ── Phase 1: Prompt Intelligence ──
      liveStep('analyzing', 'Parsing natural language request...');

      const rawInput = _userContent;
      const { enhancedPrompt: intelligentPrompt, analysis: promptAnalysis, isSurgical: detectedSurgical, isBehavioral: detectedBehavioral, isFullGen: isFullGeneration, isDebug: detectedDebug } = enhancePromptForAI(rawInput);
      const isSurgicalEdit = detectedSurgical && !!currentCode;
      const isBehavioralEdit = detectedBehavioral && !!currentCode;
      const isDebugMode = detectedDebug && !!currentCode;

      liveStep('analyzing', `Intent: ${promptAnalysis.intent} · Complexity: ${promptAnalysis.complexity}`, [
        promptAnalysis.targets.length ? `Targets: ${promptAnalysis.targets.map(t => t.section || t.element || t.file).filter(Boolean).join(', ')}` : null,
        promptAnalysis.designKeywords.length ? `Design cues: ${promptAnalysis.designKeywords.join(', ')}` : null,
        promptAnalysis.constraints.length ? `${promptAnalysis.constraints.length} constraints detected` : null,
        isBehavioralEdit ? '🧠 Behavioral edit mode' : isDebugMode ? '🔧 Debug mode' : isSurgicalEdit ? '🎯 Surgical edit mode' : isFullGeneration ? '🏗️ Full generation mode' : null,
      ].filter(Boolean).join(' | '));

      // Log prompt analysis for debugging
      console.log('[AIBuilderPanel] Prompt analysis:', {
        intent: promptAnalysis.intent,
        secondary: promptAnalysis.secondaryIntents,
        complexity: promptAnalysis.complexity,
        targets: promptAnalysis.targets.length,
        constraints: promptAnalysis.constraints.length,
        designKeywords: promptAnalysis.designKeywords,
        isSurgical: isSurgicalEdit,
        isBehavioral: isBehavioralEdit,
        isDebug: isDebugMode,
      });

      // ── Phase 1b: Unison Task Interpretation ──
      liveStep('analyzing', 'Running Unison task planner...');
      
      const projectContext: import('@/unison').ProjectContext = {
        provisionedCapabilities: [],
        existingFiles: vfsFiles ? Object.keys(vfsFiles) : [],
        existingPages: [],
        builderMode: currentCode ? 'edit' : 'generate',
        hasBusinessId: !!systemsBuildContext?.brand?.business_name,
        installedWorkflows: [],
      };
      
      const { plan: taskPlan, feedback: unisonFeedback } = interpretPrompt(_userContent, projectContext);
      
      liveStep('analyzing', `Plan: ${taskPlan.steps.length} steps · route: ${taskPlan.route}`,
        `Confidence: ${Math.round(taskPlan.intent.confidence * 100)}% · Complexity: ${taskPlan.estimatedComplexity}`
      );
      
      // Helper: advance TaskPlan step statuses in-place and update the message
      const advancePlanStep = (plan: TaskPlan, stepType: string, status: PlanStepStatus) => {
        const step = plan.steps.find(s => s.type === stepType && s.status !== 'done');
        if (step) {
          step.status = status;
          if (status === 'running') step.startedAt = new Date().toISOString();
          if (status === 'done' || status === 'failed') step.completedAt = new Date().toISOString();
        }
        setMessages(prev => prev.map(m =>
          m.id === streamingId ? { ...m, taskPlan: { ...plan } } : m
        ));
      };

      // Attach task plan to the streaming message
      setMessages(prev => prev.map(m =>
        m.id === streamingId ? { ...m, taskPlan } : m
      ));

      // Mark initial steps as running
      advancePlanStep(taskPlan, 'analyze', 'running');

      console.log('[AIBuilderPanel] Unison plan:', {
        route: taskPlan.route,
        steps: taskPlan.steps.length,
        complexity: taskPlan.estimatedComplexity,
        confidence: taskPlan.intent.confidence,
        outcome: unisonFeedback.outcome,
      });


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
              liveStep('planning', `🎯 Edit target: ${target.component} in ${target.file}`, `Confidence: ${target.confidence}`);
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

      // ── Phase 1c: Build component behavior map for ALL edit types ──
      // Previously only built for behavioral edits — now provides context-awareness for all edits
      let behaviorContext = '';
      const isAnyEditMode = isSurgicalEdit || isBehavioralEdit || !!currentCode;
      if (isAnyEditMode && vfsFiles && Object.keys(vfsFiles).length > 0) {
        try {
          const behaviorMap = buildComponentBehaviorMap(
            previewRef?.current ? { getIframe: previewRef.current.getIframe } as any : { getIframe: () => null } as any,
            vfsFiles,
          );
          behaviorContext = formatBehaviorMapForPrompt(behaviorMap);
          if (behaviorContext) {
            liveStep('analyzing', `🧠 Behavior map: ${behaviorMap.elements.length} interactive elements, ${Object.keys(behaviorMap.stateByFile).length} stateful files`);
          }
        } catch { /* behavior map is best-effort */ }
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
      // Use intelligent prompt for general requests; for surgical edits, still inject strict guard
      const promptForAI = isSurgicalEdit
        ? [
            '🚨 SURGICAL EDIT MODE — CHANGE ONLY THE TARGETED ELEMENT/COMPONENT 🚨',
            '',
            // Include structured analysis so the AI understands multi-sentence requests
            promptAnalysis.structuredDirective,
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
            // Inject constraints from prompt analysis
            ...promptAnalysis.constraints.map(c => {
              const prefix = c.type === 'preserve' ? '🔒 PRESERVE' : c.type === 'avoid' ? '🚫 AVOID' : c.type === 'require' ? '✅ REQUIRE' : '🎨 MATCH';
              return `${prefix}: ${c.description}`;
            }),
            themeContextBlock ? `\n${themeContextBlock}` : '',
          ].filter(Boolean).join('\n')
        : (() => {
            // Budget the prompt to stay within the 50k message content limit
            const MAX_PROMPT_CHARS = 40_000;
            let prompt = `${intelligentPrompt}${_fileContext}`;
            if (prompt.length + richContext.length <= MAX_PROMPT_CHARS) {
              prompt += richContext;
            } else {
              // Progressively trim context to fit
              const remaining = MAX_PROMPT_CHARS - prompt.length;
              if (remaining > 200) {
                prompt += richContext.slice(0, remaining);
              }
            }
            return prompt;
          })();

      // Derive templateAction from prompt analysis instead of regex
      const templateAction = (() => {
        switch (promptAnalysis.intent) {
          case 'full_generation': return 'full-control';
          case 'add_section': return 'add';
          case 'remove_section': return 'remove';
          case 'restyle': return 'restyle';
          case 'content_update':
          case 'surgical_edit':
          case 'fix_error':
          case 'wire_backend':
          case 'refactor':
            return 'modify';
          default:
            return currentCode ? 'modify' : undefined;
        }
      })();

      // ── Phase 3: AI Gateway Call ──
      advancePlanStep(taskPlan, 'analyze', 'done');
      advancePlanStep(taskPlan, 'locate', 'done');
      advancePlanStep(taskPlan, 'generate', 'running');
      liveStep('generating', 'Calling AI model...', gatewayConfig?.selectedModelId || 'auto-select');

      // Call AI service with retry logic — keep retries minimal to avoid long thinking loops
      const MAX_RETRIES = 1;
      let response = null;
      let lastError = null;
      
      // Global timeout: abort the entire request after 150s. Aligned with
      // server-side TOTAL_BUDGET_MS (135s) + buffer for network/packaging.
      const globalAbort = new AbortController();
      const globalTimeout = setTimeout(() => globalAbort.abort(), 150_000);
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (globalAbort.signal.aborted) {
          throw new Error('Request timed out. Please try a simpler prompt.');
        }
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
          const MAX_CODE_LENGTH = 120_000;
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

          // Build compact VFS files payload for ALL edit modes (not just surgical)
          // The edge function's contextCompactor handles budget/prioritization
          let vfsPayload: Record<string, string> | undefined;
          if (isReactProject && vfsFiles) {
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

          // Build lightweight preview DOM snapshot for AI context-awareness
          let previewSnapshot: string | undefined;
          try {
            const iframe = previewRef?.current?.getIframe?.();
            const doc = iframe?.contentDocument;
            if (doc?.body) {
              const route = iframe?.contentWindow?.location.hash || '/';
              const sections = Array.from(doc.querySelectorAll('section, header, nav, main, footer, [data-component]'))
                .map(el => {
                  const tag = el.tagName.toLowerCase();
                  const dc = el.getAttribute('data-component');
                  const text = (el as HTMLElement).innerText?.slice(0, 60)?.replace(/\n/g, ' ') || '';
                  return dc ? `<${tag} data-component="${dc}"> "${text}"` : `<${tag}> "${text}"`;
                }).slice(0, 15);
              previewSnapshot = `[Preview DOM] Route: ${route}\nVisible sections (${sections.length}):\n${sections.join('\n')}`;
            }
          } catch { /* best-effort */ }

          // ── Build conversation history for multi-turn awareness ──
          // Include up to 10 prior user/assistant exchanges (compact: only role + content, capped)
          const MAX_HISTORY_TURNS = 6;
          const MAX_HISTORY_CHAR_PER_MSG = 1500;
          const conversationHistory: Array<{ role: string; content: string }> = [];
          const priorMessages = messages.filter(m => 
            (m.role === 'user' || m.role === 'assistant') && 
            m.content && 
            m.content.trim().length > 0 &&
            !m.isStreaming
          );
          // Take last N messages (excluding the current user message which is already in promptForAI)
          const historySlice = priorMessages.slice(-MAX_HISTORY_TURNS);
          for (const m of historySlice) {
            // For assistant messages, strip thinking/reasoning artifacts and keep only the explanation
            const content = m.role === 'assistant'
              ? (m.content || '').slice(0, MAX_HISTORY_CHAR_PER_MSG)
              : (m.content || '').slice(0, MAX_HISTORY_CHAR_PER_MSG);
            if (content.trim()) {
              conversationHistory.push({ role: m.role, content });
            }
          }
          // Append the current user prompt as the final message
          conversationHistory.push({ role: 'user', content: promptForAI });

          response = await supabase.functions.invoke('ai-code-assistant', {
            body: {
              messages: conversationHistory,
              // Always use template-react for React projects (even surgical edits)
              // to ensure the AI generates React/TSX output, not raw HTML.
              // The surgicalEdit flag tells the edge function to apply surgical constraints.
              // Only fall back to 'code' mode for non-React (HTML template) surgical edits.
              mode: isSurgicalEdit && !isReactProject ? 'code' : 'template-react',
              currentCode: truncatedCode,
              editMode: !!currentCode,
              debugMode: isDebugMode,
              surgicalEdit: isSurgicalEdit,
              behavioralEdit: isBehavioralEdit,
              targetFile: resolvedTargetFile || undefined,
              componentBehaviorContext: behaviorContext || undefined,
              systemType,
              templateName,
              templateAction,
              userDesignProfile: userDesignProfile ?? undefined,
              systemsBuildContext: systemsBuildContext ?? undefined,
              siteElementsLibraryContext,
              attachments: _attachments.length > 0 ? _attachments : undefined,
              // Send VFS files for edit context (all edit types, not just surgical)
              vfsFiles: vfsPayload,
              // Preview DOM snapshot for live context awareness
              previewSnapshot,
              // Preview diagnostics for Lane B session memory
              previewDiagnostics: iframeErrors.length > 0
                ? iframeErrors.slice(0, 3).map(e => `${e.type}: ${e.message}${e.file ? ` (${e.file}:${e.line})` : ''}`).join('\n')
                : undefined,
              // Gateway options from user config
              gatewayOptions: gatewayConfig ? {
                selectedModelId: gatewayConfig.selectedModelId,
                reasoningEffort: gatewayConfig.reasoningEffort,
                timeoutMs: gatewayConfig.timeoutMs,
                autoModelSelection: gatewayConfig.autoModelSelection,
                maxTokens: gatewayConfig.maxTokens,
              } : undefined,
            },
          });
          
          // Check for retryable errors
          if (response.error) {
            // Extract the real error from the FunctionsHttpError context
            let bodyError = '';
            // First try response.data (sometimes populated even on error)
            if (response.data && typeof response.data === 'object' && 'error' in response.data) {
              bodyError = (response.data as { error?: string }).error || '';
            }
            // Then try reading the context (Response object) from FunctionsHttpError
            if (!bodyError && response.error) {
              try {
                const ctx = (response.error as any)?.context;
                if (ctx && typeof ctx?.json === 'function') {
                  const body = await ctx.json().catch(() => null);
                  if (body?.error) bodyError = body.error;
                  else if (body?.details) bodyError = `Validation: ${JSON.stringify(body.details)}`;
                } else if (ctx?.body && typeof ctx.body === 'string') {
                  const parsed = JSON.parse(ctx.body);
                  if (parsed?.error) bodyError = parsed.error;
                }
              } catch { /* swallow */ }
            }
            const errorMsg = bodyError || (response.error as Error).message || '';
            const statusCode = (response.error as any)?.status;
            console.warn(`[AIBuilderPanel] Edge function error (attempt ${attempt + 1}):`, errorMsg, 'status:', statusCode);
            
            const isRetryable = errorMsg.includes('non-2xx') || 
                               errorMsg.includes('timeout') ||
                               errorMsg.includes('temporarily unavailable') ||
                               errorMsg.includes('All AI providers failed') ||
                               statusCode === 503 ||
                               statusCode === 504;
            
            if (isRetryable && attempt < MAX_RETRIES) {
              lastError = new Error(bodyError || errorMsg || 'Edge function error');
              continue;
            }
            // Throw with the descriptive message
            throw new Error(bodyError || errorMsg || 'Edge function error');
          }
          
          // Success
          break;
        } catch (err) {
          lastError = err;
          if (attempt >= MAX_RETRIES) throw err;
        }
      }
      clearTimeout(globalTimeout);
      
      if (!response || response.error) {
        throw lastError || new Error('AI service failed after retries');
      }

      // ── Phase 4: Response Processing ──
      advancePlanStep(taskPlan, 'generate', 'done');
      advancePlanStep(taskPlan, 'patch', 'running');
      const modelUsed = response.data?.modelUsed || gatewayConfig?.selectedModelId || 'unknown';
      liveStep('validating', `Response received from ${modelUsed}`);

      // Extract AI reasoning (works for all models: thinking-tag extraction or native Anthropic blocks)
      const aiReasoning: string | undefined = response.data?.thinking || undefined;
      const responseMeta: Message['meta'] = {
        actionType: response.data?.actionType,
        modelUsed: response.data?.modelUsed,
        filesDetected: response.data?.filesDetected,
        warnings: response.data?.warnings,
        requiresApproval: response.data?.requiresApproval,
        removedFiles: response.data?.removedFiles,
        reviewSummary: response.data?.reviewSummary,
      };

      // The edge function returns { content, generatedImage?, imagePlacement? }
      const aiContent = response.data?.content || 'I processed your request but have no specific output to show.';
      
      // ── Phase 5: Code Extraction ──
      liveStep('validating', 'Extracting code from response...');
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
        liveStep('validating', `Multi-file output: ${Object.keys(multiFileOutput).length} files detected`, Object.keys(multiFileOutput).join(', '));
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

        // Check if approval is recommended before auto-applying
        const shouldBlock = responseMeta?.requiresApproval &&
          responseMeta.warnings?.some(w => w.severity === 'error');

        // Client-side scope enforcement for scoped edits
        const isScopedTask = isSurgicalEdit || isBehavioralEdit;
        const scopeBlockReason = isScopedTask ? getScopedEditAutoApplyBlockReason({
          files: normalizedFiles,
          resolvedTargetFile,
          existingFileKeys: vfsFiles ? Object.keys(vfsFiles) : [],
        }) : null;

        if (scopeBlockReason) {
          console.warn('[AIBuilderPanel] SCOPE BLOCK:', scopeBlockReason);
          toast.warning(`⚠️ Edit blocked: ${scopeBlockReason}`);
        } else if (shouldBlock) {
          console.warn('[AIBuilderPanel] Patch requires approval — NOT auto-applying');
          toast.warning('⚠️ AI patch flagged for review — check warnings before applying manually');
          // Store files for manual apply later (user can use View Edits)
        } else {
          if (onApplyToVFS) {
            console.log('[AIBuilderPanel] Calling onApplyToVFS with normalized paths:', Object.keys(normalizedFiles));
            vfsEventBus.emit('ai:apply:start', { source: 'multi-file' });
            onApplyToVFS(normalizedFiles, {
              prompt: userContent,
              model: modelUsed,
              summary: responseMeta?.reviewSummary,
              actionType: responseMeta?.actionType,
              origin: 'multi-file',
              requiresApproval: responseMeta?.requiresApproval,
              warnings: responseMeta?.warnings,
            });
            liveStep('complete', `✅ Applied ${Object.keys(normalizedFiles).length} files to project`);
            vfsEventBus.emit('ai:apply:complete', { filesWritten: Object.keys(normalizedFiles), source: 'multi-file' });
            const approvalNote = responseMeta?.requiresApproval ? ' (review recommended)' : '';
            toast.success(`✅ Multi-file project applied${approvalNote}`);
          } else if (onFilesPatch) {
            onFilesPatch(normalizedFiles);
            toast.success('✅ Multi-file project applied to VFS');
          } else {
            console.warn('[AIBuilderPanel] No VFS callback available for multi-file output!');
          }
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
      const singleFilePath = resolvedTargetFile || defaultTargetFile || '/src/App.tsx';

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

      // Mark all remaining plan steps as done
      advancePlanStep(taskPlan, 'patch', 'done');
      advancePlanStep(taskPlan, 'bind_intent', 'done');
      advancePlanStep(taskPlan, 'create_route', 'done');
      advancePlanStep(taskPlan, 'install_workflow', 'done');
      advancePlanStep(taskPlan, 'enable_capability', 'done');
      advancePlanStep(taskPlan, 'update_registry', 'done');
      advancePlanStep(taskPlan, 'refresh_preview', 'running');

      // Update message — show ONLY the explanation text, NOT raw code
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? {
              ...m,
              content: explanationText || aiContent,
              thinking: thinkingSteps,
              claudeReasoning: aiReasoning,
              meta: responseMeta,
              taskPlan: { ...taskPlan },
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
          // Check approval gate for single-file too
          const hasBlockingWarning = responseMeta?.requiresApproval &&
            responseMeta.warnings?.some(w => w.severity === 'error');

          if (hasBlockingWarning) {
            console.warn('[AIBuilderPanel] Single-file patch flagged — not auto-applying');
            toast.warning('⚠️ Patch flagged for review — check warnings');
          } else if (onApplyToVFS && !multiFileOutput) {
            console.log('[AIBuilderPanel] Auto-applying to VFS:', { targetPath: singleFilePath, codeLength: generatedCode.length });
            vfsEventBus.emit('ai:apply:start', { source: 'single-file' });
            onApplyToVFS({ [singleFilePath]: generatedCode }, {
              prompt: userContent,
              model: modelUsed,
              summary: responseMeta?.reviewSummary,
              actionType: responseMeta?.actionType,
              origin: 'single-file',
              requiresApproval: responseMeta?.requiresApproval,
              warnings: responseMeta?.warnings,
            });
            advancePlanStep(taskPlan, 'refresh_preview', 'done');
            advancePlanStep(taskPlan, 'validate', 'done');
            advancePlanStep(taskPlan, 'report', 'done');
            liveStep('complete', `✅ Applied to ${singleFilePath}`);
            vfsEventBus.emit('ai:apply:complete', { filesWritten: [singleFilePath], source: 'single-file' });
            const approvalNote = responseMeta?.requiresApproval ? ' — review recommended' : '';
            toast.success(isSurgicalEdit ? `✅ Edit applied${approvalNote}` : `✅ Code applied${approvalNote}`);
          } else if (onCodeGenerated) {
            onCodeGenerated(generatedCode);
            toast.success(isSurgicalEdit ? '✅ Edit applied to preview' : '✅ Code applied to preview');
          }

          // Notify about removed/blocked files from review
          if (responseMeta?.removedFiles && responseMeta.removedFiles.length > 0) {
            toast.info(`🛡️ ${responseMeta.removedFiles.length} file(s) blocked by safety review`);
          }
        }
      }

    } catch (error) {
      console.error('[AIBuilderPanel] Error:', error);
      
      // ── Robust error extraction ──
      // supabase.functions.invoke throws FunctionsHttpError whose `.context`
      // is the raw Response object. We need to read it properly.
      let errorMessage = 'Unknown error';

      // Helper: try to pull a message from a FunctionsHttpError context
      const extractFromContext = async (ctx: unknown): Promise<string | null> => {
        try {
          // ctx may be a Response object (has .json()) or a plain object with .body
          if (ctx && typeof ctx === 'object') {
            if (typeof (ctx as Response).json === 'function') {
              const body = await (ctx as Response).json();
              if (body?.error) return body.error;
              if (body?.details) return `Validation error: ${JSON.stringify(body.details)}`;
            } else if ('body' in ctx) {
              const raw = (ctx as { body?: string }).body;
              if (raw) {
                const parsed = JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
                if (parsed?.error) return parsed.error;
                if (parsed?.details) return `Validation error: ${JSON.stringify(parsed.details)}`;
              }
            }
          }
        } catch { /* swallow parse errors */ }
        return null;
      };

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Try to extract the real error from FunctionsHttpError context
        const ctx = (error as any)?.context;
        if (ctx) {
          const extracted = await extractFromContext(ctx);
          if (extracted) {
            errorMessage = extracted;
          }
        }

        // Classify known error patterns for user-friendly messages
        if (errorMessage.includes('All AI providers failed') || errorMessage.includes('All AI models failed')) {
          errorMessage = 'AI service unavailable — all models are busy. Please try again in a moment.';
        } else if (errorMessage.includes('Rate limit') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          errorMessage = 'Request timed out. Try a shorter or simpler prompt.';
        } else if (errorMessage.includes('Payment required') || errorMessage.includes('402')) {
          errorMessage = 'AI credits needed. Please check your subscription or API billing.';
        } else if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
          errorMessage = 'AI API key is invalid or expired. Please update your API key.';
        } else if (errorMessage.includes('not available') || errorMessage.includes('LOVABLE_API_KEY')) {
          errorMessage = 'AI service not configured. Please set your API key in project secrets.';
        } else if (errorMessage.includes('Invalid request body')) {
          errorMessage = 'Request was too large or malformed. Try a shorter prompt or fewer attached files.';
        } else if (errorMessage.includes('non-2xx status code') && !ctx) {
          // Fallback only if we couldn't extract a real message from context
          errorMessage = 'AI service returned an error. Try simplifying your request or try again in a moment.';
        }
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { message?: string; context?: unknown };
        errorMessage = err.message || 'Edge function error';
        if (err.context) {
          const extracted = await extractFromContext(err.context);
          if (extracted) errorMessage = extracted;
        }
      }
      
      const finalErrorContent = `Sorry, I encountered an error: ${errorMessage}. Please try again or simplify your request.`;

      setMessages(prev => {
        if (streamingId && prev.some(m => m.id === streamingId)) {
          const errorStep: ThinkingStep = {
            id: generateId(),
            type: 'error',
            message: 'Request failed',
            details: errorMessage,
            timestamp: new Date(),
          };

          return prev.map(m =>
            m.id === streamingId
              ? {
                  ...m,
                  content: finalErrorContent,
                  thinking: [...(m.thinking ?? []), errorStep],
                  isStreaming: false,
                }
              : m
          );
        }

        return [...prev, {
          id: generateId(),
          role: 'assistant',
          content: finalErrorContent,
          timestamp: new Date(),
        }];
      });
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
      // Build a compact VFS snapshot for debug context (max 5 files, truncated)
      const debugVfs: Record<string, string> = {};
      if (vfsFiles) {
        // Prioritize the error file if available
        const errorFile = error.file;
        const entries = Object.entries(vfsFiles);
        const prioritized = errorFile
          ? [
              ...entries.filter(([p]) => p.includes(errorFile)),
              ...entries.filter(([p]) => !p.includes(errorFile)),
            ]
          : entries;
        for (const [path, content] of prioritized.slice(0, 5)) {
          debugVfs[path] = content.slice(0, 20_000);
        }
      }

      const diagnostics = `${error.type}: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}${error.file ? `\nFile: ${error.file}:${error.line}:${error.column}` : ''}`;

      const hasVfsContext = Object.keys(debugVfs).length > 0;
      // Build conversation history for debug context too
      const debugHistory: Array<{ role: string; content: string }> = [];
      const recentMsgs = messages.filter(m => 
        (m.role === 'user' || m.role === 'assistant') && m.content?.trim() && !m.isStreaming
      ).slice(-6);
      for (const m of recentMsgs) {
        debugHistory.push({ role: m.role, content: (m.content || '').slice(0, 1500) });
      }
      debugHistory.push({ role: 'user', content: errorPrompt });

      const response = await supabase.functions.invoke('ai-code-assistant', {
        body: {
          messages: debugHistory,
          mode: 'code',
          currentCode: hasVfsContext ? undefined : currentCode,
          editMode: true,
          debugMode: true,
          systemType,
          templateName,
          systemsBuildContext: systemsBuildContext ?? undefined,
          previewDiagnostics: diagnostics,
          vfsFiles: Object.keys(debugVfs).length > 0 ? debugVfs : undefined,
          gatewayOptions: gatewayConfig ? {
            selectedModelId: gatewayConfig.selectedModelId,
            reasoningEffort: gatewayConfig.reasoningEffort,
            timeoutMs: gatewayConfig.timeoutMs,
            autoModelSelection: gatewayConfig.autoModelSelection,
            maxTokens: gatewayConfig.maxTokens,
          } : undefined,
        },
      });

      // Handle non-2xx: response.error is set by supabase-js
      if (response.error) {
        let errorMsg = 'AI service returned an error';
        const errBody = response.error;
        // Try reading FunctionsHttpError context (Response object)
        try {
          const ctx = (errBody as any)?.context;
          if (ctx && typeof ctx?.json === 'function') {
            const body = await ctx.json().catch(() => null);
            if (body?.error) errorMsg = body.error;
            else if (body?.message) errorMsg = body.message;
          } else if (ctx?.body && typeof ctx.body === 'string') {
            const parsed = JSON.parse(ctx.body);
            errorMsg = parsed.error || parsed.message || errorMsg;
          }
        } catch { /* swallow */ }
        // Fallback to .message
        if (errorMsg === 'AI service returned an error' && (errBody as Error)?.message) {
          const msg = (errBody as Error).message;
          if (msg.includes('non-2xx')) {
            errorMsg = 'AI service temporarily unavailable. Please try again.';
          } else {
            errorMsg = msg;
          }
        }
        throw new Error(errorMsg);
      }

      // Extract fix content — edge function returns in 'content' field (JSON or code)
      const rawContent = response.data?.content || response.data?.code || response.data?.response || '';
      
      // Extract metadata for debug fix too
      const debugMeta: Message['meta'] = {
        actionType: response.data?.actionType || 'debug',
        modelUsed: response.data?.modelUsed,
        filesDetected: response.data?.filesDetected,
        warnings: response.data?.warnings,
        requiresApproval: response.data?.requiresApproval,
        removedFiles: response.data?.removedFiles,
        reviewSummary: response.data?.reviewSummary,
      };

      // Try to extract code from the content (same strategies as main flow)
      let fixFiles: Record<string, string> | null = null;
      let fixCode: string | null = null;
      let fixExplanation = '';

      if (rawContent) {
        // Strategy 1: JSON multi-file output
        try {
          const jsonStr = rawContent.trim().replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
          const parsed = JSON.parse(jsonStr);
          if (parsed.files && typeof parsed.files === 'object') {
            fixFiles = parsed.files;
            fixExplanation = parsed.explanation || '✅ Debug fix applied.';
          }
        } catch { /* not JSON */ }

        // Strategy 2: Code fence extraction
        if (!fixFiles) {
          const fenceMatch = rawContent.match(/```(?:tsx|jsx|ts|js)?\s*\n([\s\S]*?)```/);
          if (fenceMatch) {
            fixCode = fenceMatch[1].trim();
            fixExplanation = rawContent.replace(/```[\s\S]*?```/g, '').trim() || '✅ Fix applied.';
          }
        }

        // Strategy 3: Direct code (starts with import/export)
        if (!fixFiles && !fixCode && /^(?:import |export )/.test(rawContent.trim())) {
          fixCode = rawContent.trim();
          fixExplanation = '✅ Fix applied.';
        }

        // Fallback: treat entire content as explanation
        if (!fixFiles && !fixCode) {
          fixExplanation = rawContent;
        }
      }

      // Auto-apply fix to VFS
      if (onApplyToVFS) {
        if (fixFiles) {
          const normalized: Record<string, string> = {};
          for (const [p, c] of Object.entries(fixFiles)) {
            normalized[p.startsWith('/') ? p : `/${p}`] = c;
          }
          vfsEventBus.emit('ai:apply:start', { source: 'debug-fix' });
          onApplyToVFS(normalized, {
            prompt: `Auto-fix: ${error.message || 'runtime error'}`,
            origin: 'debug-fix',
            summary: fixExplanation,
          });
          vfsEventBus.emit('ai:apply:complete', { filesWritten: Object.keys(normalized), source: 'debug-fix' });
          toast.success(`✅ Debug fix applied (${Object.keys(normalized).length} files)`);
        } else if (fixCode) {
          const targetPath = error.file
            ? (error.file.startsWith('/') ? error.file : `/${error.file}`)
            : (defaultTargetFile || '/src/App.tsx');
          vfsEventBus.emit('ai:apply:start', { source: 'debug-fix' });
          onApplyToVFS({ [targetPath]: fixCode }, {
            prompt: `Auto-fix: ${error.message || 'runtime error'}`,
            origin: 'debug-fix',
            summary: fixExplanation,
          });
          vfsEventBus.emit('ai:apply:complete', { filesWritten: [targetPath], source: 'debug-fix' });
          toast.success('✅ Debug fix applied');
        }
      }

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: fixExplanation || '✅ Fix applied! Check the preview for changes.',
        timestamp: new Date(),
        code: fixCode || undefined,
        error,
        meta: debugMeta,
        thinking: [
          { id: '1', type: 'analyzing', message: 'Analyzing error...', timestamp: new Date() },
          { id: '2', type: 'planning', message: 'Determining fix strategy...', timestamp: new Date() },
          { id: '3', type: 'generating', message: 'Generating fix...', timestamp: new Date() },
          { id: '4', type: 'validating', message: 'Validating solution...', timestamp: new Date() },
          { id: '5', type: 'complete', message: 'Fix ready', timestamp: new Date() },
        ],
      }]);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ Auto-fix failed: ${errMsg}\n\nTry describing the issue manually in the Code tab — include what you expected vs. what happened.`,
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


  // Whether to show conversational welcome (no real messages yet)
  const hasConversation = messages.some(m => m.role === 'user');

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r border-border",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card/50">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">AI Builder</h2>
          <p className="text-[11px] text-muted-foreground truncate">
            {templateName || 'New Project'}{systemType ? ` · ${systemType}` : ''}
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
            title="Close"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'debug')} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-2 rounded-none h-9 bg-card/30 border-b border-border px-1">
          <TabsTrigger
            value="code"
            className="text-xs gap-1.5 rounded-lg h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="debug"
            className="text-xs gap-1.5 rounded-lg h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            <Bug className="w-3.5 h-3.5" />
            Debug
            {iframeErrors.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center">
                {iframeErrors.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="code" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
          {/* Messages or Welcome */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="py-3 px-3">
              {!hasConversation ? (
                <AIConversationWelcome
                  onSelectPrompt={(prompt) => {
                    pendingPromptRef.current = prompt;
                    setInput(prompt);
                  }}
                  templateName={templateName}
                />
              ) : (
                messages.map((msg) => (
                  <AIConversationMessage
                    key={msg.id}
                    message={msg}
                    onViewEdits={handleViewEdits}
                    onRetryError={handleFixError}
                  />
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === 'user' && !messages.some(m => m.isStreaming) && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* AI Gateway Options */}
          <AIGatewayOptions
            config={gatewayConfig}
            onChange={setGatewayConfig}
            className="flex-shrink-0 border-t border-border"
          />

          {/* Input */}
          <AIConversationInput
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            droppedFiles={droppedFiles}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            previewRef={previewRef}
          />
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
          <DebugAgentPanel
            iframeErrors={iframeErrors}
            onFixError={handleFixError}
            onClearErrors={onClearErrors}
            onApplyPatch={onApplyToVFS}
            vfsFiles={vfsFiles}
            isFixing={isFixing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIBuilderPanel;
